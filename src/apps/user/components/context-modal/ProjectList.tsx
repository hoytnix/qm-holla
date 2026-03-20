import React, { useState } from 'react';
import { Folder, Trash2 } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Project } from './types';

interface ProjectListProps {
  projects: Project[];
  currentProject: Project | null;
  onSelect: (project: Project) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onCreate: (title: string) => void;
}

export const ProjectList = ({ projects, currentProject, onSelect, onDelete, onCreate }: ProjectListProps) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2" title="Projects are re-usable across different agents."><Folder className="text-indigo-400" size={20}/> Projects</h3>
        {!isCreating && <button onClick={() => setIsCreating(true)} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">New</button>}
      </div>
      {isCreating ? (
        <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-3">
          <GlassInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title..." />
          <div className="flex gap-2">
            <GlassButton onClick={() => setIsCreating(false)} variant="secondary" className="flex-1">Cancel</GlassButton>
            <GlassButton onClick={() => { onCreate(title); setIsCreating(false); setTitle(''); }} className="flex-1">Create</GlassButton>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p: Project) => (
            <div key={p.id} onClick={() => onSelect(p)} className={`group p-4 rounded-2xl border transition-all cursor-pointer ${currentProject?.id === p.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}>
              <div className="flex justify-between items-center">
                <span className="font-medium text-white">{p.title || p.name}</span>
                <button onClick={(e) => onDelete(p.id, e)} className="text-white/30 group-hover:text-red-400 transition-colors"><Trash2 size={16}/></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
