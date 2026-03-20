import React, { useState } from 'react';
import { BookOpen, Trash2 } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { KB, Project } from './types';

interface KBListProps {
  kbs: KB[];
  onDelete: (id: string) => void;
  onCreate: (name: string) => void;
  onSelect: (kb: KB) => void;
  currentProject: Project | null;
}

export const KBList = ({ kbs, onDelete, onCreate, onSelect, currentProject }: KBListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2"><BookOpen className="text-emerald-400" size={20}/> Knowledge Bases</h3>
        {!isCreating && <button onClick={() => setIsCreating(true)} className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors">New</button>}
      </div>
      {isCreating ? (
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
          <GlassInput value={name} onChange={(e) => setName(e.target.value)} placeholder="KB name..." />
          <div className="flex gap-2">
            <GlassButton onClick={() => setIsCreating(false)} variant="secondary" className="flex-1">Cancel</GlassButton>
            <GlassButton onClick={() => { onCreate(name); setIsCreating(false); setName(''); }} className="flex-1">Create</GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {kbs.map((kb: KB) => (
            <div key={kb.id} onClick={() => onSelect(kb)} className={`p-4 rounded-2xl border transition-all cursor-pointer ${kb.project_id === currentProject?.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
              <div className="flex justify-between items-center">
                <span className="text-white">{kb.name}</span>
                <button onClick={(e) => { e.stopPropagation(); onDelete(kb.id); }} className="text-white/30 hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
