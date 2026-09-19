'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Sparkles,
  Save,
  Trash2,
  Maximize2,
  Minimize2,
  Folder,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Calendar,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';
import { DocumentRecord, KbRecord, AgentRecord } from '@/lib/db/adapter';
import { MarkdownToolbar } from './MarkdownToolbar';
import { RichMarkdownRenderer } from './RichMarkdownRenderer';
import { GlassButton } from '@/components/ui/GlassButton';

interface NotionRichEditorProps {
  initialDocument?: DocumentRecord | null;
  kbs?: KbRecord[];
  agents?: AgentRecord[];
  onSave: (doc: DocumentRecord) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onBack?: () => void;
  isFullPage?: boolean;
}

export const NotionRichEditor: React.FC<NotionRichEditorProps> = ({
  initialDocument,
  kbs = [],
  agents = [],
  onSave,
  onDelete,
  onBack,
  isFullPage = false,
}) => {
  const [id, setId] = useState<string>('');
  const [title, setTitle] = useState<string>('Untitled Document.md');
  const [content, setContent] = useState<string>('');
  const [kbId, setKbId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['vault', 'notion']);
  const [tagInput, setTagInput] = useState('');

  // UI state
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [hasCopied, setHasCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Rehydrate state when initialDocument changes
  useEffect(() => {
    if (initialDocument) {
      setId(initialDocument.id);
      setTitle(initialDocument.title || 'Untitled Document.md');
      setContent(initialDocument.content || '');
      setKbId(initialDocument.kb_id || (kbs[0]?.id ?? ''));
      setAgentId(initialDocument.agent_id || (agents[0]?.id ?? ''));

      if (initialDocument.metadata) {
        try {
          const parsed = JSON.parse(initialDocument.metadata);
          if (Array.isArray(parsed.tags)) {
            setTags(parsed.tags);
          }
        } catch {
          // Keep default tags
        }
      }
      setSaveStatus('saved');
      setLastSavedTime(
        initialDocument.updated_at
          ? new Date(initialDocument.updated_at).toLocaleTimeString()
          : 'Just now'
      );
    } else {
      setId(`doc-${Date.now().toString(36)}`);
      setTitle('Untitled Document.md');
      setContent(
        `# Welcome to your Vault Note\n\n> [!NOTE] This note is stored locally in your browser's private storage (OPFS SQLite). No external servers or cloud accounts required.\n\n### Objectives\n- [ ] Draft operational specs\n- [ ] Link knowledge base lore\n\n### Specifications\n| Milestone | Owner | Status |\n| :--- | :--- | :--- |\n| Core Architecture | Franky | Active |\n| Research Review | Robin | In Progress |\n\n\`\`\`ts\n// Local-first execution\nexport const execute = () => {\n  console.log("Zero cloud database bills!");\n};\n\`\`\`\n`
      );
      if (kbs.length > 0) setKbId(kbs[0].id);
      if (agents.length > 0) setAgentId(agents[0].id);
      setSaveStatus('dirty');
    }
  }, [initialDocument, kbs, agents]);

  // Handle auto-save with 500ms debounce
  const triggerAutoSave = (
    newTitle: string,
    newContent: string,
    newKbId: string,
    newAgentId: string,
    newTags: string[]
  ) => {
    setSaveStatus('dirty');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      setSaveStatus('saving');
      try {
        const docToSave: DocumentRecord = {
          id: id || `doc-${Date.now().toString(36)}`,
          title: newTitle.trim() || 'Untitled Document.md',
          content: newContent,
          file_path: initialDocument?.file_path || null,
          kb_id: newKbId || null,
          agent_id: newAgentId || null,
          project_id: initialDocument?.project_id || null,
          company_id: initialDocument?.company_id || null,
          metadata: JSON.stringify({
            tags: newTags,
            updatedBy: 'NotionRichEditor',
          }),
          updated_at: new Date().toISOString(),
        };

        await onSave(docToSave);
        setSaveStatus('saved');
        setLastSavedTime(new Date().toLocaleTimeString());
      } catch (err) {
        console.error('Failed to autosave document:', err);
        setSaveStatus('dirty');
      }
    }, 500);
  };

  const handleTitleChange = (val: string) => {
    setTitle(val);
    triggerAutoSave(val, content, kbId, agentId, tags);
  };

  const handleContentChange = (val: string) => {
    setContent(val);
    triggerAutoSave(title, val, kbId, agentId, tags);
  };

  const handleKbChange = (val: string) => {
    setKbId(val);
    triggerAutoSave(title, content, val, agentId, tags);
  };

  const handleAgentChange = (val: string) => {
    setAgentId(val);
    triggerAutoSave(title, content, kbId, val, tags);
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
      e.preventDefault();
      const clean = tagInput.trim().replace(/^#/, '');
      if (!tags.includes(clean)) {
        const updated = [...tags, clean];
        setTags(updated);
        triggerAutoSave(title, content, kbId, agentId, updated);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    const updated = tags.filter((t) => t !== tagToRemove);
    setTags(updated);
    triggerAutoSave(title, content, kbId, agentId, updated);
  };

  // Insert formatting snippet at cursor position
  const handleInsert = (prefix: string, suffix = '', defaultText = '') => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = selectedText ? `${prefix}${selectedText}${suffix}` : `${prefix}${defaultText}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    triggerAutoSave(title, newContent, kbId, agentId, tags);

    // Reposition cursor
    setTimeout(() => {
      textarea.focus();
      const newCursorPos = selectedText
        ? start + replacement.length
        : start + prefix.length + defaultText.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  // Toggle checkbox state directly from preview mode
  const handleToggleCheckbox = (lineIndex: number, newChecked: boolean) => {
    const lines = content.split('\n');
    if (lineIndex < 0 || lineIndex >= lines.length) return;
    const targetLine = lines[lineIndex];

    const updatedLine = targetLine.replace(
      /^-\s*\[([ xX])\]/,
      newChecked ? '- [x]' : '- [ ]'
    );
    lines[lineIndex] = updatedLine;
    const updatedContent = lines.join('\n');
    setContent(updatedContent);
    triggerAutoSave(title, updatedContent, kbId, agentId, tags);
  };

  // Copy raw markdown
  const handleCopyAll = () => {
    navigator.clipboard.writeText(content);
    setHasCopied(true);
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Computed metrics
  const wordCount = useMemo(() => {
    return content.trim() ? content.trim().split(/\s+/).length : 0;
  }, [content]);

  const readingTime = useMemo(() => {
    const minutes = Math.ceil(wordCount / 200);
    return `${minutes} min read`;
  }, [wordCount]);

  return (
    <div
      className={`flex flex-col bg-slate-950/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-none border-none'
          : isFullPage
          ? 'w-full h-full min-h-[calc(100vh-140px)]'
          : 'w-full h-[85vh]'
      }`}
    >
      {/* Top Document Header & Meta Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-slate-900/50 shrink-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
              title="Return to documents list"
            >
              <ChevronLeft width={18} height={18} />
            </button>
          )}

          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText width={18} height={18} />
          </div>

          <div className="min-w-0 flex-1">
            <input
              type="text"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Document Title.md"
              className="w-full bg-transparent font-extrabold text-white text-base sm:text-lg tracking-tight focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 border border-transparent hover:border-white/10 transition-colors"
            />
          </div>
        </div>

        {/* Status indicator & Document tools */}
        <div className="flex items-center justify-end gap-3 shrink-0">
          {/* Autosave status pill */}
          <div className="flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-400">
            {saveStatus === 'saving' ? (
              <>
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span className="text-amber-300">Autosaving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <CheckCircle2 width={13} height={13} className="text-emerald-400" />
                <span className="text-emerald-400">Saved ({lastSavedTime})</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Unsaved changes</span>
              </>
            )}
          </div>

          {/* Fullscreen toggle */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Editor'}
          >
            {isFullscreen ? <Minimize2 width={16} height={16} /> : <Maximize2 width={16} height={16} />}
          </button>

          {/* Delete document button */}
          {onDelete && id && (
            <button
              type="button"
              onClick={() => onDelete(id)}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 bg-white/5 hover:bg-rose-500/10 transition-colors"
              title="Delete Document"
            >
              <Trash2 width={16} height={16} />
            </button>
          )}
        </div>
      </div>

      {/* Document Properties Bar (Collection, Officer, Tags) */}
      <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2 border-b border-white/5 bg-slate-950/60 text-xs shrink-0">
        {/* Collection / KB Selector */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <Folder width={14} height={14} className="text-indigo-400" />
          <span className="font-semibold">Collection:</span>
          <select
            value={kbId}
            onChange={(e) => handleKbChange(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-400"
          >
            <option value="">No Collection</option>
            {kbs.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name}
              </option>
            ))}
          </select>
        </div>

        {/* Assigned Officer */}
        <div className="flex items-center gap-1.5 text-slate-400">
          <User width={14} height={14} className="text-teal-400" />
          <span className="font-semibold">Officer:</span>
          <select
            value={agentId}
            onChange={(e) => handleAgentChange(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-lg px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-400"
          >
            <option value="">Fleet-wide Lore</option>
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.role_title})
              </option>
            ))}
          </select>
        </div>

        {/* Tags input */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-[11px]"
            >
              #{t}
              <button
                type="button"
                onClick={() => handleRemoveTag(t)}
                className="hover:text-white ml-0.5"
              >
                &times;
              </button>
            </span>
          ))}
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ tag (press Enter)"
            className="bg-transparent text-slate-400 placeholder:text-slate-600 focus:outline-none text-[11px] font-mono px-1 py-0.5 border-b border-transparent focus:border-indigo-400 w-28"
          />
        </div>
      </div>

      {/* Notion Formatting Toolbar */}
      <MarkdownToolbar
        onInsert={handleInsert}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        onCopyAll={handleCopyAll}
        hasCopied={hasCopied}
        wordCount={wordCount}
        readingTime={readingTime}
      />

      {/* Editor & Preview Workspace Canvas */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10 overflow-hidden">
        {/* Editor Pane */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div
            className={`flex-1 h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-950/40 ${
              viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Type your markdown content here or use formatting tools above..."
              className="w-full h-full min-h-[400px] bg-transparent text-slate-100 font-mono text-sm leading-relaxed placeholder:text-slate-600 focus:outline-none resize-none"
              spellCheck={false}
            />
          </div>
        )}

        {/* Live Rendered Notion Preview Pane */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div
            className={`flex-1 h-full overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-900/30 ${
              viewMode === 'split' ? 'w-full md:w-1/2' : 'w-full'
            }`}
          >
            <div className="max-w-3xl mx-auto">
              <RichMarkdownRenderer
                content={content}
                onToggleCheckbox={handleToggleCheckbox}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
