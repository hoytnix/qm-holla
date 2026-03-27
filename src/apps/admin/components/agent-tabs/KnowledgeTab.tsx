import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Link } from 'react-router-dom';
import { LibraryBooks, EditNote, Close } from '@mui/icons-material';
import { GlassInput } from '@/components/ui/GlassInput';
import { motion } from 'framer-motion';

export default function KnowledgeTab({ agent, updateAgent }: { agent: any, updateAgent: (updates: any) => void }) {
  const [kbs, setKbs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKbIds, setSelectedKbIds] = useState<string[]>(agent.branding_config?.kb_ids || (agent.branding_config?.kb_id ? [agent.branding_config.kb_id] : []));
  const [pastingKbId, setPastingKbId] = useState<string | null>(null);
  const [pastedText, setPastedText] = useState('');
  const [pastedTitle, setPastedTitle] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchKbs();
  }, []);

  const fetchKbs = async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('user_kbs')
      .select('*, kb_attachments(*)')
      .eq('user_id', userData.user.id);
    if (error) console.error('Error fetching KBs:', error);
    else setKbs(data || []);
    setLoading(false);
  };

  const toggleKbForAgent = (kbId: string) => {
    const newIds = selectedKbIds.includes(kbId)
      ? selectedKbIds.filter(id => id !== kbId)
      : [...selectedKbIds, kbId];
    
    setSelectedKbIds(newIds);
    updateAgent({
        branding_config: {
            ...agent.branding_config,
            kb_ids: newIds,
            kb_id: newIds[0] || null // Keep legacy support for now
        }
    });
  };

  const clearKbsForAgent = () => {
    setSelectedKbIds([]);
    updateAgent({
        branding_config: {
            ...agent.branding_config,
            kb_ids: [],
            kb_id: null
        }
    });
  };

  const handlePasteSubmit = async () => {
    if (!pastingKbId || !pastedText.trim()) return;
    
    setProcessing(true);
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setProcessing(false);
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
      setProcessing(false);
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
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-light">Knowledge Bases</h3>
            <p className="text-xs text-white/50 mt-1">Select a knowledge base for this agent to use.</p>
          </div>
          <Link to="/knowledge">
            <GlassButton variant="secondary" className="text-xs flex items-center gap-2">
              <LibraryBooks fontSize="small" />
              Manage Library
            </GlassButton>
          </Link>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8 text-white/50 animate-pulse text-sm">
              Loading Knowledge Bases...
            </div>
          ) : kbs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-white/5">
              <p className="text-white/50 text-sm mb-4">No Knowledge Bases found.</p>
              <Link to="/knowledge">
                <GlassButton>Create Knowledge Base</GlassButton>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4">
              <div 
                className={`p-4 rounded-xl border transition-colors cursor-pointer ${selectedKbIds.length === 0 ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                onClick={clearKbsForAgent}
              >
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">None</h4>
                  {selectedKbIds.length === 0 && <span className="text-xs text-green-400 uppercase tracking-wider">Active</span>}
                </div>
              </div>
              
              {kbs.map((kb) => (
                <div 
                  key={kb.id} 
                  className={`p-4 rounded-xl border transition-colors cursor-pointer ${selectedKbIds.includes(kb.id) ? 'border-green-500/50 bg-green-500/10' : 'border-white/10 bg-white/5 hover:bg-white/10'}`}
                  onClick={() => toggleKbForAgent(kb.id)}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-medium">{kb.name}</h4>
                      <p className="text-xs text-white/50">{kb.kb_attachments?.length || 0} documents</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPastingKbId(kb.id);
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                        title="Paste Markdown"
                      >
                        <EditNote fontSize="small" />
                      </button>
                      {selectedKbIds.includes(kb.id) && <span className="text-xs text-green-400 uppercase tracking-wider">Active</span>}
                    </div>
                  </div>
                  
                  {kb.kb_attachments && kb.kb_attachments.length > 0 && (
                    <div className="space-y-1 pl-4 border-l border-white/10 mt-3">
                        {kb.kb_attachments.slice(0, 3).map((att: any) => (
                            <div key={att.id} className="text-xs text-white/70 flex items-center gap-2 truncate">
                                <span className="opacity-50">📄</span>
                                <span className="truncate">{att.file_name}</span>
                            </div>
                        ))}
                        {kb.kb_attachments.length > 3 && (
                          <div className="text-xs text-white/40 pl-6">
                            + {kb.kb_attachments.length - 3} more...
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
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
                disabled={!pastedText.trim() || processing}
              >
                {processing ? 'Processing...' : 'Save to Knowledge Base'}
              </GlassButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
