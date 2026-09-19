'use client';

import React, { useState } from 'react';
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Code,
  Quote,
  List,
  ListOrdered,
  CheckSquare,
  Minus,
  Table,
  Link as LinkIcon,
  Copy,
  Check,
  Split,
  Eye,
  Edit3,
  Sparkles,
} from 'lucide-react';

export interface FormattingToolProps {
  onInsert: (prefix: string, suffix?: string, defaultText?: string) => void;
  viewMode: 'split' | 'edit' | 'preview';
  onChangeViewMode: (mode: 'split' | 'edit' | 'preview') => void;
  onCopyAll: () => void;
  hasCopied: boolean;
  wordCount: number;
  readingTime: string;
}

export const MarkdownToolbar: React.FC<FormattingToolProps> = ({
  onInsert,
  viewMode,
  onChangeViewMode,
  onCopyAll,
  hasCopied,
  wordCount,
  readingTime,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2 px-3 bg-slate-900/80 border-b border-white/10 backdrop-blur-md rounded-t-2xl select-none">
      {/* Quick formatting actions */}
      <div className="flex items-center flex-wrap gap-1">
        {/* Headings */}
        <div className="flex items-center bg-slate-950/60 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            title="Heading 1 (# )"
            onClick={() => onInsert('# ', '', 'Heading 1')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Heading1 width={15} height={15} />
          </button>
          <button
            type="button"
            title="Heading 2 (## )"
            onClick={() => onInsert('## ', '', 'Heading 2')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Heading2 width={15} height={15} />
          </button>
          <button
            type="button"
            title="Heading 3 (### )"
            onClick={() => onInsert('### ', '', 'Heading 3')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Heading3 width={15} height={15} />
          </button>
        </div>

        {/* Text styling */}
        <div className="flex items-center bg-slate-950/60 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            title="Bold (**text**)"
            onClick={() => onInsert('**', '**', 'bold text')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Bold width={15} height={15} />
          </button>
          <button
            type="button"
            title="Italic (*text*)"
            onClick={() => onInsert('*', '*', 'italic text')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Italic width={15} height={15} />
          </button>
          <button
            type="button"
            title="Strikethrough (~~text~~)"
            onClick={() => onInsert('~~', '~~', 'strikethrough text')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Strikethrough width={15} height={15} />
          </button>
          <button
            type="button"
            title="Inline Code (`code`)"
            onClick={() => onInsert('`', '`', 'code')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Code width={15} height={15} />
          </button>
        </div>

        {/* Lists & Notion Blocks */}
        <div className="flex items-center bg-slate-950/60 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            title="Bullet List (- item)"
            onClick={() => onInsert('- ', '', 'List item')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <List width={15} height={15} />
          </button>
          <button
            type="button"
            title="Numbered List (1. item)"
            onClick={() => onInsert('1. ', '', 'Numbered item')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <ListOrdered width={15} height={15} />
          </button>
          <button
            type="button"
            title="Interactive Task (- [ ] task)"
            onClick={() => onInsert('- [ ] ', '', 'Task item')}
            className="p-1.5 text-amber-400 hover:text-amber-300 hover:bg-white/10 rounded transition-colors"
          >
            <CheckSquare width={15} height={15} />
          </button>
          <button
            type="button"
            title="Callout Quote (> quote)"
            onClick={() => onInsert('> ', '', 'Callout observation or insight')}
            className="p-1.5 text-indigo-400 hover:text-indigo-300 hover:bg-white/10 rounded transition-colors"
          >
            <Quote width={15} height={15} />
          </button>
        </div>

        {/* Advanced blocks */}
        <div className="hidden sm:flex items-center bg-slate-950/60 rounded-lg p-0.5 border border-white/5">
          <button
            type="button"
            title="Code Block"
            onClick={() => onInsert('```ts\n', '\n```', '// code block here')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded text-[11px] font-mono px-2 transition-colors"
          >
            &lt;/&gt;
          </button>
          <button
            type="button"
            title="Insert Table"
            onClick={() =>
              onInsert(
                '\n| Feature | Status | Lead |\n| :--- | :--- | :--- |\n| Offline Storage | Active | Franky |\n',
                '',
                ''
              )
            }
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Table width={15} height={15} />
          </button>
          <button
            type="button"
            title="Divider (---)"
            onClick={() => onInsert('\n---\n', '', '')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <Minus width={15} height={15} />
          </button>
          <button
            type="button"
            title="Hyperlink [title](url)"
            onClick={() => onInsert('[', '](https://)', 'Link Title')}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded transition-colors"
          >
            <LinkIcon width={15} height={15} />
          </button>
        </div>
      </div>

      {/* View controls & Stats */}
      <div className="flex items-center gap-2">
        <span className="hidden md:inline-flex items-center gap-2 text-[11px] font-mono text-slate-400 px-2 py-1 rounded bg-slate-950/50 border border-white/5">
          <span>{wordCount} words</span>
          <span className="text-white/20">|</span>
          <span>{readingTime}</span>
        </span>

        {/* Copy button */}
        <button
          type="button"
          onClick={onCopyAll}
          title="Copy raw markdown to clipboard"
          className="p-1.5 px-2 rounded-lg bg-slate-950/70 hover:bg-white/10 text-slate-300 hover:text-white border border-white/5 text-xs flex items-center gap-1.5 transition-colors"
        >
          {hasCopied ? (
            <>
              <Check width={13} height={13} className="text-emerald-400" />
              <span className="text-emerald-400 text-[11px] font-mono">Copied</span>
            </>
          ) : (
            <>
              <Copy width={13} height={13} />
              <span className="hidden sm:inline text-[11px]">Copy</span>
            </>
          )}
        </button>

        {/* View mode toggle (Split / Edit / Preview) */}
        <div className="flex items-center bg-slate-950 border border-white/10 rounded-xl p-0.5">
          <button
            type="button"
            onClick={() => onChangeViewMode('edit')}
            className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              viewMode === 'edit'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Editor only"
          >
            <Edit3 width={13} height={13} />
            <span className="hidden sm:inline text-[11px]">Edit</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('split')}
            className={`p-1.5 px-2 rounded-lg text-xs hidden lg:flex items-center gap-1 transition-all ${
              viewMode === 'split'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Split live editor & preview"
          >
            <Split width={13} height={13} />
            <span className="text-[11px]">Split</span>
          </button>
          <button
            type="button"
            onClick={() => onChangeViewMode('preview')}
            className={`p-1.5 px-2 rounded-lg text-xs flex items-center gap-1 transition-all ${
              viewMode === 'preview'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Live rendered preview"
          >
            <Eye width={13} height={13} />
            <span className="hidden sm:inline text-[11px]">Preview</span>
          </button>
        </div>
      </div>
    </div>
  );
};
