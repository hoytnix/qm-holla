'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  Circle,
  FileText,
  Plus,
  Lock,
  ExternalLink,
  ChevronRight,
  Star,
  Square,
  Sparkles,
} from 'lucide-react';
import { ProjectRecord, TaskRecord, DocumentRecord, AgentRecord } from '@/lib/db/adapter';
import { GlassButton } from '@/components/ui/GlassButton';
import { AgentIcon } from '@/components/ui/AgentIcon';

interface ProjectWorkspaceDrawerProps {
  project: ProjectRecord | null;
  agent?: AgentRecord | null;
  tasks: TaskRecord[];
  documents: DocumentRecord[];
  isOpen: boolean;
  isExpanded: boolean;
  onClose: () => void;
  onToggleExpand: () => void;
  onBackToUniverse: () => void;
  onToggleTask: (taskId: string) => void;
  onOpenDocument: (doc: DocumentRecord) => void;
  onNewTask?: () => void;
  onNewDocument?: () => void;
}

export const ProjectWorkspaceDrawer: React.FC<ProjectWorkspaceDrawerProps> = ({
  project,
  agent,
  tasks,
  documents,
  isOpen,
  isExpanded,
  onClose,
  onToggleExpand,
  onBackToUniverse,
  onToggleTask,
  onOpenDocument,
  onNewTask,
  onNewDocument,
}) => {
  if (!isOpen || !project) return null;

  const completedCount = tasks.filter((t) => t.status === 'completed').length;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed bottom-0 inset-x-0 z-40 max-w-4xl mx-auto w-full bg-slate-950/95 border-t border-white/15 rounded-t-3xl shadow-2xl backdrop-blur-2xl p-5 sm:p-6 pb-safe text-slate-100 max-h-[85vh] overflow-y-auto"
      >
        {/* Top grab bar */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-4" />

        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              <span>Project</span>
              <span>·</span>
              <span>Workspace</span>
              {project.is_private ? (
                <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[9px]">
                  <Lock width={10} height={10} />
                  <span>Private</span>
                </span>
              ) : null}
            </div>

            <div className="flex items-center gap-3 mt-1.5">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 shadow">
                <AgentIcon agentId={project.agent_id} width={20} height={20} />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                  {project.title}
                </h2>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {project.description || 'Autonomous division project workspace.'}
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title="Close Drawer"
          >
            <X width={18} height={18} />
          </button>
        </div>

        {/* Action Bar: Dual Responsive Action Buttons */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <GlassButton
            onClick={onToggleExpand}
            variant={isExpanded ? 'secondary' : 'glow'}
            className="flex items-center justify-center gap-2 text-xs py-2.5 min-h-[44px]"
          >
            {isExpanded ? (
              <>
                <Minimize2 width={16} height={16} />
                <span>Collapse branch</span>
              </>
            ) : (
              <>
                <Maximize2 width={16} height={16} />
                <span>Expand branch</span>
              </>
            )}
          </GlassButton>

          <GlassButton
            onClick={onBackToUniverse}
            variant="secondary"
            className="flex items-center justify-center gap-2 text-xs py-2.5 min-h-[44px]"
          >
            <RotateCcw width={16} height={16} className="text-amber-400" />
            <span>Back to universe</span>
          </GlassButton>
        </div>

        {/* Progress & Task Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
          {/* Tasks Column */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Satellite Tasks
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono">
                  {completedCount}/{tasks.length}
                </span>
              </div>
              {onNewTask && (
                <button
                  onClick={onNewTask}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 min-h-[32px] px-2"
                >
                  <Plus width={14} height={14} />
                  <span>Add task</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No tasks assigned to this project yet.</p>
              ) : (
                tasks.map((task) => {
                  const isDone = task.status === 'completed';
                  return (
                    <div
                      key={task.id}
                      onClick={() => onToggleTask(task.id)}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                        isDone
                          ? 'bg-amber-950/20 border-amber-500/30 text-slate-300 line-through'
                          : 'bg-slate-950/60 border-white/5 text-slate-200 hover:border-white/20'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
                          isDone
                            ? 'bg-amber-500 border-amber-400 text-slate-950'
                            : 'border-white/30 bg-white/5'
                        }`}
                      >
                        {isDone ? <CheckCircle2 width={14} height={14} /> : null}
                      </div>
                      <span className="text-xs flex-1 line-clamp-1">{task.title}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Markdown Documents Column */}
          <div className="bg-slate-900/60 rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Knowledge Context ('K' Nodes)
              </span>
              {onNewDocument && (
                <button
                  onClick={onNewDocument}
                  className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 min-h-[32px] px-2"
                >
                  <Plus width={14} height={14} />
                  <span>Add note</span>
                </button>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {documents.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No documents linked to this project yet.</p>
              ) : (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => onOpenDocument(doc)}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-white/5 hover:border-teal-500/40 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-6 h-6 rounded-full bg-teal-600/30 border border-teal-400/50 flex items-center justify-center text-teal-300 text-[10px] font-bold font-mono shrink-0">
                        K
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs text-slate-200 font-medium group-hover:text-teal-300 block truncate">
                          {doc.title}
                        </span>
                      </div>
                    </div>
                    <ChevronRight width={14} height={14} className="text-slate-500 group-hover:text-teal-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

/**
 * Canvas Footer Legend (Persistent horizontal scroll legend)
 */
export const CanvasLegend: React.FC = () => {
  return (
    <div className="w-full overflow-x-auto py-2.5 px-4 bg-slate-950/80 border-t border-white/5 flex items-center justify-center">
      <div className="flex items-center gap-6 text-[11px] font-mono text-slate-400 whitespace-nowrap min-w-max">
        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-400">
            <Star width={9} height={9} />
          </div>
          <span>Star: Captain / CEO</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-cyan-500/20 border border-cyan-400 flex items-center justify-center text-cyan-400">
            <Circle width={8} height={8} />
          </div>
          <span>Circle: Crew Specialist</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rotate-45 rounded-sm bg-sky-500/20 border border-sky-400 flex items-center justify-center" />
          <span>Diamond: Project / Area</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-sm bg-amber-500/20 border border-amber-400 flex items-center justify-center text-amber-300">
            <Square width={8} height={8} />
          </div>
          <span>Checkbox: Subagent Run</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-3.5 h-3.5 rounded-full bg-teal-600 border border-teal-400 flex items-center justify-center text-[8px] font-bold text-white">
            K
          </div>
          <span>K: Knowledge Lore</span>
        </div>
      </div>
    </div>
  );
};
