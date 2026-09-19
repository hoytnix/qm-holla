'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Lock,
  Check,
  BookOpen,
  FileText,
  Star,
  Circle,
  Square,
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import { AgentRecord, ProjectRecord, TaskRecord, DocumentRecord } from '@/lib/db/adapter';
import {
  DEFAULT_STRAW_HAT_AGENTS,
  DEFAULT_CREW,
  DEFAULT_PROJECTS,
  DEFAULT_PROJECT_NODES,
  DEFAULT_TASKS,
  DEFAULT_DOCUMENTS,
} from '@/lib/crew/default-crew';
import { getThemedAgents } from '@/lib/crew/theme-mapper';
import { useSettings } from '@/lib/settings/settings-context';
import { opfsAdapter } from '@/lib/db/opfs-adapter';
import { AgentIcon } from '@/components/ui/AgentIcon';

export { DEFAULT_STRAW_HAT_AGENTS, DEFAULT_PROJECT_NODES };

interface RadialGraphProps {
  agents?: AgentRecord[];
  projects?: ProjectRecord[];
  tasks?: TaskRecord[];
  documents?: DocumentRecord[];
  onSelectAgent: (agent: AgentRecord) => void;
  selectedAgentId?: string | null;
  selectedProjectId?: string | null;
  onSelectProject?: (project: ProjectRecord) => void;
  expandedProjectId?: string | null;
  onToggleExpandProject?: (projectId: string) => void;
  onToggleTask?: (taskId: string) => void;
  onOpenDocument?: (doc: DocumentRecord) => void;
  onNewProject?: (project: ProjectRecord) => void;
  onNewTask?: (task: TaskRecord) => void;
  onNewDocument?: (doc: DocumentRecord) => void;
}

// Level 1 Crew angles as mandated by specification:
// Robin: 90° (Top), Usopp: 30°, Sanji: 330°, Franky: 270° (Bottom), Nami: 210°, Chopper: 150°
const AGENT_ANGLE_MAP: Record<string, number> = {
  'scholar-robin': 90,
  'sniper-usopp': 30,
  'chef-sanji': 330,
  'shipwright-franky': 270,
  'navigator-nami': 210,
  'doctor-chopper': 150,
};

// Helper: Convert polar (radius, degrees) to Cartesian coords (SVG Y-down)
function polarToCartesian(radius: number, degrees: number) {
  const rad = (degrees * Math.PI) / 180;
  return {
    x: radius * Math.cos(rad),
    y: -radius * Math.sin(rad),
  };
}

