'use client';

import React from 'react';
import {
  Check,
  CheckCircle2,
  Copy,
  Terminal,
  ExternalLink,
  Info,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';

interface RichMarkdownRendererProps {
  content: string;
  onToggleCheckbox?: (lineIndex: number, newChecked: boolean) => void;
  className?: string;
}

export const RichMarkdownRenderer: React.FC<RichMarkdownRendererProps> = ({
  content,
  onToggleCheckbox,
  className = '',
}) => {
  const [copiedCodeIdx, setCopiedCodeIdx] = React.useState<number | null>(null);

  const handleCopySnippet = (codeText: string, index: number) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCodeIdx(index);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  // Helper to parse inline styles (bold, italic, code, link)
  const renderInlineFormatted = (text: string): React.ReactNode => {
    // Regex splits markdown tokens: `code`, **bold**, *italic*, ~~strike~~, [title](url)
    const parts: React.ReactNode[] = [];
    let current = text;
    let keyIdx = 0;

    // Pattern for inline code, links, bold, italic, strikethrough
    const inlineRegex = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(~~[^~]+~~)|(\[[^\]]+\]\([^)]+\))/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(text)) !== null) {
      const matchIndex = match.index;
      const matchedStr = match[0];

      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }

      if (matchedStr.startsWith('`') && matchedStr.endsWith('`')) {
        parts.push(
          <code
            key={keyIdx++}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-white/10 font-mono text-xs text-indigo-300"
          >
            {matchedStr.slice(1, -1)}
          </code>
        );
      } else if (matchedStr.startsWith('**') && matchedStr.endsWith('**')) {
        parts.push(
          <strong key={keyIdx++} className="font-bold text-white">
            {matchedStr.slice(2, -2)}
          </strong>
        );
      } else if (matchedStr.startsWith('*') && matchedStr.endsWith('*')) {
        parts.push(
          <em key={keyIdx++} className="italic text-slate-300">
            {matchedStr.slice(1, -1)}
          </em>
        );
      } else if (matchedStr.startsWith('~~') && matchedStr.endsWith('~~')) {
        parts.push(
          <span key={keyIdx++} className="line-through text-slate-500">
            {matchedStr.slice(2, -2)}
          </span>
        );
      } else if (matchedStr.startsWith('[') && matchedStr.includes('](')) {
        const titleEnd = matchedStr.indexOf('](');
        const linkTitle = matchedStr.slice(1, titleEnd);
        const linkUrl = matchedStr.slice(titleEnd + 2, -1);
        parts.push(
          <a
            key={keyIdx++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 inline-flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>{linkTitle}</span>
            <ExternalLink width={11} height={11} className="inline opacity-70" />
          </a>
        );
      }

      lastIndex = matchIndex + matchedStr.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length === 0 ? text : parts;
  };

  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLanguage = '';
  let codeBlockLines: string[] = [];
  let codeBlockStartIdx = 0;

  let inTable = false;
  let tableRows: string[][] = [];

  const flushTable = (key: number) => {
    if (tableRows.length === 0) return;
    const header = tableRows[0];
    const dataRows = tableRows.slice(1).filter((r) => !r.every((c) => /^[:-]+$/.test(c.trim())));

    renderedElements.push(
      <div key={`table-${key}`} className="my-4 overflow-x-auto rounded-xl border border-white/10 bg-slate-900/50">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 uppercase text-[10px] tracking-wider text-slate-400 border-b border-white/10">
            <tr>
              {header.map((col, cIdx) => (
                <th key={cIdx} className="px-4 py-2.5 font-bold font-mono">
                  {renderInlineFormatted(col.trim())}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 font-sans">
            {dataRows.map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-4 py-2.5">
                    {renderInlineFormatted(cell.trim())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    tableRows = [];
    inTable = false;
  };

  lines.forEach((line, idx) => {
    // Check code blocks
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        const codeText = codeBlockLines.join('\n');
        const blockIdx = codeBlockStartIdx;
        renderedElements.push(
          <div
            key={`code-${blockIdx}`}
            className="my-3 rounded-xl border border-white/10 bg-[#070d19] overflow-hidden shadow-lg"
          >
            <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900/90 border-b border-white/5 text-[11px] font-mono text-slate-400">
              <span className="flex items-center gap-1.5 text-indigo-400">
                <Terminal width={12} height={12} />
                <span>{codeBlockLanguage || 'plaintext'}</span>
              </span>
              <button
                type="button"
                onClick={() => handleCopySnippet(codeText, blockIdx)}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Copy code"
              >
                {copiedCodeIdx === blockIdx ? (
                  <>
                    <Check width={12} height={12} className="text-emerald-400" />
                    <span className="text-emerald-400 text-[10px]">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy width={12} height={12} />
                    <span className="text-[10px]">Copy</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3.5 text-xs font-mono text-indigo-100 overflow-x-auto leading-relaxed custom-scrollbar selection:bg-indigo-500/40">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLanguage = '';
        return;
      } else {
        if (inTable) flushTable(idx);
        inCodeBlock = true;
        codeBlockLanguage = line.trim().slice(3).trim();
        codeBlockLines = [];
        codeBlockStartIdx = idx;
        return;
      }
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Check table syntax
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      inTable = true;
      const cols = line
        .trim()
        .slice(1, -1)
        .split('|');
      tableRows.push(cols);
      return;
    } else if (inTable) {
      flushTable(idx);
    }

    // Headings
    if (line.startsWith('# ')) {
      renderedElements.push(
        <h1
          key={idx}
          className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-6 mb-3 pb-2 border-b border-white/10"
        >
          {renderInlineFormatted(line.slice(2))}
        </h1>
      );
      return;
    }
    if (line.startsWith('## ')) {
      renderedElements.push(
        <h2
          key={idx}
          className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight mt-5 mb-2 pb-1 border-b border-white/5"
        >
          {renderInlineFormatted(line.slice(3))}
        </h2>
      );
      return;
    }
    if (line.startsWith('### ')) {
      renderedElements.push(
        <h3 key={idx} className="text-base sm:text-lg font-semibold text-indigo-300 mt-4 mb-2">
          {renderInlineFormatted(line.slice(4))}
        </h3>
      );
      return;
    }
    if (line.startsWith('#### ')) {
      renderedElements.push(
        <h4 key={idx} className="text-sm sm:text-base font-medium text-slate-300 mt-3 mb-1">
          {renderInlineFormatted(line.slice(5))}
        </h4>
      );
      return;
    }

    // Callouts / Blockquotes
    if (line.startsWith('> ')) {
      const quoteText = line.slice(2);
      let calloutVariant = 'default';
      let cleanText = quoteText;

      if (quoteText.startsWith('[!NOTE]') || quoteText.startsWith('[!INFO]')) {
        calloutVariant = 'info';
        cleanText = quoteText.replace(/^\[!(NOTE|INFO)\]\s*/, '');
      } else if (quoteText.startsWith('[!WARNING]') || quoteText.startsWith('[!CAUTION]')) {
        calloutVariant = 'warning';
        cleanText = quoteText.replace(/^\[!(WARNING|CAUTION)\]\s*/, '');
      } else if (quoteText.startsWith('[!TIP]')) {
        calloutVariant = 'tip';
        cleanText = quoteText.replace(/^\[!TIP\]\s*/, '');
      }

      renderedElements.push(
        <div
          key={idx}
          className={`my-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed flex items-start gap-2.5 backdrop-blur-md ${
            calloutVariant === 'info'
              ? 'bg-indigo-950/30 border-indigo-500/30 text-indigo-200'
              : calloutVariant === 'warning'
              ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
              : calloutVariant === 'tip'
              ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200'
              : 'bg-slate-900/60 border-slate-700/50 text-slate-300 border-l-4 border-l-indigo-400'
          }`}
        >
          {calloutVariant === 'info' && <Info width={16} height={16} className="text-indigo-400 shrink-0 mt-0.5" />}
          {calloutVariant === 'warning' && (
            <AlertTriangle width={16} height={16} className="text-amber-400 shrink-0 mt-0.5" />
          )}
          {calloutVariant === 'tip' && (
            <Lightbulb width={16} height={16} className="text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 italic">{renderInlineFormatted(cleanText)}</div>
        </div>
      );
      return;
    }

    // Checkboxes / Tasks (- [ ] or - [x])
    if (/^-\s*\[([ xX])\]\s*(.*)$/.test(line)) {
      const match = line.match(/^-\s*\[([ xX])\]\s*(.*)$/);
      if (match) {
        const isChecked = match[1].toLowerCase() === 'x';
        const taskText = match[2];
        renderedElements.push(
          <div
            key={idx}
            className="flex items-start gap-3 py-1 group cursor-pointer"
            onClick={() => onToggleCheckbox && onToggleCheckbox(idx, !isChecked)}
          >
            <button
              type="button"
              className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-all ${
                isChecked
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-sm shadow-indigo-500/30'
                  : 'bg-slate-900 border-white/20 group-hover:border-indigo-400'
              }`}
            >
              {isChecked ? <Check width={12} height={12} strokeWidth={3} /> : null}
            </button>
            <span
              className={`text-xs sm:text-sm leading-relaxed transition-colors ${
                isChecked ? 'line-through text-slate-500' : 'text-slate-200 group-hover:text-white'
              }`}
            >
              {renderInlineFormatted(taskText)}
            </span>
          </div>
        );
        return;
      }
    }

    // Bullet lists
    if (line.startsWith('- ') || line.startsWith('* ')) {
      renderedElements.push(
        <div key={idx} className="flex items-start gap-2.5 py-0.5 ml-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80 mt-2 shrink-0" />
          <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {renderInlineFormatted(line.slice(2))}
          </span>
        </div>
      );
      return;
    }

    // Numbered lists
    if (/^\d+\.\s+(.*)$/.test(line)) {
      const match = line.match(/^(\d+)\.\s+(.*)$/);
      if (match) {
        renderedElements.push(
          <div key={idx} className="flex items-start gap-2.5 py-0.5 ml-2">
            <span className="font-mono text-xs font-bold text-indigo-400 shrink-0 w-4 text-right">
              {match[1]}.
            </span>
            <span className="text-xs sm:text-sm text-slate-200 leading-relaxed">
              {renderInlineFormatted(match[2])}
            </span>
          </div>
        );
        return;
      }
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)$/.test(line.trim())) {
      renderedElements.push(<hr key={idx} className="my-5 border-white/10" />);
      return;
    }

    // Empty lines
    if (!line.trim()) {
      renderedElements.push(<div key={idx} className="h-2" />);
      return;
    }

    // Regular paragraph
    renderedElements.push(
      <p key={idx} className="text-xs sm:text-sm text-slate-200 leading-relaxed">
        {renderInlineFormatted(line)}
      </p>
    );
  });

  if (inTable) flushTable(lines.length);

  return (
    <div className={`notion-preview space-y-1 ${className}`}>
      {renderedElements.length > 0 ? (
        renderedElements
      ) : (
        <p className="text-slate-500 italic text-sm">Empty document content...</p>
      )}
    </div>
  );
};
