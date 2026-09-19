'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Plus,
  FileText,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { DocumentRecord, KbRecord, AgentRecord } from '@/lib/db/adapter';
import { NotionRichEditor } from './NotionRichEditor';

interface MarkdownDrawerProps {
  isOpen: boolean;
  document: DocumentRecord | null;
  projectId?: string | null;
  agentId?: string | null;
  kbs?: KbRecord[];
  agents?: AgentRecord[];
  onClose: () => void;
  onSaveDocument: (doc: DocumentRecord) => Promise<void>;
  onAddTask?: (title: string) => Promise<void>;
  onDeleteDocument?: (id: string) => Promise<void>;
}

export const MarkdownDrawer: React.FC<MarkdownDrawerProps> = ({
  isOpen,
  document,
  projectId,
  agentId,
  kbs = [],
  agents = [],
  onClose,
  onSaveDocument,
  onAddTask,
  onDeleteDocument,
}) => {
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Sync agent and project if provided
  const activeDocWithMeta = React.useMemo(() => {
    if (!document) return null;
    return {
      ...document,
      project_id: projectId || document.project_id || null,
      agent_id: agentId || document.agent_id || null,
    };
  }, [document, projectId, agentId]);

  // Character Memory Bank detection
  const isMemoryBank = Boolean(
    (document?.file_path && document.file_path.includes('/memory-bank/agents/')) ||
    (document?.metadata && document.metadata.includes('memory-bank')) ||
    document?.id.startsWith('mem-')
  );

  const memoryAgent = React.useMemo(() => {
    if (!document) return null;
    if (document.agent_id) {
      const found = agents.find((a) => a.id === document.agent_id);
      if (found) return found;
    }
    const match = document.file_path?.match(/\/memory-bank\/agents\/([^\/]+)\//);
    if (match) {
      return agents.find((a) => a.id === match[1]) || null;
    }
    return null;
  }, [document, agents]);

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !onAddTask) return;
    await onAddTask(quickTaskTitle.trim());
    setQuickTaskTitle('');
    setShowTaskInput(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className={`w-full bg-slate-950/95 border-t sm:border border-indigo-500/30 rounded-t-3xl sm:rounded-3xl shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col transition-all duration-300 ${
            isMaximized
              ? 'fixed inset-2 sm:inset-4 z-50 h-[calc(100vh-16px)] sm:h-[calc(100vh-32px)] max-w-7xl mx-auto'
              : 'max-w-5xl mx-auto h-[90vh] pb-safe'
          }`}
        >
          {/* Grab handle for touch users */}
          <div className="pt-2 pb-1 flex justify-center sm:hidden shrink-0">
            <div className="w-12 h-1.5 rounded-full bg-white/20" />
          </div>

          {/* Quick bar above editor */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-slate-900/40 text-xs shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {memoryAgent ? (
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-purple-300 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  <span className="font-bold">Memory Bank:</span>
                  <span>{memoryAgent.name} ({memoryAgent.role_title})</span>
                </div>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">
                  {projectId ? `Project Link: ${projectId}` : 'Vault Note Workspace'}
                </span>
              )}
              {onAddTask && (
                <button
                  type="button"
                  onClick={() => setShowTaskInput(!showTaskInput)}
                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <Plus width={12} height={12} />
                  <span>Quick Task</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title={isMaximized ? 'Restore drawer' : 'Maximize'}
              >
                {isMaximized ? <Minimize2 width={15} height={15} /> : <Maximize2 width={15} height={15} />}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                title="Close drawer"
              >
                <X width={16} height={16} />
              </button>
            </div>
          </div>

          {/* Quick Task Input Form */}
          {showTaskInput && (
            <form
              onSubmit={handleCreateQuickTask}
              className="flex items-center gap-2 p-3 bg-slate-900/80 border-b border-amber-500/20 shrink-0"
            >
              <input
                type="text"
                value={quickTaskTitle}
                onChange={(e) => setQuickTaskTitle(e.target.value)}
                placeholder="New task title anchored to this project note..."
                className="flex-1 bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400 font-mono"
                autoFocus
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow transition-colors"
              >
                Add Task
              </button>
            </form>
          )}

          {/* Full Notion-Style Rich Markdown Editor */}
          <div className="flex-1 min-h-0 p-2 sm:p-4">
            <NotionRichEditor
              initialDocument={activeDocWithMeta}
              kbs={kbs}
              agents={agents}
              onSave={onSaveDocument}
              onDelete={
                onDeleteDocument
                  ? async (id) => {
                      await onDeleteDocument(id);
                      onClose();
                    }
                  : undefined
              }
              onBack={onClose}
            />
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
