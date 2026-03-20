import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Add, SmartToy, Delete, ContentCopy } from '@mui/icons-material';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';

interface Agent {
  id: string;
  name: string;
  is_published: boolean;
  created_at: string;
}

export default function AgentList() {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentToDelete, setAgentToDelete] = useState<Agent | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAgents();

    const handleAgentCreated = () => {
      fetchAgents();
    };

    window.addEventListener('agent-created', handleAgentCreated);
    return () => window.removeEventListener('agent-created', handleAgentCreated);
  }, []);

  const fetchAgents = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('id, name, is_published, created_at')
      .order('created_at', { ascending: false });

    if (error) console.error('Error fetching agents:', error);
    else setAgents(data || []);
    setLoading(false);
  };

  const deleteAgent = async () => {
    if (!agentToDelete) return;
    
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', agentToDelete.id);

    if (error) {
      console.error('Error deleting agent:', error);
    } else {
      setAgents(agents.filter(a => a.id !== agentToDelete.id));
    }
    setIsDeleteModalOpen(false);
    setAgentToDelete(null);
  };

  const copyToClipboard = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const url = `${window.location.origin}/chat/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && agentToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-6"
            >
              <div className="space-y-2">
                <h2 className="text-xl font-medium text-white">Delete Agent</h2>
                <p className="text-white/60 text-sm">Are you sure you want to delete <span className="font-semibold text-white">{agentToDelete.name}</span>? This action cannot be undone.</p>
              </div>
              <div className="flex gap-4 justify-end">
                <GlassButton variant="primary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</GlassButton>
                <GlassButton variant="danger" onClick={deleteAgent}>Delete Agent</GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-light tracking-tight text-white uppercase">
          The Archive
        </h1>
      </div>

      {loading ? (
        <div className="text-white/50 animate-pulse">Loading Archive...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents.map((agent, idx) => (
            <div 
              key={agent.id || `agent-${idx}`} 
              onClick={() => navigate(`/agents/${agent.id}`)}
              className="cursor-pointer"
            >
              <GlassCard className="group h-64 p-6 flex flex-col justify-between hover:bg-white/10 transition-colors border-white/10 hover:border-white/30">
                <div className="flex justify-between items-start">
                  <div className="p-3 rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-colors">
                    <SmartToy className="text-white/70 group-hover:text-white" />
                  </div>
                  <div className="flex gap-2">
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] uppercase tracking-wider border ${
                        agent.is_published
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                          : 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400'
                      }`}
                    >
                      {agent.is_published ? 'Live' : 'Draft'}
                    </span>
                    <button
                      onClick={(e) => copyToClipboard(e, agent.id)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        copiedId === agent.id 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-white/5 text-white/40 hover:bg-emerald-500/20 hover:text-emerald-400'
                      }`}
                      title={copiedId === agent.id ? "Copied!" : "Copy Permalink"}
                    >
                      <ContentCopy sx={{ fontSize: 16 }} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setAgentToDelete(agent);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg transition-colors bg-white/5 text-white/40 hover:bg-red-500/20 hover:text-red-400"
                      title="Delete Agent"
                    >
                      <Delete sx={{ fontSize: 16 }} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-medium text-white group-hover:text-emerald-300 transition-colors">
                    {agent.name}
                  </h3>
                  <div className="flex justify-between items-end mt-2">
                    <p className="text-xs text-white/40 font-mono">
                      ID: {agent.id?.slice(0, 8)}...
                    </p>
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/chat/${agent.id}`);
                      }}
                      className="z-10"
                    >
                      <GlassButton className="text-[10px] py-1 px-3 uppercase tracking-widest h-8">
                        Chat
                      </GlassButton>
                    </div>
                  </div>
                </div>
              </GlassCard>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
