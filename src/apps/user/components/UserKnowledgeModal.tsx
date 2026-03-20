import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Upload, Trash2, FileText, X, AlertCircle, Edit3, Save, Type } from 'lucide-react';
import NovelEditor from '@/components/ui/NovelEditor';

interface Project {
  id: string;
  name: string;
  title?: string;
}

interface UserKnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
}

export function UserKnowledgeModal({ isOpen, onClose, currentProject }: UserKnowledgeModalProps) {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [kbName, setKbName] = useState('');

  // Paste & Edit State
  const [pastingKbId, setPastingKbId] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [editingAttachment, setEditingAttachment] = useState<any>(null);
  const [editContent, setEditContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && currentProject) {
      fetchKbs();
    }
  }, [isOpen, currentProject]);

  const fetchKbs = async () => {
    if (!currentProject) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('user_kbs')
      .select('*, kb_attachments(*)')
      .eq('project_id', currentProject.id)
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching KBs:', error);
    else setKbs(data || []);
    setLoading(false);
  };

  const createKb = async () => {
    if (!kbName.trim() || !currentProject) return;
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('user_kbs')
      .insert({
        name: kbName.trim(),
        project_id: currentProject.id,
        user_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating KB:', error);
      alert('Failed to create Knowledge Base');
    } else {
      setKbs([data, ...kbs]);
      setKbName('');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, kbId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const file = e.target.files[0];
    const filePath = `${user.id}/${kbId}/${Date.now()}_${file.name}`;

    // Upload
    const { error: uploadError } = await supabase.storage
      .from('kb_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      alert('Failed to upload file');
      setUploading(false);
      return;
    }

    // Ingest
    const { error: ingestError } = await supabase.functions.invoke('ingest', {
      body: { filePaths: [filePath], kbId }
    });

    if (ingestError) {
      console.error('Ingest error:', ingestError);
      alert('File uploaded but failed to process embeddings.');
    } else {
      fetchKbs();
    }
    setUploading(false);
  };

  const handlePasteSubmit = async () => {
    if (!pastingKbId || !pastedText.trim()) return;
    
    setUploading(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setUploading(false);
      return;
    }

    const title = pastedTitle.trim() || `Pasted Text ${new Date().toLocaleString()}`;
    const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
    const filePath = `${userData.user.id}/${pastingKbId}/${Date.now()}_${fileName}`;
    
    const blob = new Blob([pastedText], { type: 'text/markdown' });
    const file = new File([blob], fileName, { type: 'text/markdown' });

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('kb_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading pasted text:', uploadError);
      alert('Failed to save text.');
      setUploading(false);
      return;
    }

    // Call ingest function
    const { error: ingestError } = await supabase.functions.invoke('ingest', {
      body: { filePaths: [filePath], kbId: pastingKbId }
    });

    if (ingestError) {
      console.error('Ingest error:', ingestError);
      alert(`Failed to ingest text: ${ingestError.message}`);
    } else {
      fetchKbs();
      setPastingKbId(null);
      setPastedText('');
      setPastedTitle('');
    }
    setUploading(false);
  };

  const startEditing = async (attachment: any) => {
    const isEditable = attachment.file_name.endsWith('.md') || attachment.file_name.endsWith('.txt');
    if (!isEditable) {
        alert('Only .md and .txt files can be edited currently.');
        return;
    }

    setEditingAttachment(attachment);
    setLoadingContent(true);
    
    // Fetch content from storage
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
    // Simple conversion to Novel JSON format
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
        // Extract text from Novel JSON (simplified)
        const extractText = (node: any): string => {
            if (node.type === 'text') return node.text;
            if (node.content) return node.content.map(extractText).join('\n');
            return '';
        };
        
        const text = extractText(editContent);
        const blob = new Blob([text], { type: editingAttachment.file_name.endsWith('.md') ? 'text/markdown' : 'text/plain' });
        const file = new File([blob], editingAttachment.file_name);

        // Upload (overwrite)
        const { error: uploadError } = await supabase.storage
            .from('kb_attachments')
            .upload(editingAttachment.file_path, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Re-ingest
        const { error: ingestError } = await supabase.functions.invoke('ingest', {
            body: { filePaths: [editingAttachment.file_path], kbId: editingAttachment.kb_id }
        });

        if (ingestError) throw ingestError;

        setEditingAttachment(null);
        fetchKbs();
    } catch (error: any) {
        console.error('Error saving edit:', error);
        alert(`Failed to save changes: ${error.message}`);
    } finally {
        setSaving(false);
    }
  };

  const deleteKb = async (id: string) => {
    if (!confirm('Delete this Knowledge Base and all its files?')) return;
    const { error } = await supabase.from('user_kbs').delete().eq('id', id);
    if (!error) fetchKbs();
  };

  const deleteAttachment = async (id: string) => {
    if (!confirm('Remove this file?')) return;
    const { error } = await supabase.from('kb_attachments').delete().eq('id', id);
    if (!error) fetchKbs();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <div>
                <h2 className="text-xl font-light text-white">Knowledge Bases</h2>
                <p className="text-xs text-white/40 uppercase tracking-wider">
                  {currentProject ? `Project: ${currentProject.title || currentProject.name}` : 'No Project Selected'}
                </p>
              </div>
              <button onClick={onClose} className="text-white/50 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {!currentProject ? (
                <div className="h-64 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                  <AlertCircle size={48} className="text-yellow-500/50" />
                  <p className="text-white/70">Please select a Project first to manage its Knowledge Bases.</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Create New */}
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <GlassInput
                        label="New Knowledge Base"
                        placeholder="e.g. Q4 Reports"
                        value={kbName}
                        onChange={(e) => setKbName(e.target.value)}
                      />
                    </div>
                    <GlassButton onClick={createKb} disabled={!kbName.trim()} className="h-[42px]">
                      Create
                    </GlassButton>
                  </div>

                  {/* List */}
                  {loading ? (
                    <div className="text-center py-8 text-white/30 animate-pulse">Loading...</div>
                  ) : kbs.length === 0 ? (
                    <div className="text-center py-12 border border-dashed border-white/10 rounded-xl bg-white/5">
                      <p className="text-white/30 text-sm">No Knowledge Bases in this project.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {kbs.map(kb => (
                        <div key={kb.id || `kb-${Math.random()}`} className="p-4 rounded-xl border border-white/10 bg-white/5">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="font-medium text-white">{kb.name}</h3>
                              <p className="text-xs text-white/40">{kb.kb_attachments?.length || 0} files</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setPastingKbId(kb.id)}
                                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-2"
                                title="Paste Markdown"
                              >
                                <Type size={14} />
                                <span className="text-xs uppercase tracking-wider">Paste</span>
                              </button>
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, kb.id)}
                                  disabled={uploading}
                                />
                                <div className={`p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                  <Upload size={14} />
                                  <span className="text-xs uppercase tracking-wider">Upload</span>
                                </div>
                              </label>
                              <button
                                onClick={() => deleteKb(kb.id)}
                                className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Attachments */}
                          {kb.kb_attachments && kb.kb_attachments.length > 0 && (
                            <div className="space-y-2 pl-3 border-l border-white/10">
                              {kb.kb_attachments.map((att: any) => (
                                <div key={att.id || `att-${Math.random()}`} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white/5 group">
                                  <div className="flex items-center gap-2 overflow-hidden">
                                    <FileText size={12} className="text-white/40 flex-shrink-0" />
                                    <span className="text-xs text-white/70 truncate">{att.file_name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(att.file_name.endsWith('.md') || att.file_name.endsWith('.txt')) && (
                                      <button
                                        onClick={() => startEditing(att)}
                                        className="text-white/50 hover:text-white transition-colors"
                                      >
                                        <Edit3 size={12} />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => deleteAttachment(att.id)}
                                      className="text-red-400/50 hover:text-red-400 transition-opacity"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Paste Markdown Modal */}
      <AnimatePresence>
        {pastingKbId && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <h3 className="text-lg font-light text-white">Paste Markdown Content</h3>
                <button onClick={() => setPastingKbId(null)} className="text-white/50 hover:text-white">
                  <X size={20} />
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
                  disabled={!pastedText.trim() || uploading}
                >
                  {uploading ? 'Processing...' : 'Save to Knowledge Base'}
                </GlassButton>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Novel Editor Modal */}
      <AnimatePresence>
        {editingAttachment && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.9 }}
              className="w-full max-w-5xl h-[85vh] bg-zinc-900 border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                    <Edit3 className="text-emerald-400" />
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
                    <Save size={16} />
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
    </AnimatePresence>
  );
}
