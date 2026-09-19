'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, ProjectRecord, TaskRecord, DocumentRecord } from '@/lib/db/adapter';
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
import { subagentEngine, ExecutionEvent } from '@/lib/ai/subagent-engine';
import { useSettings } from '@/lib/settings/settings-context';
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
  Play,
  Zap,
} from 'lucide-react';

export default function CanvasPage() {
  const { config, themeConfig, hasSelectedTheme, themeVersion, activeCompanyId } = useSettings();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);

  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);
  const [selectedProject, setSelectedProject] = useState<ProjectRecord | null>(null);
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null);

  // Subagent execution state & live logs
  const [isExecutingTasks, setIsExecutingTasks] = useState(false);
  const [executionLogs, setExecutionLogs] = useState<ExecutionEvent[]>([]);

  // Drawers and modals state
  const [isWorkspaceDrawerOpen, setIsWorkspaceDrawerOpen] = useState(false);
  const [isMarkdownDrawerOpen, setIsMarkdownDrawerOpen] = useState(false);
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [isMorningPlanningOpen, setIsMorningPlanningOpen] = useState(false);
  const [isVoiceHelmOpen, setIsVoiceHelmOpen] = useState(false);

  const hasLoadedRef = React.useRef(false);

  // Subscribe to autonomous subagent engine events
  useEffect(() => {
    const unsubscribe = subagentEngine.subscribe(async (evt) => {
      setExecutionLogs((prev) => [evt, ...prev.slice(0, 19)]);
      if (evt.type === 'running') {
        setIsExecutingTasks(true);
        setTasks((prev) =>
          prev.map((t) => (t.id === evt.taskId ? { ...t, status: 'in_progress' } : t))
        );
      } else if (evt.type === 'completed' || evt.type === 'failed') {
        setIsExecutingTasks(subagentEngine.isBusy());
        // Reload tasks and documents to reflect latest SQLite state
        try {
          await db.init();
          const [freshTasks, freshDocs] = await Promise.all([
            db.getTasks(activeCompanyId || undefined),
            db.getAllDocuments ? db.getAllDocuments(activeCompanyId || undefined) : Promise.resolve([]),
          ]);
          if (freshTasks && freshTasks.length > 0) setTasks(freshTasks);
          if (freshDocs && freshDocs.length > 0) setDocuments(freshDocs);
        } catch (e) {
          console.warn('Failed to refresh data following subagent event:', e);
        }
      }
    });

    return () => unsubscribe();
  }, [activeCompanyId]);

  const loadFleetData = async () => {
    try {
      await db.init();
      const [agentList, projectList, taskList, docList] = await Promise.all([
        db.getAgents(),
        db.getProjects(activeCompanyId || undefined),
        db.getTasks(activeCompanyId || undefined),
        db.getAllDocuments ? db.getAllDocuments(activeCompanyId || undefined) : Promise.resolve([]),
      ]);

      if (agentList && agentList.length > 0) setAgents(agentList);
      if (projectList && projectList.length > 0) setProjects(projectList);
      if (taskList && taskList.length > 0) setTasks(taskList);
      if (docList && docList.length > 0) setDocuments(docList);

      if (agentList.length > 0) {
        setSelectedAgent((prev) => {
          // If no agent selected yet, or the previous selected agent is stale, pick the captain
          if (!prev) return agentList[0];
          // Refresh the selected agent's data from the new list (name/prompt may have changed)
          const refreshed = agentList.find((a) => a.id === prev.id);
          return refreshed || agentList[0];
        });
      }
    } catch (e) {
      console.error('Failed to load fleet data in canvas:', e);
    }
  };

  // Initial load on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadFleetData();
  }, []); // STRICTLY EMPTY ARRAY — mount-only

  // Reactive reload when theme changes or active company workspace switches
  useEffect(() => {
    if (!hasLoadedRef.current) return;
    loadFleetData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersion, activeCompanyId]);

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

      <main className="min-h-screen w-full flex-1 flex flex-col overflow-x-hidden pb-16">
        <CaptainsLog
          openCommitmentsCount={openCommitmentsCount}
          onOpenDailyBrief={() => setIsMorningPlanningOpen(true)}
        />

        <div className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 py-4 flex flex-col gap-6">
          {/* Header & Voice Action Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
                <span>{themeConfig.name} Radial Canvas</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5 max-w-xl">
                Orbiting {themeConfig.defaultGroup} specialists and leaf workspaces persisted in browser-secured local SQLite.
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
                <span>Speak with {themeConfig.leaderTitle}</span>
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
            <section className="lg:col-span-8 w-full relative h-[65vh] sm:h-[75vh] min-h-[420px] sm:min-h-[580px] rounded-2xl sm:rounded-3xl border border-white/10 overflow-hidden bg-[#020617]/60 shadow-2xl flex flex-col">
              <div className="flex-1 w-full h-full relative overflow-hidden">
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
                  onNewProject={(newProj) => {
                    setProjects((prev) => {
                      if (prev.some((p) => p.id === newProj.id)) return prev;
                      return [...prev, newProj];
                    });
                    setSelectedProject(newProj);
                  }}
                  onNewTask={(newTask) => {
                    setTasks((prev) => {
                      if (prev.some((t) => t.id === newTask.id)) return prev;
                      return [...prev, newTask];
                    });
                  }}
                  onNewDocument={(newDoc) => {
                    setDocuments((prev) => {
                      if (prev.some((d) => d.id === newDoc.id)) return prev;
                      return [...prev, newDoc];
                    });
                  }}
                />
              </div>

              {/* Persistent Canvas Legend Footer */}
              <CanvasLegend />
            </section>

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

            {/* Autonomous Subagent Execution Engine Panel */}
            <GlassCard className="p-5 border-amber-500/30 bg-slate-900/60 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center">
                    <Zap width={16} height={16} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Subagent Engine</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Paced at {config.requestsPerMinute || 4} RPM</p>
                  </div>
                </div>

                <GlassButton
                  onClick={async () => {
                    setIsExecutingTasks(true);
                    await subagentEngine.triggerAutonomousSweep(config);
                  }}
                  disabled={isExecutingTasks}
                  variant="primary"
                  className="text-[11px] py-1.5 px-3 bg-amber-600 hover:bg-amber-500 border-amber-400/40 text-white font-bold flex items-center gap-1.5"
                >
                  <Play width={12} height={12} className="fill-white" />
                  <span>{isExecutingTasks ? 'Processing Fleet...' : 'Sweep Fleet'}</span>
                </GlassButton>
              </div>

              {/* Execution Events Stream */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {executionLogs.length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    Subagents idle. Click 'Sweep Fleet' or open a project workspace to auto-run tasks.
                  </p>
                ) : (
                  executionLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2 rounded-lg bg-slate-950/70 border border-white/5 text-[11px] flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="font-bold text-amber-300">{log.agentName}</span>
                        <span className="text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-slate-300 line-clamp-2 leading-tight">{log.detail}</p>
                    </div>
                  ))
                )}
              </div>
            </GlassCard>

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
        onRunAutonomousTasks={(taskIds) => {
          subagentEngine.enqueueTasks(taskIds, config);
          setIsExecutingTasks(true);
        }}
        isExecutingTasks={isExecutingTasks}
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
