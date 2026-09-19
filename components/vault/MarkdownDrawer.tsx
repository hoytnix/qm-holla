'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  Check,
  Edit3,
  Eye,
  Plus,
  FileText,
  CheckSquare,
  Sparkles,
  Tag,
  Clock,
} from 'lucide-react';
import { DocumentRecord } from '@/lib/db/adapter';
import { GlassButton } from '@/components/ui/GlassButton';

interface MarkdownDrawerProps {
  isOpen: boolean;
  document: DocumentRecord | null;
  projectId?: string | null;
  agentId?: string | null;
  onClose: () => void;
  onSaveDocument: (doc: DocumentRecord) => Promise<void>;
  onAddTask?: (title: string) => Promise<void>;
}

export const MarkdownDrawer: React.FC<MarkdownDrawerProps> = ({
  isOpen,
  document,
  projectId,
  agentId,
  onClose,
  onSaveDocument,
  onAddTask,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mode, setMode] = useState<'view' | 'edit'>('view');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [quickTaskTitle, setQuickTaskTitle] = useState('');
  const [showTaskInput, setShowTaskInput] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (document) {
      setTitle(document.title);
      setContent(document.content);
      setMode('view');
      setSaveStatus('saved');
    } else {
      setTitle('Untitled Note.md');
      setContent('# New Note\n\nWrite your thoughts or specifications here...');
      setMode('edit');
      setSaveStatus('dirty');
    }
  }, [document, isOpen]);

  // Debounced auto-save (500ms)
  const triggerAutoSave = (newTitle: string, newContent: string) => {
    setSaveStatus('dirty');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const id = document ? document.id : `doc-${Date.now().toString(36)}`;
        const updatedDoc: DocumentRecord = {
          id,
          project_id: projectId || document?.project_id || null,
          agent_id: agentId || document?.agent_id || null,
          kb_id: document?.kb_id || null,
          title: newTitle.trim() || 'Untitled Note.md',
          content: newContent,
          metadata: document?.metadata || JSON.stringify({ tags: ['vault', 'note'] }),
          updated_at: new Date().toISOString(),
        };
        await onSaveDocument(updatedDoc);
        setSaveStatus('saved');
      } catch (err) {
        console.error('Auto-save error:', err);
        setSaveStatus('dirty');
      }
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, content);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutoSave(title, val);
  };

  const handleCreateQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTaskTitle.trim() || !onAddTask) return;
    await onAddTask(quickTaskTitle.trim());
    setQuickTaskTitle('');
    setShowTaskInput(false);
  };

  // Simple, deterministic Markdown rendering for browser-native inspection
  const renderMarkdown = (text: string) => {
    const lines = text.split('\n');
    return (
      <div className="space-y-3 font-sans text-slate-200 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl sm:text-2xl font-black text-white pt-2 pb-1 border-b border-white/10">
                {line.slice(2)}
              </h1>
            );
          }
          if (line.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg sm:text-xl font-bold text-cyan-300 pt-2 pb-1">
                {line.slice(3)}
              </h2>
            );
          }
          if (line.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-amber-300 pt-1">
                {line.slice(4)}
              </h3>
            );
          }
          if (line.startsWith('> ')) {
            return (
              <blockquote
                key={idx}
                className="border-l-4 border-amber-500/80 bg-amber-950/20 px-3 py-2 rounded-r-lg italic text-amber-200/90 text-xs sm:text-sm"
              >
                {line.slice(2)}
              </blockquote>
            );
          }
          if (line.startsWith('- [ ] ') || line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
            const isChecked = line.startsWith('- [x] ') || line.startsWith('- [X] ');
            const taskText = line.slice(6);
            return (
              <div key={idx} className="flex items-center gap-2.5 py-0.5">
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                    isChecked
                      ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                      : 'border-white/30 bg-slate-900'
                  }`}
                >
                  {isChecked ? <Check width={12} height={12} strokeWidth={3} /> : null}
                </div>
                <span className={isChecked ? 'line-through text-slate-400 text-xs' : 'text-slate-200 text-xs'}>
                  {taskText}
                </span>
              </div>
            );
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <li key={idx} className="ml-4 list-disc text-xs sm:text-sm text-slate-300">
                {line.slice(2)}
              </li>
            );
          }
          if (line.startsWith('```')) {
            return (
              <div key={idx} className="font-mono text-xs text-indigo-300 bg-slate-950 p-1 px-2 rounded border border-white/5">
                {line}
              </div>
            );
          }
          if (!line.trim()) {
            return <div key={idx} className="h-2" />;
          }
          return (
            <p key={idx} className="text-xs sm:text-sm text-slate-300">
              {line}
            </p>
          );
        })}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: '100%', opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="fixed bottom-0 inset-x-0 z-50 max-w-4xl mx-auto w-full bg-slate-950/95 border-t border-cyan-500/20 rounded-t-3xl shadow-2xl backdrop-blur-2xl p-5 sm:p-7 pb-safe text-slate-100 max-h-[90vh] flex flex-col"
      >
        {/* Grab bar */}
        <div className="w-12 h-1.5 rounded-full bg-white/20 mx-auto mb-3 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-teal-600/30 border border-teal-400/50 flex items-center justify-center text-teal-300 font-bold font-mono text-xs shrink-0">
              K
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-transparent font-bold text-white text-base sm:text-lg focus:outline-none focus:ring-1 focus:ring-teal-400/50 rounded px-1.5 py-0.5 w-full truncate border border-transparent hover:border-white/10 transition-colors"
              placeholder="Document Title.md"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Save indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded-md bg-white/5 border border-white/10 text-slate-400">
              {saveStatus === 'saving' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span className="text-amber-300">OPFS Saving...</span>
                </>
              ) : saveStatus === 'saved' ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span className="text-emerald-400">OPFS SQLite Synced</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span>Unsaved changes</span>
                </>
              )}
            </div>

            {/* Mode toggle */}
            <div className="flex items-center bg-slate-900 border border-white/10 rounded-xl p-0.5">
              <button
                onClick={() => setMode('view')}
                className={`p-1.5 px-2.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  mode === 'view'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye width={14} height={14} />
                <span className="hidden sm:inline">Preview</span>
              </button>
              <button
                onClick={() => setMode('edit')}
                className={`p-1.5 px-2.5 rounded-lg text-xs flex items-center gap-1 transition-all ${
                  mode === 'edit'
                    ? 'bg-teal-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Edit3 width={14} height={14} />
                <span className="hidden sm:inline">Edit</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X width={18} height={18} />
            </button>
          </div>
        </div>

        {/* Action Quickbar: Add Task or Metadata */}
        <div className="flex items-center justify-between gap-3 py-2 shrink-0 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-mono text-[10px]">
              {projectId ? `Project: ${projectId}` : 'Vault Note'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onAddTask && (
              <button
                onClick={() => setShowTaskInput(!showTaskInput)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20"
              >
                <Plus width={12} height={12} />
                <span>Quick Task</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Task Input Expand */}
        {showTaskInput && (
          <form onSubmit={handleCreateQuickTask} className="flex items-center gap-2 pb-3 shrink-0">
            <input
              type="text"
              value={quickTaskTitle}
              onChange={(e) => setQuickTaskTitle(e.target.value)}
              placeholder="New task name anchored to this project..."
              className="flex-1 bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
              autoFocus
            />
            <GlassButton type="submit" size="sm" variant="primary">
              Add
            </GlassButton>
          </form>
        )}

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto py-2 pr-1 min-h-[220px]">
          {mode === 'edit' ? (
            <textarea
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="# Type your markdown note here..."
              className="w-full h-full min-h-[300px] bg-slate-900/50 border border-white/5 rounded-2xl p-4 font-mono text-xs sm:text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-400 resize-none leading-relaxed"
            />
          ) : (
            <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 sm:p-6 min-h-[300px]">
              {renderMarkdown(content)}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
