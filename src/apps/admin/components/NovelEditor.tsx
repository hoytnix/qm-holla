import React from 'react';
import { EditorRoot, EditorContent, JSONContent, StarterKit } from 'novel';

interface NovelEditorProps {
  initialValue?: string;
  onChange: (value: string) => void;
  className?: string;
}

export default function NovelEditor({ initialValue, onChange, className }: NovelEditorProps) {
  const initialContent: JSONContent | undefined = initialValue 
    ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: initialValue }] }] } 
    : undefined;

  return (
    <div className={`relative w-full rounded-xl border border-white/10 bg-black/20 overflow-hidden ${className}`}>
      <EditorRoot>
        <EditorContent
          extensions={[StarterKit]}
          initialContent={initialContent}
          onUpdate={({ editor }) => {
            const text = editor.getText();
            onChange(text);
          }}
          className="min-h-[300px] p-4 text-white prose prose-invert max-w-none focus:outline-none"
        />
      </EditorRoot>
    </div>
  );
}
