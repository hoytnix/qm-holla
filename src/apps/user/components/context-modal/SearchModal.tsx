import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Search } from 'lucide-react';
import { GlassInput } from '@/components/ui/GlassInput';
import { Project, KB } from './types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  kbs: KB[];
  onSelectProject: (project: Project) => void;
  onSelectKb: (kb: KB) => void;
}

export const SearchModal = ({ isOpen, onClose, projects, kbs, onSelectProject, onSelectKb }: SearchModalProps) => {
  const [query, setQuery] = useState('');
  const [includeAttachments, setIncludeAttachments] = useState(false);

  const filteredProjects = useMemo(() => 
    projects.filter(p => p.name.toLowerCase().includes(query.toLowerCase()) || p.title?.toLowerCase().includes(query.toLowerCase())),
    [projects, query]
  );

  const filteredKbs = useMemo(() => 
    kbs.filter(kb => {
      const kbMatch = kb.name.toLowerCase().includes(query.toLowerCase());
      if (includeAttachments && kb.kb_attachments) {
        return kbMatch || kb.kb_attachments.some(att => att.file_name.toLowerCase().includes(query.toLowerCase()));
      }
      return kbMatch;
    }),
    [kbs, query, includeAttachments]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
          <div className="flex items-center gap-2 text-white">
            <Search size={20} />
            <h3 className="text-lg font-light">Search Context</h3>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <GlassInput 
            placeholder="Search projects and knowledge bases..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <label className="flex items-center gap-2 text-xs text-white/50 cursor-pointer">
            <input 
              type="checkbox" 
              checked={includeAttachments} 
              onChange={(e) => setIncludeAttachments(e.target.checked)}
              className="rounded border-white/10 bg-white/5 text-indigo-500 focus:ring-indigo-500"
            />
            Include Attachments
          </label>
        </div>
        <div className="max-h-96 overflow-y-auto px-6 pb-6 space-y-6">
          {filteredProjects.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Projects</h4>
              {filteredProjects.map(p => (
                <div key={p.id} onClick={() => { onSelectProject(p); onClose(); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-white">
                  {p.title || p.name}
                </div>
              ))}
            </div>
          )}
          {filteredKbs.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-white/50 uppercase tracking-wider">Knowledge Bases</h4>
              {filteredKbs.map(kb => (
                <div key={kb.id} onClick={() => { onSelectKb(kb); onClose(); }} className="p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer text-white">
                  {kb.name}
                </div>
              ))}
            </div>
          )}
          {query && filteredProjects.length === 0 && filteredKbs.length === 0 && (
            <p className="text-center text-white/30 py-4">No results found.</p>
          )}
        </div>
      </motion.div>
    </div>
  );
};
