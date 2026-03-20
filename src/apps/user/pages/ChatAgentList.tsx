import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/auth';

interface Agent {
  id: string;
  name: string;
  branding_config: {
    description?: string;
    icon?: string;
  };
}

export default function ChatAgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, branding_config')
        .eq('is_published', true);
      
      if (error) throw error;
      if (data) setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-8 relative">
      <button 
        onClick={signOut}
        className="absolute top-8 right-8 text-white/60 hover:text-white transition-colors"
        title="Logout"
      >
        <LogOut size={24} />
      </button>
      <h1 className="text-4xl font-light tracking-tight mb-8">Available Agents</h1>
      {loading ? (
        <div className="text-white/30">Loading agents...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <GlassCard key={agent.id} className="p-6">
              <h2 className="text-xl font-medium mb-2">{agent.name}</h2>
              <p className="text-white/60 mb-4">{agent.branding_config.description || 'No description available.'}</p>
              <Link 
                to={`/chat/${agent.id}`}
                className="inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Start Chat
              </Link>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
