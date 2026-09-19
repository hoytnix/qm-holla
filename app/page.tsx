'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, ProjectRecord, TaskRecord, DocumentRecord } from '@/lib/db/adapter';
import {
  DEFAULT_CREW,
  DEFAULT_PROJECTS,
  DEFAULT_TASKS,
  DEFAULT_DOCUMENTS,
} from '@/lib/crew/default-crew';
import { RadialGraph } from '@/components/canvas/RadialGraph';
import { ProjectWorkspaceDrawer, CanvasLegend } from '@/components/canvas/ProjectWorkspaceDrawer';
import { MarkdownDrawer } from '@/components/vault/MarkdownDrawer';
import { CaptainsLog } from '@/components/dashboard/CaptainsLog';
import { MorningPlanningModal } from '@/components/planning/MorningPlanningModal';
import { VoiceHelmSheet } from '@/components/voice/VoiceHelmSheet';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Navbar } from '@/components/layout/Navbar';
import { AgentIcon } from '@/components/ui/AgentIcon';
import {
  Compass,
  MessageSquare,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Mic,
  Maximize2,
} from 'lucide-react';

export default function CanvasPage() {
  const [agents, setAgents] = useState<AgentRecord[]>(DEFAULT_CREW);
  const [projects, setProjects] = useState<ProjectRecord[]>(DEFAULT_PROJECTS);
  const [tasks, setTasks] = useState<TaskRecord[]>(DEFAULT_TASKS);
  const [documents, setDocuments] = useState<DocumentRecord[]>(DEFAULT_DOCUMENTS);

  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(DEFAULT_CREW[0]);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Drawers and modals state
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [isMarkdownDrawerOpen, setIsMarkdownDrawerOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [isMorningPlanningOpen, setIsMorningPlanningOpen] = useState(false);
  const [isVoiceHelmOpen, setIsVoiceHelmOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const loadFleetData = async () => {
    try {
      await db.init();
      const [agentList, projectList, taskList, docList] = await Promise.all([
        db.getAgents(),
        db.getProjects(),
        db.getTasks(),
        db.getAllDocuments ? db.getAllDocuments() : Promise.resolve([]),
      ]);

      setAgents(agentList);
      setProjects(projectList);
      setTasks(taskList);
      setDocuments(docList);

      if (agentList.length > 0 && !selectedAgent) {
        setSelectedAgent(agentList[0]);
      }
    } catch (e) {
      console.error('Failed to load fleet data in canvas:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFleetData();
  }, []);

  // Handle project diamond selection from RadialGraph
  const handleSelectProject = (proj: ProjectRecord) => {
    setSelectedProject(proj);
    setIsWorkspaceDrawerOpen(true);
    // Also select the assigned specialist agent
    const assigned = agents.find((a) => a.id === proj.agent_id);
    if (assigned) {
      setSelectedAgent(assigned);
    }
  };

  const handleToggleExpandProject = (projId: string) => {
    setExpandedProjectId((prev) => (prev === projId ? null : projId));
  };

  const handleBackToUniverse = () => {
    setExpandedProjectId(null);
    setIsWorkspaceDrawerOpen(false);
    setSelectedProject(null);
    const captain = agents.find((a) => !a.parent_agent_id) || agents[0];
    if (captain) {
      setSelectedAgent(captain);
    }
  };

  const handleToggleTask = async (taskId: string) => {
    try {
      const updated = await db.toggleTaskStatus(taskId);
      if (updated) {
        setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      }
    } catch (err) {
      console.error('Failed to toggle task status:', err);
    }
  };

  const handleOpenDocument = (doc: DocumentRecord) => {
    setActiveDocument(doc);
    setIsMarkdownDrawerOpen(true);
  };

  const handleSaveDocument = async (doc: DocumentRecord) => {
    try {
      await db.saveDocument(doc);
      setDocuments((prev) => {
        const idx = prev.findIndex((d) => d.id === doc.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = doc;
          return next;
        }
        return [doc, ...prev];
      });
    } catch (err) {
      console.error('Failed to save document:', err);
    }
  };

  const handleAddTaskToProject = async (title: string) => {
    if (!selectedProject) return;
    const newTask: TaskRecord = {
      id: `task-${Date.now().toString(36)}`,
      project_id: selectedProject.id,
      agent_id: selectedProject.agent_id,
      title,
      status: 'pending',
      priority: 'medium',
    };
    await db.saveTask(newTask);
    setTasks((prev) => [newTask, ...prev]);
  };

  const openCommitmentsCount = tasks.filter((t) => t.status !== 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 selection:bg-amber-500/30 overflow-x-hidden">
      <Navbar onOpenMorningPlanning={() => setIsMorningPlanningOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        {/* Phase 3.2: Captain's Log Hero Dashboard */}
        <CaptainsLog
          openCommitmentsCount={openCommitmentsCount}
          onOpenDailyBrief={() => setIsMorningPlanningOpen(true)}
        />

        {/* Header & Voice Action Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>Grand Line Radial Canvas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-xl">
              Orbiting division specialists and leaf workspaces persisted in browser-secured OPFS SQLite.
            </p>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Phase 5 Voice Helm Button */}
            <button
              onClick={() => setIsVoiceHelmOpen(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition-all active:scale-95 min-h-[44px]"
            >
              <Mic width={16} height={16} />
              <span>Speak with Luffy</span>
            </button>

            <Link href="/chat" className="flex-1 sm:flex-initial">
              <GlassButton variant="secondary" className="w-full flex items-center justify-center gap-2 text-xs min-h-[44px]">
                <MessageSquare width={16} height={16} />
                <span>Helm Chat</span>
              </GlassButton>
            </Link>
          </div>
        </div>

        {/* Canvas & Inspection Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 flex-1 items-start">
          {/* Central Interactive Radial Graph Viewport */}
          <div className="lg:col-span-8 flex flex-col rounded-3xl border border-white/10 bg-slate-950/60 relative overflow-hidden shadow-2xl">
            <RadialGraph
              agents={agents}
              projects={projects}
              tasks={tasks}
              documents={documents}
              onSelectAgent={(agent) => {
                setSelectedAgent(agent);
                const proj = projects.find((p) => p.agent_id === agent.id);
                if (proj) {
                  setSelectedProject(proj);
                }
              }}
              selectedAgentId={selectedAgent?.id}
              selectedProjectId={selectedProject?.id}
              onSelectProject={handleSelectProject}
              expandedProjectId={expandedProjectId}
              onToggleExpandProject={handleToggleExpandProject}
              onToggleTask={handleToggleTask}
              onOpenDocument={handleOpenDocument}
            />

            {/* Persistent Canvas Legend Footer */}
            <CanvasLegend />
          </div>

          {/* Inspector Panel for Selected Agent / Division */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {selectedAgent ? (
              <GlassCard className="p-6 border-amber-500/30 bg-slate-900/70 shadow-xl">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
                      <AgentIcon
                        agentId={selectedAgent.id}
                        role={selectedAgent.role_title}
                        width={22}
                        height={22}
                      />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-white">{selectedAgent.name}</h2>
                      <p className="text-xs text-amber-300/90 font-medium">
                        {selectedAgent.role_title}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border shrink-0 ${
                      !selectedAgent.parent_agent_id
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {!selectedAgent.parent_agent_id ? 'Core Helm' : 'Specialist'}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Routing Intent Scope
                    </span>
                    <p className="text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {selectedAgent.routing_description || 'General queries & fleet routing.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Autonomous Directives
                    </span>
                    <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 max-h-36 overflow-y-auto font-mono text-[11px] leading-relaxed">
                      {selectedAgent.system_prompt}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link href={`/chat?agent=${selectedAgent.id}`} className="w-full">
                      <GlassButton variant="primary" className="w-full flex items-center justify-center gap-2 min-h-[44px]">
                        <MessageSquare width={16} height={16} />
                        <span>Dispatch to {selectedAgent.name.split(' ')[0]}</span>
                        <ArrowRight width={14} height={14} className="ml-1" />
                      </GlassButton>
                    </Link>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6 text-center text-slate-400 text-xs">
                Select any crew specialist or project diamond to inspect directives.
              </GlassCard>
            )}

            {/* Local-First Architecture Specifications */}
            <GlassCard className="p-5 border-white/10 bg-slate-900/40">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold uppercase tracking-wider mb-3">
                <Cpu width={16} height={16} className="text-amber-400" />
                <span>Engine Specifications</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Database Storage</span>
                  <span className="font-mono font-medium text-emerald-400">OPFS /quarkmeme.db</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Search Index</span>
                  <span className="font-mono font-medium text-sky-400">SQLite FTS5 BM25</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Execution Mode</span>
                  <span className="font-mono font-medium text-amber-400">Local-First PWA</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Cloud Database Bill</span>
                  <span className="font-mono font-medium text-purple-400">$0.00 / Zero Lock-in</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>

      {/* Phase 1.3: Project Workspace Bottom Drawer */}
      <ProjectWorkspaceDrawer
        project={selectedProject}
        agent={agents.find((a) => a.id === selectedProject?.agent_id)}
        tasks={tasks.filter((t) => t.project_id === selectedProject?.id)}
        documents={documents.filter((d) => d.project_id === selectedProject?.id)}
        isOpen={isWorkspaceDrawerOpen}
        isExpanded={expandedProjectId === selectedProject?.id}
        onClose={() => setIsWorkspaceDrawerOpen(false)}
        onToggleExpand={() => {
          if (selectedProject) {
            handleToggleExpandProject(selectedProject.id);
          }
        }}
        onBackToUniverse={handleBackToUniverse}
        onToggleTask={handleToggleTask}
        onOpenDocument={handleOpenDocument}
        onNewTask={() => {
          const title = prompt('Enter new task name:');
          if (title && title.trim()) {
            handleAddTaskToProject(title.trim());
          }
        }}
        onNewDocument={() => {
          setActiveDocument(null);
          setIsMarkdownDrawerOpen(true);
        }}
      />

      {/* Phase 2.3: Mobile Markdown Inspection & Creation Drawer */}
      <MarkdownDrawer
        isOpen={isMarkdownDrawerOpen}
        document={activeDocument}
        projectId={selectedProject?.id}
        agentId={selectedProject?.agent_id}
        onClose={() => {
          setIsMarkdownDrawerOpen(false);
          setActiveDocument(null);
        }}
        onSaveDocument={handleSaveDocument}
        onAddTask={handleAddTaskToProject}
      />

      {/* Phase 3.1: 6:00 AM Morning Planning Ritual Modal */}
      <MorningPlanningModal
        isOpen={isMorningPlanningOpen}
        onClose={() => setIsMorningPlanningOpen(false)}
      />

      {/* Phase 5.2: Voice Helm ("Speak with Luffy") Sheet */}
      <VoiceHelmSheet
        isOpen={isVoiceHelmOpen}
        onClose={() => setIsVoiceHelmOpen(false)}
        onDispatchMessage={async (msg) => {
          // Send message to captain and get response
          const captain = agents.find((a) => !a.parent_agent_id) || agents[0];
          return `Aye aye! I received your order: "${msg}". Franky, Robin, and the crew are already setting the course!`;
        }}
      />
    </div>
  );
}
