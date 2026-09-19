'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sun,
  Crown,
  CheckCircle2,
  Clock,
  ArrowRight,
  Copy,
  Check,
  Calendar,
  Sparkles,
  Layers,
} from 'lucide-react';
import { db } from '@/lib/db/opfs-adapter';
import { TaskRecord, AgentRecord, ProjectRecord } from '@/lib/db/adapter';
import { GlassButton } from '@/components/ui/GlassButton';
import { AgentIcon } from '@/components/ui/AgentIcon';

interface MorningPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMarkReviewed?: () => void;
}

export const MorningPlanningModal: React.FC<MorningPlanningModalProps> = ({
  isOpen,
  onClose,
  onMarkReviewed,
}) => {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    async function loadData() {
      setLoading(true);
      try {
        await db.init();
        const [taskList, agentList, projectList] = await Promise.all([
          db.getTasks(),
          db.getAgents(),
          db.getProjects ? db.getProjects() : Promise.resolve([]),
        ]);
        setTasks(taskList);
        setAgents(agentList);
        setProjects(projectList);
      } catch (err) {
        console.error('Failed to load morning planning data:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isOpen]);

  if (!isOpen) return null;

  const completedRecent = tasks.filter((t) => t.status === 'completed');
  const pendingCommitments = tasks.filter((t) => t.status !== 'completed');
  const highPriorityPending = pendingCommitments.filter((t) => t.priority === 'high');

  // Generate formatted markdown brief for export
  const generateMarkdownBrief = () => {
    return `# 6:00 AM Morning Standup Brief - Captain Luffy
**Date:** ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
**Status:** Fleet Active · Zero Cloud Bills · OPFS SQLite Persisted

## 1. Yesterday's Fleet Wins
${
  completedRecent.length > 0
    ? completedRecent.map((t) => `- [x] **${t.agent_id.replace('scholar-', '').replace('shipwright-', '')}**: ${t.title}`).join('\n')
    : '- All divisions reported ready.'
}

## 2. Top 3 Strategic Objectives for Today
${
  highPriorityPending.slice(0, 3).map((t, idx) => `${idx + 1}. **${t.title}** (Assigned: ${t.agent_id})`).join('\n') ||
  '1. Advance local-first storage architecture\n2. Maintain zero-cloud sovereignty\n3. Execute division commitments'
}

## 3. Active Commitments Count
- Total Pending Commitments: ${pendingCommitments.length}
- One Captain. Six Specialists. Ready to sail.
`;
  };

  const handleCopy = () => {
    const text = generateMarkdownBrief();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl bg-[#0B1329] border border-amber-500/30 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 relative my-8"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-400 shadow-inner">
                <Sun width={24} height={24} className="text-amber-400 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold tracking-widest text-amber-400 uppercase">
                    Daily Standup
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                    6:00 AM Ritual
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                  Captain's Morning Brief
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            >
              <X width={18} height={18} />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <span className="text-xs font-mono">Querying OPFS SQLite Fleet Ledgers...</span>
            </div>
          ) : (
            <div className="space-y-6 py-5 max-h-[60vh] overflow-y-auto pr-1">
              {/* Captain's Announcement Banner */}
              <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0 mt-0.5">
                  <Crown width={18} height={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-amber-200">
                    "Big dreams. Clear course. Let's set sail!"
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    You have <span className="text-amber-300 font-bold">{pendingCommitments.length} open commitments</span> across 6 divisions. Yesterday your crew completed <span className="text-emerald-400 font-bold">{completedRecent.length} runs</span>.
                  </p>
                </div>
              </div>

              {/* Section 1: Yesterday's Wins */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 width={14} height={14} className="text-emerald-400" />
                    <span>Recent Wins & Completed Runs</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Past 24 Hours</span>
                </div>

                <div className="space-y-2">
                  {completedRecent.length === 0 ? (
                    <p className="text-xs text-slate-500 italic p-3 rounded-xl bg-slate-900/40 border border-white/5">
                      No completed runs logged in the past 24 hours.
                    </p>
                  ) : (
                    completedRecent.slice(0, 4).map((task) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/50 border border-white/5"
                      >
                        <AgentIcon agentId={task.agent_id} width={16} height={16} className="text-cyan-400 shrink-0" />
                        <span className="text-xs text-slate-200 flex-1">{task.title}</span>
                        <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Complete
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Section 2: Top 3 Highest Priority Goals */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock width={14} height={14} className="text-amber-400" />
                    <span>Today's Top Objectives</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">High Priority</span>
                </div>

                <div className="space-y-2">
                  {(highPriorityPending.length > 0 ? highPriorityPending : pendingCommitments)
                    .slice(0, 3)
                    .map((task, idx) => (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-slate-900/70 border border-amber-500/20 hover:border-amber-400/40 transition-colors"
                      >
                        <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-mono text-[11px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-medium text-white block truncate">
                            {task.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Assigned to: {task.agent_id}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
            <button
              onClick={handleCopy}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-slate-300 hover:text-white border border-white/10 transition-all min-h-[44px]"
            >
              {copied ? (
                <>
                  <Check width={14} height={14} className="text-emerald-400" />
                  <span className="text-emerald-400 font-medium">Brief Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy width={14} height={14} />
                  <span>Export Standup Brief</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <GlassButton
                variant="primary"
                onClick={() => {
                  onMarkReviewed?.();
                  onClose();
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs min-h-[44px]"
              >
                <span>Set Course for Today</span>
                <ArrowRight width={14} height={14} />
              </GlassButton>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
