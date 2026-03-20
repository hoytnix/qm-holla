import React from "react";
import { EditorRoot, EditorContent, StarterKit } from "novel";

interface NovelEditorProps {
  initialContent?: any;
  onChange?: (content: any) => void;
}

export default function NovelEditor({ initialContent, onChange }: NovelEditorProps) {
  return (
    <div className="relative w-full min-h-[500px] rounded-2xl bg-black/40 border border-white/5 shadow-inner">
      <EditorRoot>
        <EditorContent
          extensions={[StarterKit]}
          initialContent={initialContent}
          onUpdate={({ editor }) => {
            if (editor) {
              onChange?.(editor.getJSON());
            }
          }}
          className="border-none bg-transparent focus:outline-none"
          editorProps={{
            attributes: {
              class: "prose prose-invert prose-emerald max-w-none focus:outline-none min-h-[500px] p-12 text-lg leading-relaxed selection:bg-emerald-500/30",
            },
          }}
        />
      </EditorRoot>
      
      <div className="absolute bottom-4 right-6 flex items-center gap-2 pointer-events-none">
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/20 font-mono">
          Novel Engine Active
        </span>
        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 animate-pulse" />
      </div>
    </div>
  );
}
