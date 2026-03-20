import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Folder, Plus, Trash2, X, Loader2, BookOpen, Search, HelpCircle } from 'lucide-react';
import { Close, UploadFile, EditNote, Edit, Save, Delete } from '@mui/icons-material';
import NovelEditor from '@/components/ui/NovelEditor';
import { Project, KB } from './context-modal/types';
import { ProjectList } from './context-modal/ProjectList';
import { ProjectDetail } from './context-modal/ProjectDetail';
import { KBList } from './context-modal/KBList';
import { KBDetail } from './context-modal/KBDetail';
import { SearchModal } from './context-modal/SearchModal';

interface ContextModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  onSelectProject: (project: Project | null) => void;
}

{/* Remove the internal component definitions */}

// --- Main Component ---

export function ContextModal({ isOpen, onClose, currentProject, onSelectProject }: ContextModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [kbs, setKbs] = useState<KB[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedKb, setSelectedKb] = useState<KB | null>(null);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pastingKbId, setPastingKbId] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [editingAttachment, setEditingAttachment] = useState<any>(null);
  const [editContent, setEditContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isTutorialOpen, setIsTutorialOpen] = useState(false);

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const [projectsRes, kbsRes] = await Promise.all([
      supabase.from('projects').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('user_kbs').select('*, kb_attachments(*)').order('created_at', { ascending: false })
    ]);

    if (projectsRes.data) setProjects(projectsRes.data);
    if (kbsRes.data) setKbs(kbsRes.data);
    setLoading(false);
  };

  const handleCreateProject = async (title: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('projects').insert({ name: title, title, user_id: user.id });
    if (!error) await fetchData();
    else alert('Error: ' + error.message);
  };

  const handleCreateKb = async (name: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from('user_kbs').insert({ name, user_id: user.id });
    if (!error) await fetchData();
    else alert('Error: ' + error.message);
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure?')) return;
    await supabase.from('projects').delete().eq('id', id);
    if (currentProject?.id === id) onSelectProject(null);
    fetchData();
  };

  const handleDeleteKb = async (id: string) => {
    if (!confirm('Delete this Knowledge Base?')) return;
    await supabase.from('user_kbs').delete().eq('id', id);
    fetchData();
  };

  const handleUpdateProject = async (id: string, updates: Partial<Project>) => {
    const { error } = await supabase.from('projects').update(updates).eq('id', id);
    if (!error) {
      await fetchData();
      setSelectedProject(null);
    } else {
      alert('Error updating project: ' + error.message);
    }
  };

  const handleUpdateKb = async (id: string, updates: Partial<KB>) => {
    const { error } = await supabase.from('user_kbs').update(updates).eq('id', id);
    if (!error) {
      await fetchData();
      setSelectedKb(null);
    } else {
      alert('Error updating KB: ' + error.message);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, kbId: string) => {
    console.log('handleFileSelect called', { kbId, files: e.target.files });
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingId(kbId);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.log('No user found');
      setUploadingId(null);
      return;
    }

    const file = e.target.files[0];
    const filePath = `${userData.user.id}/${kbId}/${Date.now()}_${file.name}`;
    console.log('Uploading to:', filePath);

    const { error: uploadError } = await supabase.storage
      .from('kb_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      alert('Failed to upload file: ' + uploadError.message);
      setUploadingId(null);
      return;
    }
    console.log('Upload successful');

    const { error: ingestError } = await supabase.functions.invoke('ingest', {
      body: { filePaths: [filePath], kbId }
    });

    if (ingestError) {
      console.error('Ingest error details:', ingestError);
      if (ingestError.message?.includes('401') || ingestError.status === 401) {
        alert('Authentication Error (401): The Supabase gateway rejected the request. Please ensure "Enforce JWT" is DISABLED for the "ingest" function in your Supabase dashboard.');
      } else {
        alert(`Failed to ingest file: ${ingestError.message}`);
      }
    } else {
      console.log('Ingest successful');
      fetchData();
    }
    setUploadingId(null);
  };

  const handlePasteSubmit = async () => {
    console.log('handlePasteSubmit called', { pastingKbId, pastedText });
    if (!pastingKbId || !pastedText.trim()) return;
    
    setUploadingId(pastingKbId);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      console.log('No user found');
      setUploadingId(null);
      return;
    }

    const title = pastedTitle.trim() || `Pasted Text ${new Date().toLocaleString()}`;
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    const filePath = `${userData.user.id}/${pastingKbId}/${Date.now()}_${fileName}`;
    console.log('Uploading pasted text to:', filePath);
    
    const blob = new Blob([pastedText], { type: 'text/markdown' });
    const file = new File([blob], fileName, { type: 'text/markdown' });

    const { error: uploadError } = await supabase.storage
      .from('kb_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading pasted text:', uploadError);
      alert('Failed to save text: ' + uploadError.message);
      setUploadingId(null);
      return;
    }
    console.log('Upload successful');

    const { error: ingestError } = await supabase.functions.invoke('ingest', {
      body: { filePaths: [filePath], kbId: pastingKbId }
    });

    if (ingestError) {
      console.error('Ingest error details:', ingestError);
      if (ingestError.message?.includes('401') || ingestError.status === 401) {
        alert('Authentication Error (401): The Supabase gateway rejected the request. Please ensure "Enforce JWT" is DISABLED for the "ingest" function in your Supabase dashboard.');
      } else {
        alert(`Failed to ingest text: ${ingestError.message}`);
      }
    } else {
      console.log('Ingest successful');
      fetchData();
      setPastingKbId(null);
      setPastedText('');
      setPastedTitle('');
    }
    setUploadingId(null);
  };

  const deleteAttachment = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    const { error } = await supabase.from('kb_attachments').delete().eq('id', attachmentId);
    if (error) console.error('Error deleting attachment:', error);
    else fetchData();
  };

  const startEditing = async (attachment: any) => {
    const isEditable = attachment.file_name.endsWith('.md') || attachment.file_name.endsWith('.txt');
    if (!isEditable) {
        alert('Only .md and .txt files can be edited currently.');
        return;
    }

    setEditingAttachment(attachment);
    setLoadingContent(true);
    
    const { data, error } = await supabase.storage
        .from('kb_attachments')
        .download(attachment.file_path);
    
    if (error) {
        console.error('Error downloading file for edit:', error);
        alert('Failed to load file content.');
        setEditingAttachment(null);
        setLoadingContent(false);
        return;
    }

    const text = await data.text();
    setEditContent({
        type: "doc",
        content: [
            {
                type: "paragraph",
                content: [{ type: "text", text: text }]
            }
        ]
    });
    setLoadingContent(false);
  };

  const saveEdit = async () => {
    if (!editingAttachment || !editContent) return;
    setSaving(true);

    try {
        const extractText = (node: any): string => {
            if (node.type === 'text') return node.text;
            if (node.content) return node.content.map(extractText).join('\n');
            return '';
        };
        
        const text = extractText(editContent);
        const blob = new Blob([text], { type: editingAttachment.file_name.endsWith('.md') ? 'text/markdown' : 'text/plain' });
        const file = new File([blob], editingAttachment.file_name);

        const { error: uploadError } = await supabase.storage
            .from('kb_attachments')
            .upload(editingAttachment.file_path, file, { upsert: true });

        if (uploadError) throw uploadError;

        const { error: ingestError } = await supabase.functions.invoke('ingest', {
            body: { filePaths: [editingAttachment.file_path], kbId: editingAttachment.kb_id }
        });

        if (ingestError) throw ingestError;

        setEditingAttachment(null);
        fetchData();
    } catch (error: any) {
        console.error('Error saving edit:', error);
        alert(`Failed to save changes: ${error.message}`);
    } finally {
        setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="w-full max-w-4xl bg-zinc-950 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-primary/20 flex justify-between items-center bg-primary/5">
              <h2 className="text-2xl font-bold text-primary tracking-tight">Knowledge</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsTutorialOpen(true)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <HelpCircle size={24} />
                </button>
                <button onClick={() => setIsSearchModalOpen(true)} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <Search size={24} />
                </button>
                <button onClick={onClose} className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              <ProjectList projects={projects} currentProject={currentProject} onSelect={(p: Project) => setSelectedProject(p)} onDelete={handleDeleteProject} onCreate={handleCreateProject} />
              <KBList kbs={kbs} onDelete={handleDeleteKb} onCreate={handleCreateKb} onSelect={(kb: KB) => setSelectedKb(kb)} currentProject={currentProject} />
            </div>

            <SearchModal 
              isOpen={isSearchModalOpen} 
              onClose={() => setIsSearchModalOpen(false)} 
              projects={projects} 
              kbs={kbs} 
              onSelectProject={(p) => { setSelectedProject(p); setIsSearchModalOpen(false); }} 
              onSelectKb={(kb) => { setSelectedKb(kb); setIsSearchModalOpen(false); }} 
            />
            <AnimatePresence>
              {selectedProject && (
                <div className="absolute inset-0 z-60 bg-black/80 p-6 flex items-center justify-center">
                  <ProjectDetail project={selectedProject} onClose={() => setSelectedProject(null)} onUpdate={handleUpdateProject} onDelete={handleDeleteProject} onSelect={onSelectProject} allKbs={kbs} onUpdateKb={handleUpdateKb} currentProject={currentProject} />
                </div>
              )}
              {selectedKb && (
                <div className="absolute inset-0 z-60 bg-black/80 p-6 flex items-center justify-center">
                  <KBDetail 
                    kb={selectedKb} 
                    onClose={() => setSelectedKb(null)} 
                    onUpdate={handleUpdateKb} 
                    onDeleteAttachment={deleteAttachment}
                    onUpload={handleFileSelect}
                    onPaste={(kbId: string) => setPastingKbId(kbId)}
                    onStartEditing={startEditing}
                    editingAttachment={editingAttachment}
                    editContent={editContent}
                    setEditContent={setEditContent}
                    saveEdit={saveEdit}
                    setEditingAttachment={setEditingAttachment}
                    saving={saving}
                    loadingContent={loadingContent}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Paste Markdown Modal */}
            {pastingKbId && (
              <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                >
                  <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-lg font-light text-white">Paste Markdown Content</h3>
                    <button onClick={() => setPastingKbId(null)} className="text-white/50 hover:text-white">
                      <Close />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    <GlassInput 
                      label="Document Title" 
                      placeholder="e.g. Product Specs" 
                      value={pastedTitle}
                      onChange={(e) => setPastedTitle(e.target.value)}
                    />
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">
                        Markdown Content
                      </label>
                      <textarea
                        className="w-full h-64 rounded-xl border border-white/10 bg-black/20 px-4 py-3 text-white placeholder:text-white/30 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 backdrop-blur-sm transition-all font-mono text-sm resize-none"
                        placeholder="# Enter your markdown here..."
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-4">
                    <GlassButton variant="secondary" onClick={() => setPastingKbId(null)}>
                      Cancel
                    </GlassButton>
                    <GlassButton 
                      onClick={handlePasteSubmit}
                      disabled={!pastedText.trim() || uploadingId !== null}
                    >
                      {uploadingId ? 'Processing...' : 'Save to Knowledge Base'}
                    </GlassButton>
                  </div>
                </motion.div>
              </div>
            )}

            {/* Tutorial Modal */}
            <AnimatePresence>
              {isTutorialOpen && (
                <div className="fixed inset-0 z-80 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
                  >
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                      <h3 className="text-lg font-light text-white">How it Works</h3>
                      <button onClick={() => setIsTutorialOpen(false)} className="text-white/50 hover:text-white">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-4 text-white/70 text-sm leading-relaxed">
                      <p><strong>Projects</strong> help you organize your work. You can create different projects for different tasks or clients. Projects are <strong>re-usable</strong> across different agents.</p>
                      <p><strong>Knowledge Bases</strong> are where you store your documents. You can upload files or paste markdown content into a Knowledge Base, which your agent can then use to answer your questions. Knowledge Bases are also <strong>re-usable</strong> and can be linked to multiple projects.</p>
                      <p>To get started, create a project, then create a Knowledge Base and add your documents to it.</p>
                    </div>
                    <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end">
                      <GlassButton onClick={() => setIsTutorialOpen(false)}>Got it</GlassButton>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            {/* Novel Editor Modal */}
            <AnimatePresence>
              {editingAttachment && (
                  <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
                      <motion.div
                          initial={{ opacity: 0, y: 50, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 50, scale: 0.9 }}
                          className="w-full max-w-5xl h-[85vh] bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
                      >
                          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                              <div className="flex items-center gap-4">
                                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                      <EditNote className="text-emerald-400" />
                                  </div>
                                  <div>
                                      <h3 className="text-xl font-medium text-white">{editingAttachment.file_name}</h3>
                                      <p className="text-xs text-white/40 uppercase tracking-widest">Editing Document</p>
                                  </div>
                              </div>
                              <div className="flex items-center gap-3">
                                  <GlassButton 
                                      variant="secondary" 
                                      onClick={() => setEditingAttachment(null)}
                                      className="h-10"
                                  >
                                      Discard
                                  </GlassButton>
                                  <GlassButton 
                                      onClick={saveEdit}
                                      disabled={saving}
                                      className="h-10 gap-2"
                                  >
                                      <Save fontSize="small" />
                                      {saving ? 'Saving...' : 'Save Changes'}
                                  </GlassButton>
                              </div>
                          </div>
                          
                          <div className="flex-1 overflow-y-auto bg-black/20 custom-scrollbar">
                              <div className="max-w-4xl mx-auto py-12 px-6">
                                  {loadingContent ? (
                                      <div className="flex flex-col items-center justify-center h-64 space-y-4">
                                          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                          <p className="text-white/40 text-xs uppercase tracking-widest animate-pulse">Retrieving Document...</p>
                                      </div>
                                  ) : (
                                      <NovelEditor 
                                          initialContent={editContent} 
                                          onChange={setEditContent} 
                                      />
                                  )}
                              </div>
                          </div>
                      </motion.div>
                  </div>
              )}
            </AnimatePresence>
            {loading && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
