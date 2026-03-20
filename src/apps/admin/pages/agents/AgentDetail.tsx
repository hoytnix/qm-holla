import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import SchemaBuilder from '@/apps/admin/components/SchemaBuilder';
import NovelEditor from '@/apps/admin/components/NovelEditor';
import KnowledgeTab from '@/apps/admin/components/agent-tabs/KnowledgeTab';
import ModelConfigTab from '@/apps/admin/components/agent-tabs/ModelConfigTab';
import BrandingTab from '@/apps/admin/components/agent-tabs/BrandingTab';
import { MessageSquare, Globe, EyeOff, Trash2, Save, Link as LinkIcon } from 'lucide-react';

export default function AgentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchAgent();
  }, [id]);

  const fetchAgent = async () => {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) console.error('Error fetching agent:', error);
    else setAgent(data);
    setLoading(false);
  };

  const updateAgent = async (updates: any) => {
    console.log('Updating agent with:', updates);
    const { error } = await supabase
      .from('agents')
      .update(updates)
      .eq('id', id);
    
    if (error) {
        console.error('Error updating agent:', error);
    } else {
        console.log('Agent updated successfully');
        setToast('Changes saved successfully');
        fetchAgent();
    }
  };

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const deleteAgent = async () => {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting agent:', error);
    } else {
      navigate('/agents');
    }
  };

  if (loading) return <div className="text-white/50">Loading Anvil...</div>;
  if (!agent) return <div className="text-red-400">Agent not found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'knowledge', label: 'Knowledge' },
    { id: 'model', label: 'Models' },
    { id: 'branding', label: 'Branding' },
    { id: 'schema', label: 'Forms' },
  ];

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-white text-black px-6 py-3 rounded-xl shadow-2xl z-50 font-medium"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {isDeleteModalOpen && (
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
                <p className="text-white/60 text-sm">Are you sure you want to delete <span className="font-semibold text-white">{agent.name}</span>? This action cannot be undone.</p>
              </div>
              <div className="flex gap-4 justify-end">
                <GlassButton variant="primary" onClick={() => setIsDeleteModalOpen(false)}>Cancel</GlassButton>
                <GlassButton variant="danger" onClick={deleteAgent}>Delete Agent</GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-light text-white uppercase tracking-tight">
            {agent.name}
          </h1>
          <p className="text-white/40 text-sm font-mono mt-1">
            {agent.id}
          </p>
        </div>
        <div className="flex gap-4">
           <Link to={`/chat/${agent.id}`}>
             <GlassButton title="Open Chat">
               <MessageSquare size={16} />
             </GlassButton>
           </Link>
           <GlassButton 
             onClick={() => {
               const url = `${window.location.origin}/chat/${agent.id}`;
               navigator.clipboard.writeText(url);
               setToast('Permalink copied to clipboard');
             }}
             title="Copy Permalink"
           >
             <LinkIcon size={16} />
           </GlassButton>
           <GlassButton 
             variant={agent.is_published ? 'danger' : 'primary'}
             onClick={() => updateAgent({ is_published: !agent.is_published })}
             title={agent.is_published ? 'Unpublish' : 'Publish Agent'}
           >
             {agent.is_published ? <EyeOff size={16} /> : <Globe size={16} />}
           </GlassButton>
           <GlassButton 
             variant="danger"
             onClick={() => setIsDeleteModalOpen(true)}
             title="Delete Agent"
           >
             <Trash2 size={16} />
           </GlassButton>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-6 py-4 text-sm uppercase tracking-wider transition-colors relative ${
              activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-white"
              />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {activeTab === 'overview' && (
          <GlassCard className="p-6 space-y-6">
            <GlassInput
              label="Agent Name"
              value={agent.name}
              onChange={(e) => setAgent({ ...agent, name: e.target.value })}
              onBlur={() => updateAgent({ name: agent.name })}
            />
            {/* System Prompt Editor (Novel) */}
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">System Prompt Template</label>
                    <GlassButton 
                        onClick={() => updateAgent({ system_prompt_template: agent.system_prompt_template })}
                        className="text-xs"
                        title="Save Prompt"
                    >
                        <Save size={16} />
                    </GlassButton>
                </div>
                <NovelEditor
                    initialValue={agent.system_prompt_template || ''}
                    onChange={(val) => setAgent({...agent, system_prompt_template: val})}
                    className="min-h-[400px]"
                />
            </div>
          </GlassCard>
        )}

        {activeTab === 'schema' && (
          <SchemaBuilder agentId={agent.id} />
        )}

        {activeTab === 'knowledge' && (
          <KnowledgeTab agent={agent} updateAgent={updateAgent} />
        )}

        {activeTab === 'model' && (
          <ModelConfigTab agent={agent} updateAgent={updateAgent} />
        )}

        {activeTab === 'branding' && (
          <BrandingTab agent={agent} updateAgent={updateAgent} />
        )}
      </div>
    </div>
  );
}
