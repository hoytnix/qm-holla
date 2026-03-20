import React, { useEffect, useState } from 'react';
import { createHighlighter } from 'shiki';
import ReactMarkdown from 'react-markdown';

interface CodeBlockProps {
  language: string;
  value: string;
}

export function CodeBlock({ language, value }: CodeBlockProps) {
  const [html, setHtml] = useState<string>('');
  const [highlighter, setHighlighter] = useState<any>(null);

  useEffect(() => {
    async function initHighlighter() {
      if (!highlighter) {
        const h = await createHighlighter({
          themes: ['github-dark'],
          langs: ['javascript', 'typescript', 'python', 'html', 'css', 'json', 'sql', 'bash'],
        });
        setHighlighter(h);
      }
    }
    initHighlighter();
  }, []);

  useEffect(() => {
    if (highlighter && value) {
      try {
        const highlighted = highlighter.codeToHtml(value, {
          lang: language || 'text',
          theme: 'github-dark',
        });
        setHtml(highlighted);
      } catch (e) {
        // Fallback if language not supported
        const highlighted = highlighter.codeToHtml(value, {
          lang: 'text',
          theme: 'github-dark',
        });
        setHtml(highlighted);
      }
    }
  }, [highlighter, value, language]);

  if (!html) {
    return (
      <pre className="p-4 rounded-lg bg-black/50 text-white/70 text-xs font-mono overflow-x-auto">
        <code>{value}</code>
      </pre>
    );
  }

  return (
    <div 
      className="rounded-lg overflow-hidden my-4 border border-white/10 shadow-lg"
      dangerouslySetInnerHTML={{ __html: html }} 
    />
  );
}

export function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        code({ node, inline, className, children, ...props }: any) {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          if (!inline && match) {
            return (
              <CodeBlock
                language={language}
                value={String(children).replace(/\n$/, '')}
              />
            );
          }
          
          return (
            <code className="bg-white/10 rounded px-1 py-0.5 text-sm font-mono text-pink-300" {...props}>
              {children}
            </code>
          );
        },
        p: ({ children }) => <p className="mb-6 leading-relaxed text-white/90">{children}</p>,
        h1: ({ children }) => <h1 className="text-3xl font-light mb-6 text-white border-b border-white/10 pb-4 tracking-tight">{children}</h1>,
        h2: ({ children }) => <h2 className="text-2xl font-light mb-4 text-white/90 tracking-tight">{children}</h2>,
        h3: ({ children }) => <h3 className="text-xl font-medium mb-3 text-white/80">{children}</h3>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-6 space-y-2 text-white/80">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-6 space-y-2 text-white/80">{children}</ol>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-4 border-purple-500/50 pl-6 py-1 italic my-6 text-white/70 bg-white/5 rounded-r-lg">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline decoration-blue-400/30 underline-offset-2 transition-colors">
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
