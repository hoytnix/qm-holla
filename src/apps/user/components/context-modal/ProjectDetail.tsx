import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Project, KB } from './types';

interface ProjectDetailProps {
  project: Project;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<Project>) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  onSelect: (project: Project | null) => void;
  allKbs: KB[];
  onUpdateKb: (id: string, updates: Partial<KB>) => void;
  currentProject: Project | null;
}

export const ProjectDetail = ({ project, onClose, onUpdate, onDelete, onSelect, allKbs, onUpdateKb, currentProject }: ProjectDetailProps) => {
  const [title, setTitle] = useState(project.title || project.name);
  const [description, setDescription] = useState(project.description || '');
  const isSelected = currentProject?.id === project.id;

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-zinc-900 p-6 rounded-3xl border border-white/10 w-full max-w-lg max-h-[80vh] overflow-y-auto">
      <h3 className="text-2xl font-bold text-white mb-4">Edit Project</h3>
      <GlassInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title..." className="mb-4" />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white mb-6" rows={4} />
      
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-white mb-2">Linked Knowledge Bases</h4>
        <div className="space-y-2">
          {allKbs.map((kb: KB) => (
            <div key={kb.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl">
              <span className="text-white">{kb.name}</span>
              <input 
                type="checkbox" 
                checked={kb.project_id === project.id} 
                onChange={() => onUpdateKb(kb.id, { project_id: kb.project_id === project.id ? null : project.id })}
                className="w-5 h-5 accent-indigo-500 cursor-pointer"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <GlassButton onClick={() => { onUpdate(project.id, { title, description }); onClose(); }} className="flex-1">Save</GlassButton>
        {isSelected ? (
          <GlassButton onClick={() => { onSelect(null); onClose(); }} variant="secondary" className="flex-1">Unselect</GlassButton>
        ) : (
          <GlassButton onClick={() => { onSelect(project); onClose(); }} variant="secondary" className="flex-1">Select</GlassButton>
        )}
        <GlassButton onClick={onClose} variant="secondary" className="flex-1">Close</GlassButton>
      </div>
    </motion.div>
  );
};