export const RadialGraph: React.FC<RadialGraphProps> = ({
  agents: propAgents,
  projects: propProjects,
  tasks: propTasks,
  documents: propDocuments,
  onSelectAgent,
  selectedAgentId,
  selectedProjectId,
  onSelectProject,
  expandedProjectId,
  onToggleExpandProject,
  onToggleTask,
  onOpenDocument,
  onNewProject,
  onNewTask,
  onNewDocument,
}) => {
  // Quick Node Creation Modal State
  const [isCreatingNode, setIsCreatingNode] = useState(false);
  const [newNodeType, setNewNodeType] = useState<'project' | 'task' | 'document'>('project');
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeAgentId, setNewNodeAgentId] = useState('scholar-robin');
  const [newNodeProjectId, setNewNodeProjectId] = useState('');
  const [newNodeDescription, setNewNodeDescription] = useState('');
  const [isPersistingNode, setIsPersistingNode] = useState(false);

  // Use theme-aware agent fallback instead of hardcoded One Piece
  const { currentTheme, activeCompanyId, activeCompany, themeConfig } = useSettings();
  const themedFallbackAgents = getThemedAgents(currentTheme) || DEFAULT_CREW;

  // Initialize agents and projects state with theme-aware fallback for immediate non-blocking render
  const [agents, setAgents] = useState<AgentRecord[]>(
    propAgents && propAgents.length > 0 ? propAgents : themedFallbackAgents
  );
  const [projects, setProjects] = useState<ProjectRecord[]>(
    propProjects && propProjects.length > 0 ? propProjects : DEFAULT_PROJECTS
  );
  const [tasks, setTasks] = useState<TaskRecord[]>(
    propTasks && propTasks.length > 0 ? propTasks : DEFAULT_TASKS
  );
  const [documents, setDocuments] = useState<DocumentRecord[]>(
    propDocuments && propDocuments.length > 0 ? propDocuments : DEFAULT_DOCUMENTS
  );

  // Sync state if props update from parent
  useEffect(() => {
    if (propAgents && propAgents.length > 0) setAgents(propAgents);
  }, [propAgents]);
  useEffect(() => {
    if (propProjects && propProjects.length > 0) setProjects(propProjects);
  }, [propProjects]);
  useEffect(() => {
    if (propTasks && propTasks.length > 0) setTasks(propTasks);
  }, [propTasks]);
  useEffect(() => {
    if (propDocuments && propDocuments.length > 0) setDocuments(propDocuments);
  }, [propDocuments]);

  // Background DB initialization & non-intrusive badge state
  const [badgeState, setBadgeState] = useState<'hidden' | 'hydrating' | 'active' | 'faded'>('hidden');
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    let isMounted = true;
    let fadeTimer: any = null;

    // If loading/hydrating takes longer than 500ms, display subtle badge
    const badgeTimer = setTimeout(() => {
      if (isMounted) {
        setBadgeState((prev) => (prev === 'active' || prev === 'faded' ? prev : 'hydrating'));
      }
    }, 500);

    const hydrateFromDb = async () => {
      try {
        await opfsAdapter.init();
        if (!isMounted) return;

        const [liveAgents, liveProjects, liveTasks, liveDocs] = await Promise.all([
          opfsAdapter.getAgents(),
          opfsAdapter.getProjects(),
          opfsAdapter.getTasks(),
          opfsAdapter.getAllDocuments ? opfsAdapter.getAllDocuments() : Promise.resolve([]),
        ]);

        if (isMounted) {
          if (liveAgents && liveAgents.length > 0) {
            setAgents(liveAgents);
          }
          if (liveProjects && liveProjects.length > 0) {
            setProjects(liveProjects);
          }
          if (liveTasks && liveTasks.length > 0) {
            setTasks(liveTasks);
          }
          if (liveDocs && liveDocs.length > 0) {
            setDocuments(liveDocs);
          }

          setBadgeState('active');
          fadeTimer = setTimeout(() => {
            if (isMounted) {
              setBadgeState('faded');
            }
          }, 2000);
        }
      } catch (err) {
        console.warn('Background SQLite hydration warning:', err);
        if (isMounted) {
          setBadgeState('active');
          fadeTimer = setTimeout(() => {
            if (isMounted) {
              setBadgeState('faded');
            }
          }, 2000);
        }
      } finally {
        clearTimeout(badgeTimer);
      }
    };

    hydrateFromDb();

    return () => {
      isMounted = false;
      clearTimeout(badgeTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []); // STRICTLY EMPTY ARRAY

  // Canvas Transform State: pan (x, y) and zoom scale [0.5, 2.5]
  const [transform, setTransform] = useState<{ x: number; y: number; scale: number }>({
    x: 0,
    y: 0,
    scale: 1.0,
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const pointerMapRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialDistanceRef = useRef<number | null>(null);
  const initialScaleRef = useRef<number>(1.0);
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Effective data sets
  const effectiveAgents = agents.length > 0 ? agents : themedFallbackAgents;
  const effectiveProjects = projects.length > 0 ? projects : DEFAULT_PROJECTS;
  const effectiveTasks = tasks.length > 0 ? tasks : DEFAULT_TASKS;
  const effectiveDocs = documents.length > 0 ? documents : DEFAULT_DOCUMENTS;

  // Resolve captain / CEO agent from current profile or database records
  const existingCaptain = effectiveAgents.find((a) => !a.parent_agent_id) || effectiveAgents[0];

  // Derive CEO name from active profile owners / company profile, falling back to agent's name
  const profileCeoName = useMemo(() => {
    if (activeCompany?.owners && activeCompany.owners.trim()) {
      return activeCompany.owners.split(/[,&/]/)[0].trim();
    }
    return existingCaptain?.name ? existingCaptain.name.split(' ')[0] : (themeConfig.leaderTitle || 'CEO');
  }, [activeCompany?.owners, existingCaptain?.name, themeConfig.leaderTitle]);

  // Root / center node dynamically represents the current CEO of the active profile
  const rootNode = useMemo(() => {
    return {
      id: 'ceo-root',
      role: 'CEO',
      name: profileCeoName,
      title: `${themeConfig.leaderTitle} & CEO`,
      avatar: existingCaptain?.avatar_url || '/avatars/default.png',
      status: 'active',
      isAnchor: true,
    };
  }, [profileCeoName, themeConfig.leaderTitle, existingCaptain?.avatar_url]);

  const captain = useMemo<AgentRecord>(() => {
    return {
      id: existingCaptain?.id || 'captain-core',
      name: profileCeoName,
      role_title: existingCaptain?.role_title || `${themeConfig.leaderTitle}/CEO`,
      avatar_url: existingCaptain?.avatar_url || 'crown',
      system_prompt: existingCaptain?.system_prompt || `You are ${profileCeoName}, Leader and CEO of Quarkmeme.`,
      routing_description: existingCaptain?.routing_description || 'Handles top-level strategic queries and fleet leadership.',
      parent_agent_id: null,
    };
  }, [existingCaptain, profileCeoName, themeConfig.leaderTitle]);

  const specialistCrew = effectiveAgents.filter((a) => a.id !== (captain?.id || 'captain-core') && a.parent_agent_id !== null);

  // Hierarchy Radii
  const innerRadius = 180; // Level 1
  const outerRadius = 320; // Level 2

  // Center pan when a project is selected/expanded
  useEffect(() => {
    if (expandedProjectId) {
      const proj = effectiveProjects.find((p) => p.id === expandedProjectId);
      if (proj) {
        const angle = AGENT_ANGLE_MAP[proj.agent_id] ?? 90;
        const pt = polarToCartesian(outerRadius, angle);
        setTransform((prev) => ({
          ...prev,
          x: -pt.x * prev.scale * 0.65,
          y: -pt.y * prev.scale * 0.65,
          scale: Math.max(prev.scale, 1.1),
        }));
      }
    }
  }, [expandedProjectId, outerRadius, effectiveProjects]);

  // Pointer Handlers for continuous pan & multi-touch pinch zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only handle if clicking canvas container directly or SVG background
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointerMapRef.current.size === 1) {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
    } else if (pointerMapRef.current.size === 2) {
      // Start pinch zoom
      const pts = Array.from(pointerMapRef.current.values());
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialDistanceRef.current = dist;
      initialScaleRef.current = transform.scale;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointerMapRef.current.has(e.pointerId)) return;
    pointerMapRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointerMapRef.current.size === 1 && isDraggingRef.current) {
      const newX = e.clientX - dragStartRef.current.x;
      const newY = e.clientY - dragStartRef.current.y;
      setTransform((prev) => ({ ...prev, x: newX, y: newY }));
    } else if (pointerMapRef.current.size === 2 && initialDistanceRef.current) {
      const pts = Array.from(pointerMapRef.current.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = currentDist / initialDistanceRef.current;
      const newScale = Math.min(2.5, Math.max(0.5, initialScaleRef.current * ratio));
      setTransform((prev) => ({ ...prev, scale: newScale }));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    pointerMapRef.current.delete(e.pointerId);
    if (pointerMapRef.current.size < 2) {
      initialDistanceRef.current = null;
    }
    if (pointerMapRef.current.size === 0) {
      isDraggingRef.current = false;
    }
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, Math.max(0.5, prev.scale * zoomFactor)),
    }));
  };

  const handleCreateNode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNodeTitle.trim()) return;
    setIsPersistingNode(true);

    try {
      await opfsAdapter.init();

      if (newNodeType === 'project') {
        const newProj: ProjectRecord = {
          id: `proj-${Date.now().toString(36)}`,
          company_id: activeCompanyId || null,
          agent_id: newNodeAgentId,
          title: newNodeTitle.trim(),
          description: newNodeDescription.trim() || 'Dynamic radial project workspace',
          category: 'research',
          is_private: 0,
        };
        await opfsAdapter.saveProject(newProj);
        setProjects((prev) => [...prev, newProj]);
        onNewProject?.(newProj);
        onSelectProject?.(newProj);
        onToggleExpandProject?.(newProj.id);
      } else if (newNodeType === 'task') {
        const targetProjId = newNodeProjectId || effectiveProjects[0]?.id || 'proj-manifesto';
        const targetProj = effectiveProjects.find((p) => p.id === targetProjId);
        const assignedAgentId = targetProj ? targetProj.agent_id : newNodeAgentId;

        const newTask: TaskRecord = {
          id: `task-${Date.now().toString(36)}`,
          company_id: activeCompanyId || null,
          project_id: targetProjId,
          agent_id: assignedAgentId,
          title: newNodeTitle.trim(),
          status: 'pending',
          priority: 'medium',
        };
        await opfsAdapter.saveTask(newTask);
        setTasks((prev) => [...prev, newTask]);
        onNewTask?.(newTask);
      } else if (newNodeType === 'document') {
        const targetProjId = newNodeProjectId || effectiveProjects[0]?.id || 'proj-manifesto';
        const targetProj = effectiveProjects.find((p) => p.id === targetProjId);
        const assignedAgentId = targetProj ? targetProj.agent_id : newNodeAgentId;

        const newDoc: DocumentRecord = {
          id: `doc-${Date.now().toString(36)}`,
          company_id: activeCompanyId || null,
          project_id: targetProjId,
          agent_id: assignedAgentId,
          title: newNodeTitle.trim().endsWith('.md') ? newNodeTitle.trim() : `${newNodeTitle.trim()}.md`,
          content: `# ${newNodeTitle.trim()}\n\n${newNodeDescription.trim() || 'Knowledge context anchor linked to radial project.'}`,
          metadata: JSON.stringify({ tags: ['dynamic-node', 'radial-canvas'] }),
        };
        await opfsAdapter.saveDocument(newDoc);
        setDocuments((prev) => [newDoc, ...prev]);
        onNewDocument?.(newDoc);
      }

      // Reset form
      setNewNodeTitle('');
      setNewNodeDescription('');
      setIsCreatingNode(false);
    } catch (err) {
      console.error('Failed to persist dynamic radial node:', err);
    } finally {
      setIsPersistingNode(false);
    }
  };

  // Controls
  const zoomIn = () => setTransform((p) => ({ ...p, scale: Math.min(2.5, p.scale + 0.25) }));
  const zoomOut = () => setTransform((p) => ({ ...p, scale: Math.max(0.5, p.scale - 0.25) }));
  const resetTransform = () => setTransform({ x: 0, y: 0, scale: 1.0 });

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onWheel={handleWheel}
      className="relative w-full h-full min-h-[420px] sm:min-h-[580px] rounded-2xl sm:rounded-3xl bg-[#030712] border border-white/10 overflow-hidden select-none cursor-grab active:cursor-grabbing touch-none shadow-2xl"
    >
      {/* Subtle Background Radial Radar / Celestial Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)] pointer-events-none" />

      {/* Floating Exploration / Scroll Guidance Handle */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 pointer-events-none px-3 py-1 rounded-full bg-slate-900/80 border border-white/10 backdrop-blur-md text-[10px] sm:text-xs text-slate-400 font-medium tracking-wide shadow-lg flex items-center gap-1.5 whitespace-nowrap">
        <Sparkles width={12} height={12} className="text-amber-400 shrink-0" />
        <span>Drag to explore universe · Scroll down for logs</span>
      </div>

      {/* Subtle non-intrusive DB storage badge in top-right corner */}
      {badgeState === 'hydrating' && (
        <div className="absolute top-3 right-3 z-50 text-xs px-2 py-1 rounded bg-slate-800/80 text-slate-400 border border-white/5">
          DB Hydrating...
        </div>
      )}
      {badgeState === 'active' && (
        <div className="absolute top-3 right-3 z-50 text-xs px-2 py-1 rounded bg-slate-800/80 text-emerald-400 border border-white/5 transition-opacity duration-700">
          DB Active
        </div>
      )}

      {/* Floating Canvas Controls (Upper Right) */}
      <div className="absolute top-14 right-4 z-40 flex items-center gap-1.5 bg-slate-900/90 border border-white/10 backdrop-blur-xl p-1.5 rounded-2xl shadow-xl">
        <button
          onClick={zoomOut}
          title="Zoom Out"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ZoomOut width={18} height={18} />
        </button>
        <button
          onClick={resetTransform}
          title="Reset Zoom & Pan"
          className="px-2.5 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-xs font-mono text-cyan-300 hover:text-cyan-200 transition-all active:scale-95"
        >
          {Math.round(transform.scale * 100)}%
        </button>
        <button
          onClick={zoomIn}
          title="Zoom In"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all active:scale-95"
        >
          <ZoomIn width={18} height={18} />
        </button>
        <button
          onClick={resetTransform}
          title="Recenter Canvas"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-cyan-950/60 border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all active:scale-95"
        >
          <RotateCcw width={16} height={16} />
        </button>
      </div>

      {/* Transform Container (SVG & Nodes) */}
      <motion.div
        className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none"
        animate={{
          x: transform.x,
          y: transform.y,
          scale: transform.scale,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
      >
        <div className="relative w-[1000px] h-[1000px] flex items-center justify-center pointer-events-auto">
          {/* SVG Orbit Lines & Radar Rings */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none touch-none overflow-hidden"
            viewBox="-500 -500 1000 1000"
          >
            <defs>
              <radialGradient id="centerRadar" cx="0%" cy="0%" r="100%">
                <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.18" />
                <stop offset="50%" stopColor="#06B6D4" stopOpacity="0.08" />
                <stop offset="100%" stopColor="#030712" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Ambient radar wash */}
            <circle cx="0" cy="0" r="440" fill="url(#centerRadar)" />

            {/* Level 1 Orbit Ring (180px) */}
            <circle
              cx="0"
              cy="0"
              r={innerRadius}
              fill="none"
              stroke="rgba(6, 182, 212, 0.2)"
              strokeWidth="1.5"
              strokeDasharray="4 4"
            />

            {/* Level 2 Orbit Ring (320px) */}
            <circle
              cx="0"
              cy="0"
              r={outerRadius}
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="1.5"
              strokeDasharray="6 6"
            />

            {/* Crosshairs */}
            <line x1="0" y1="-480" x2="0" y2="480" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
            <line x1="-480" y1="0" x2="480" y2="0" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

            {/* Radial Connecting Rays */}
            {specialistCrew.map((agent) => {
              const angle = AGENT_ANGLE_MAP[agent.id] ?? 90;
              const innerPt = polarToCartesian(innerRadius, angle);
              const outerPt = polarToCartesian(outerRadius, angle);
              const isSelected = selectedAgentId === agent.id;
              const proj = effectiveProjects.find((p) => p.agent_id === agent.id);
              const isExpanded = proj && expandedProjectId === proj.id;

              return (
                <g key={`rays-${agent.id}`}>
                  {/* Ray to Specialist */}
                  <line
                    x1="0"
                    y1="0"
                    x2={innerPt.x}
                    y2={innerPt.y}
                    stroke={isSelected ? '#F59E0B' : 'rgba(6, 182, 212, 0.25)'}
                    strokeWidth={isSelected ? '2' : '1'}
                    strokeDasharray={isSelected ? undefined : '3 3'}
                  />

                  {/* Ray to Project Diamond */}
                  <line
                    x1={innerPt.x}
                    y1={innerPt.y}
                    x2={outerPt.x}
                    y2={outerPt.y}
                    stroke={isExpanded ? '#38BDF8' : 'rgba(255, 255, 255, 0.15)'}
                    strokeWidth={isExpanded ? '2.5' : '1'}
                    strokeDasharray={isExpanded ? '6 3' : '2 4'}
                    className={isExpanded ? 'animate-pulse' : ''}
                  />
                </g>
              );
            })}
          </svg>

          {/* LEVEL 0: Core Orchestrator Node (Luffy / Captain & CEO) at (0, 0) */}
          {captain && (
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onSelectAgent(captain)}
              className={`absolute z-30 flex flex-col items-center justify-center w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer transition-all duration-300 backdrop-blur-xl border ${
                selectedAgentId === captain.id
                  ? 'border-amber-400 bg-amber-950/50 shadow-[0_0_40px_rgba(245,158,11,0.45)] ring-2 ring-amber-400/40'
                  : 'border-amber-500/30 bg-slate-900/90 shadow-[0_0_30px_rgba(245,158,11,0.2)] hover:border-amber-400'
              }`}
              style={{
                left: '500px',
                top: '500px',
                transform: 'translate(-50%, -50%)',
              }}
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 mb-1 shadow-inner">
                <AgentIcon agentId={captain.id} role={captain.role_title} width={22} height={22} />
              </div>
              <span className="text-[11px] font-extrabold text-white tracking-wider uppercase text-center px-1 truncate max-w-[90px]">
                {rootNode.name}
              </span>
              <span className="text-[9px] text-amber-300/80 font-mono truncate max-w-[90px]">{rootNode.title}</span>
              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-slate-950 flex items-center justify-center animate-pulse" />
            </motion.div>
          )}

          {/* LEVEL 1: 6 Crew Specialist Nodes (Radius 180px) */}
          {specialistCrew.map((agent) => {
            const angle = AGENT_ANGLE_MAP[agent.id] ?? 90;
            const pt = polarToCartesian(innerRadius, angle);
            const isSelected = selectedAgentId === agent.id;

            return (
              <motion.div
                key={agent.id}
                whileHover={{ scale: 1.12 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onSelectAgent(agent)}
                className={`absolute z-30 flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-full cursor-pointer transition-all duration-200 backdrop-blur-md border ${
                  isSelected
                    ? 'border-cyan-400 bg-cyan-950/60 shadow-[0_0_30px_rgba(6,182,212,0.5)] ring-2 ring-cyan-400/40'
                    : 'border-white/20 bg-slate-900/90 hover:border-cyan-400/60 hover:bg-slate-800 shadow-lg'
                }`}
                style={{
                  left: `${500 + pt.x}px`,
                  top: `${500 + pt.y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
                title={`${agent.name} - ${agent.role_title}`}
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                  <AgentIcon agentId={agent.id} role={agent.role_title} width={18} height={18} />
                </div>
                <span className="text-[9px] font-bold text-white/95 truncate max-w-[58px] text-center mt-0.5">
                  {agent.name.split(' ')[0]}
                </span>
              </motion.div>
            );
          })}

          {/* LEVEL 2 & 3: Project Diamond Nodes (Radius 320px) & Unfurled Satellites */}
          {effectiveProjects.map((proj) => {
            const angle = AGENT_ANGLE_MAP[proj.agent_id] ?? 90;
            const pt = polarToCartesian(outerRadius, angle);
            const isExpanded = expandedProjectId === proj.id;
            const isSelected = selectedProjectId === proj.id;

            // Child tasks & documents for this project
            const projTasks = effectiveTasks.filter((t) => t.project_id === proj.id);
            const projDocs = effectiveDocs.filter((d) => d.project_id === proj.id);

            return (
              <React.Fragment key={proj.id}>
                {/* Level 2 Project Diamond Node */}
                <motion.div
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => {
                    onSelectProject?.(proj);
                    onToggleExpandProject?.(proj.id);
                  }}
                  className={`absolute z-20 w-12 h-12 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-300 border backdrop-blur-xl ${
                    isExpanded || isSelected
                      ? 'border-amber-400 bg-amber-950/70 shadow-[0_0_35px_rgba(245,158,11,0.5)] rotate-45'
                      : 'border-sky-400/40 bg-slate-900/90 hover:border-sky-300 shadow-md rotate-45'
                  }`}
                  style={{
                    left: `${500 + pt.x}px`,
                    top: `${500 + pt.y}px`,
                    transform: 'translate(-50%, -50%) rotate(45deg)',
                  }}
                  title={proj.title}
                >
                  <div className="-rotate-45 flex flex-col items-center justify-center">
                    <AgentIcon agentId={proj.agent_id} width={16} height={16} className="text-amber-300" />
                  </div>

                  {proj.is_private ? (
                    <div
                      className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-rose-500/90 border border-rose-300 flex items-center justify-center -rotate-45"
                      title="PRIVATE Project"
                    >
                      <Lock width={9} height={9} className="text-white" />
                    </div>
                  ) : null}
                </motion.div>

                {/* Project Title Label */}
                <div
                  className="absolute z-20 pointer-events-none text-center max-w-[110px]"
                  style={{
                    left: `${500 + pt.x}px`,
                    top: `${500 + pt.y + 36}px`,
                    transform: 'translate(-50%, 0)',
                  }}
                >
                  <span className="text-[9px] font-semibold text-slate-300 line-clamp-1 bg-slate-950/80 px-1.5 py-0.5 rounded border border-white/5 shadow">
                    {proj.title}
                  </span>
                </div>

                {/* LEVEL 3: Unfurled Satellite Nodes (Tasks & Knowledge Anchors) */}
                <AnimatePresence>
                  {isExpanded && (
                    <>
                      {/* Satellite Tasks: Square Checkboxes */}
                      {projTasks.map((task, idx) => {
                        // Position around the diamond node
                        const offsetAngle = angle - 24 + idx * 24;
                        const satDist = 80;
                        const satRad = (offsetAngle * Math.PI) / 180;
                        const satX = pt.x + satDist * Math.cos(satRad);
                        const satY = pt.y - satDist * Math.sin(satRad);
                        const isCompleted = task.status === 'completed';

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.25, delay: idx * 0.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleTask?.(task.id);
                            }}
                            className={`absolute z-30 size-6 sm:size-7 rounded-lg flex items-center justify-center cursor-pointer transition-all shadow-md border ${
                              isCompleted
                                ? 'bg-amber-500 border-amber-400 text-slate-950'
                                : 'bg-[#FDFBF7] border-amber-900/50 text-slate-900 hover:scale-110'
                            }`}
                            style={{
                              left: `${500 + satX}px`,
                              top: `${500 + satY}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            title={`Task: ${task.title} (${task.status})`}
                          >
                            {isCompleted ? (
                              <Check width={14} height={14} strokeWidth={3} />
                            ) : (
                              <Square width={12} height={12} className="opacity-40" />
                            )}
                          </motion.div>
                        );
                      })}

                      {/* Knowledge Context Anchors: Teal Circular 'K' Badges */}
                      {projDocs.map((doc, idx) => {
                        const offsetAngle = angle + 40 + idx * 24;
                        const satDist = 85;
                        const satRad = (offsetAngle * Math.PI) / 180;
                        const satX = pt.x + satDist * Math.cos(satRad);
                        const satY = pt.y - satDist * Math.sin(satRad);

                        return (
                          <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0 }}
                            transition={{ duration: 0.25, delay: 0.1 + idx * 0.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onOpenDocument?.(doc);
                            }}
                            className="absolute z-30 w-7 h-7 rounded-full bg-teal-600 border border-teal-300 text-white font-mono font-black text-xs flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 active:scale-95 hover:bg-teal-500"
                            style={{
                              left: `${500 + satX}px`,
                              top: `${500 + satY}px`,
                              transform: 'translate(-50%, -50%)',
                            }}
                            title={`Knowledge Lore: ${doc.title}`}
                          >
                            K
                          </motion.div>
                        );
                      })}
                    </>
                  )}
                </AnimatePresence>
              </React.Fragment>
            );
          })}
        </div>
      </motion.div>

      {/* Quick Interactive Node Creation Modal */}
      <AnimatePresence>
        {isCreatingNode && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 10 }}
              className="w-full max-w-md bg-slate-900/95 border border-amber-500/30 rounded-2xl shadow-2xl p-6 text-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
                    <Plus width={18} height={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Add Dynamic Node to Canvas</h3>
                    <p className="text-[11px] text-slate-400">Persists directly to browser OPFS SQLite</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreatingNode(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  <X width={16} height={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNode} className="space-y-4">
                {/* Node Type Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Node Hierarchy Level
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewNodeType('project')}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                        newNodeType === 'project'
                          ? 'bg-amber-500/20 border-amber-500/60 text-amber-300 font-bold'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Diamond (Project)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNodeType('task')}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                        newNodeType === 'task'
                          ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300 font-bold'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Square (Task)
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewNodeType('document')}
                      className={`p-2 rounded-xl border text-xs font-medium text-center transition-all ${
                        newNodeType === 'document'
                          ? 'bg-teal-500/20 border-teal-500/60 text-teal-300 font-bold'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:bg-slate-800'
                      }`}
                    >
                      Circle ('K' Lore)
                    </button>
                  </div>
                </div>

                {/* Target Specialist or Parent Project */}
                {newNodeType === 'project' ? (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Assigned Division Specialist
                    </label>
                    <select
                      value={newNodeAgentId}
                      onChange={(e) => setNewNodeAgentId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {specialistCrew.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role_title})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Parent Project Diamond
                    </label>
                    <select
                      value={newNodeProjectId || effectiveProjects[0]?.id || ''}
                      onChange={(e) => setNewNodeProjectId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {effectiveProjects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Title */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Node Title
                  </label>
                  <input
                    type="text"
                    required
                    value={newNodeTitle}
                    onChange={(e) => setNewNodeTitle(e.target.value)}
                    placeholder={
                      newNodeType === 'project'
                        ? 'e.g. Archeological Stone Translation'
                        : newNodeType === 'task'
                        ? 'e.g. Audit cryptographic cipher signatures'
                        : 'e.g. Grand Line Astrolabe Log'
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                  />
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Description / Content Excerpt
                  </label>
                  <textarea
                    rows={3}
                    value={newNodeDescription}
                    onChange={(e) => setNewNodeDescription(e.target.value)}
                    placeholder="Provide node lore, deliverables, or mission directives..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 leading-relaxed font-mono"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsCreatingNode(false)}
                    className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPersistingNode || !newNodeTitle.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-lg shadow-amber-600/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Plus width={14} height={14} />
                    <span>{isPersistingNode ? 'Persisting...' : 'Persist Node'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
