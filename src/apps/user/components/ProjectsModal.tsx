import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassCard } from '@/components/ui/GlassCard';
import { Folder, Plus, Trash2, Edit2, X, Check, FolderOpen } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  title?: string;
  description?: string;
  custom_instructions?: string;
  created_at: string;
}

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project | null) => void;
  currentProject: Project | null;
}

export function ProjectsModal({ isOpen, onClose, onSelectProject, currentProject }: ProjectsModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<Project | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const fetchProjects = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching projects:', error);
    else setProjects(data || []);
    setLoading(false);
  };

  const handleSave = async () => {
    if (!title.trim()) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const payload = {
      name: title, // Keep name for compatibility
      title: title,
      description,
      custom_instructions: instructions,
      user_id: user.id
    };

    if (isEditing) {
      const { error } = await supabase
        .from('projects')
        .update(payload)
        .eq('id', isEditing.id);
      
      if (error) console.error('Error updating project:', error);
    } else {
      const { error } = await supabase
        .from('projects')
        .insert(payload);
      
      if (error) console.error('Error creating project:', error);
    }

    resetForm();
    fetchProjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? This will delete all associated chats and knowledge bases.')) return;
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);

    if (error) console.error('Error deleting project:', error);
    else {
      if (currentProject?.id === id) onSelectProject(null);
      fetchProjects();
    }
  };

  const resetForm = () => {
    setIsCreating(false);
    setIsEditing(null);
    setTitle('');
    setDescription('');
    setInstructions('');
  };

  const startEdit = (project: Project) => {
    setIsEditing(project);
    setTitle(project.title || project.name);
    setDescription(project.description || '');
    setInstructions(project.custom_instructions || '');
    setIsCreating(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-4xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-light text-white">Projects</h2>
                  <p className="text-xs text-white/40 uppercase tracking-wider">Workspace Management</p>
                </div>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
              {/* Sidebar List */}
              <div className="w-full md:w-1/3 border-r border-white/5 bg-black/20 flex flex-col">
                <div className="p-4 border-b border-white/5">
                  <GlassButton 
                    onClick={() => { resetForm(); setIsCreating(true); }}
                    className="w-full justify-center gap-2"
                  >
                    <Plus size={16} /> New Project
                  </GlassButton>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {loading ? (
                    <div className="text-center py-8 text-white/30 text-xs animate-pulse">Loading...</div>
                  ) : projects.length === 0 ? (
                    <div className="text-center py-8 text-white/30 text-xs">No projects found.</div>
                  ) : (
                    projects.map(project => (
                      <div 
                        key={project.id || `project-${Math.random()}`}
                        onClick={() => !isCreating && onSelectProject(project)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer group ${
                          currentProject?.id === project.id 
                            ? 'bg-indigo-500/20 border-indigo-500/50' 
                            : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <h3 className={`font-medium text-sm ${currentProject?.id === project.id ? 'text-white' : 'text-white/80'}`}>
                            {project.title || project.name}
                          </h3>
                          {currentProject?.id === project.id && <Check size={14} className="text-indigo-400" />}
                        </div>
                        <p className="text-xs text-white/40 line-clamp-2 mb-2">
                          {project.description || 'No description'}
                        </p>
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => { e.stopPropagation(); startEdit(project); }}
                            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }}
                            className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 bg-zinc-900 p-6 overflow-y-auto custom-scrollbar">
                {isCreating ? (
                  <div className="space-y-6 max-w-2xl mx-auto">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-white">
                        {isEditing ? 'Edit Project' : 'Create New Project'}
                      </h3>
                      <button onClick={resetForm} className="text-xs text-white/40 hover:text-white uppercase tracking-wider">
                        Cancel
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <GlassInput
                        label="Project Title"
                        placeholder="e.g. Q4 Marketing Campaign"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                      />
                      
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">
                          Description
                        </label>
                        <textarea
                          className="w-full h-24 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all text-sm resize-none"
                          placeholder="Brief description of this project..."
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">
                          Custom Instructions (System Prompt)
                        </label>
                        <p className="text-[10px] text-white/40 ml-1 mb-2">
                          These instructions will be prepended to every chat in this project.
                        </p>
                        <textarea
                          className="w-full h-48 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all font-mono text-sm resize-none"
                          placeholder="e.g. You are a senior marketing strategist. Always focus on ROI and brand alignment..."
                          value={instructions}
                          onChange={(e) => setInstructions(e.target.value)}
                        />
                      </div>

                      <div className="pt-4 flex justify-end gap-3">
                        <GlassButton variant="secondary" onClick={resetForm}>
                          Cancel
                        </GlassButton>
                        <GlassButton onClick={handleSave} disabled={!title.trim()}>
                          {isEditing ? 'Update Project' : 'Create Project'}
                        </GlassButton>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
                      <Folder size={32} className="text-white/30" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium text-white">Select a Project</h3>
                      <p className="text-sm text-white/50 max-w-xs mx-auto mt-2">
                        Choose a project from the sidebar to activate its context and knowledge base, or create a new one.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
