import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { motion, AnimatePresence } from 'framer-motion';
import { LibraryBooks, Delete, UploadFile, EditNote, Close, Save, Edit } from '@mui/icons-material';
import NovelEditor from '@/components/ui/NovelEditor';

export default function KnowledgeList() {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKbName, setNewKbName] = useState('');
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [pastingKbId, setPastingKbId] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  
  // Editing state
  const [editingAttachment, setEditingAttachment] = useState<any>(null);
  const [editContent, setEditContent] = useState<any>(null);
  const [loadingContent, setLoadingContent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchKbs();
  }, []);

  const fetchKbs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('user_kbs')
      .select('*, kb_attachments(*)');
    if (error) console.error('Error fetching KBs:', error);
    else setKbs(data || []);
    setLoading(false);
  };

  const createKb = async () => {
    if (!newKbName.trim()) return;
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    // We need a project_id. Let's create a default project if none exists or just pick the first one.
    const { data: projects } = await supabase.from('projects').select('id').limit(1);
    let projectId = projects?.[0]?.id;

    if (!projectId) {
        const { data: newProject } = await supabase.from('projects').insert({ name: 'Default Project', user_id: user.user.id }).select().single();
        projectId = newProject?.id;
    }

    if (!projectId) {
        console.error('Failed to get or create project ID');
        return;
    }

    const { data, error } = await supabase
      .from('user_kbs')
      .insert({ name: newKbName.trim(), user_id: user.user.id, project_id: projectId })
      .select()
      .single();

    if (error) console.error('Error creating KB:', error);
    else {
      setKbs([...kbs, { ...data, kb_attachments: [] }]);
      setNewKbName('');
    }
  };

  const deleteKb = async (id: string) => {
    if (!confirm('Are you sure you want to delete this Knowledge Base?')) return;
    const { error } = await supabase.from('user_kbs').delete().eq('id', id);
    if (error) console.error('Error deleting KB:', error);
    else fetchKbs();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, kbId: string) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingId(kbId);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setUploadingId(null);
      return;
    }

    const file = e.target.files[0];
    const filePath = `${userData.user.id}/${kbId}/${Date.now()}_${file.name}`;

    // Upload to storage
    const { error: uploadError } = await supabase.storage
      .from('kb_attachments')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      alert('Failed to upload file. Make sure "kb_attachments" bucket exists and you have permission.');
      setUploadingId(null);
      return;
    }

    // Call ingest function
    console.log('Invoking ingest function for file:', filePath);
    const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest', {
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
      console.log('Ingest successful:', ingestData);
      fetchKbs(); // Refresh to show new attachment
    }
    setUploadingId(null);
  };

  const handlePasteSubmit = async () => {
    if (!pastingKbId || !pastedText.trim()) return;
    
    setUploadingId(pastingKbId);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setUploadingId(null);
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
      alert('Failed to save text. Check storage bucket "kb_attachments".');
      setUploadingId(null);
      return;
    }

    // Call ingest function
    console.log('Invoking ingest function for KB:', pastingKbId);
    const { data: ingestData, error: ingestError } = await supabase.functions.invoke('ingest', {
      body: { filePaths: [filePath], kbId: pastingKbId }
    });

    if (ingestError) {
      console.error('Ingest error details:', ingestError);
      // Check if it's a 401 or network error
      if (ingestError.message?.includes('401') || ingestError.status === 401) {
        alert('Authentication Error (401): The Supabase gateway rejected the request. Please ensure "Enforce JWT" is DISABLED for the "ingest" function in your Supabase dashboard.');
      } else {
        alert(`Failed to ingest text: ${ingestError.message}`);
      }
    } else {
      console.log('Ingest successful:', ingestData);
      fetchKbs();
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
    else fetchKbs();
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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight mb-2">The Library</h1>
          <p className="text-white/50 text-sm tracking-wide">
            Manage reusable knowledge bases for your agents.
          </p>
        </div>
      </div>

      <GlassCard className="p-6">
        <div className="flex gap-4 items-end mb-8">
          <div className="flex-1">
            <GlassInput
              label="New Knowledge Base"
              placeholder="Enter name..."
              value={newKbName}
              onChange={(e) => setNewKbName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createKb()}
            />
          </div>
          <GlassButton onClick={createKb} className="h-[42px]">
            Create
          </GlassButton>
        </div>

        {loading ? (
          <div className="text-center py-12 text-white/50 animate-pulse">
            Loading Library...
          </div>
        ) : kbs.length === 0 ? (
          <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl bg-white/5">
            <LibraryBooks className="text-6xl text-white/20 mb-4" />
            <h3 className="text-xl font-light mb-2">No Knowledge Bases</h3>
            <p className="text-white/50 text-sm">Create your first knowledge base above.</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {kbs.map((kb) => (
              <div key={kb.id || `kb-${Math.random()}`} className="p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-medium mb-1">{kb.name}</h3>
                    <p className="text-xs text-white/50 uppercase tracking-widest">
                      {kb.kb_attachments?.length || 0} Documents
                    </p>
                  </div>
                    <div className="flex items-center gap-3">
                    <button
                      onClick={() => setPastingKbId(kb.id)}
                      className="px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors border border-white/10 flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white h-8"
                      title="Paste Markdown"
                    >
                      <EditNote fontSize="small" />
                      Paste
                    </button>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => handleFileSelect(e, kb.id)}
                        disabled={uploadingId === kb.id}
                      />
                      <span className={`px-4 py-2 rounded-lg text-xs font-medium uppercase tracking-wider transition-colors border border-white/10 flex items-center gap-2 ${uploadingId === kb.id ? 'bg-white/10 text-white/30' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                        <UploadFile fontSize="small" />
                        {uploadingId === kb.id ? 'Uploading...' : 'Upload Doc'}
                      </span>
                    </label>
                    <button
                      onClick={() => deleteKb(kb.id)}
                      className="p-2 rounded-lg hover:bg-red-500/20 text-red-400/50 hover:text-red-400 transition-colors"
                      title="Delete Knowledge Base"
                    >
                      <Delete fontSize="small" />
                    </button>
                  </div>
                </div>

                {kb.kb_attachments && kb.kb_attachments.length > 0 ? (
                  <div className="space-y-2 pl-4 border-l-2 border-white/10">
                    {kb.kb_attachments.map((att: any) => (
                      <div key={att.id || `att-${Math.random()}`} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-white/5 group transition-colors">
                        <div className="text-sm text-white/70 flex items-center gap-3">
                          <span className="opacity-50 text-lg">📄</span>
                          <span className="font-mono text-xs">{att.file_name}</span>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                          {(att.file_name.endsWith('.md') || att.file_name.endsWith('.txt')) && (
                            <button
                              onClick={() => startEditing(att)}
                              className="p-1 text-white/50 hover:text-white transition-colors"
                              title="Edit Document"
                            >
                              <Edit fontSize="small" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteAttachment(att.id)}
                            className="p-1 text-red-400/50 hover:text-red-400 transition-colors"
                            title="Delete Document"
                          >
                            <Delete fontSize="small" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-white/30 italic pl-4 border-l-2 border-white/10 py-2">
                    No documents uploaded yet.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Paste Markdown Modal */}
      {pastingKbId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
              <h3 className="text-lg font-light">Paste Markdown Content</h3>
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

      {/* Novel Editor Modal */}
      <AnimatePresence>
        {editingAttachment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
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
    </motion.div>
  );
}
