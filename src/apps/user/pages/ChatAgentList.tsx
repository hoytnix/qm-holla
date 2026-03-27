import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { GlassCard } from '@/components/ui/GlassCard';
import { Link } from 'react-router-dom';
import { LogOut, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import md5 from 'md5';

interface Agent {
  id: string;
  name: string;
  description?: string;
  branding_config: {
    primary_color?: string;
    primary_font_color?: string;
    font_family?: string;
    background_color?: string;
    app_icon?: string;
  };
}

export default function ChatAgentList() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const { session, signOut } = useAuth();

  const gravatarUrl = session?.user?.email 
    ? `https://www.gravatar.com/avatar/${md5(session.user.email.toLowerCase().trim())}?d=mp`
    : null;

  useEffect(() => {
    fetchAgents();
  }, []);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, name, description, branding_config')
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
      <div className="absolute top-8 right-8 flex items-center gap-4">
        {gravatarUrl && (
          <Link to="/settings" className="flex items-center">
            <img 
              src={gravatarUrl} 
              alt="Profile" 
              className="w-8 h-8 rounded-full border border-white/10 hover:border-white/30 transition-colors"
              referrerPolicy="no-referrer"
            />
          </Link>
        )}
        <button 
          onClick={signOut}
          className="text-white/60 hover:text-white transition-colors"
          title="Logout"
        >
          <LogOut size={24} />
        </button>
      </div>
      <h1 className="text-4xl font-light tracking-tight mb-8">Available Agents</h1>
      {loading ? (
        <div className="text-white/30">Loading agents...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {agents.map((agent) => (
            <GlassCard 
              key={agent.id} 
              className="p-6 flex flex-col gap-4 border-white/10"
              style={{ 
                backgroundColor: agent.branding_config.background_color || 'rgba(255, 255, 255, 0.05)',
                fontFamily: agent.branding_config.font_family || 'inherit',
                color: agent.branding_config.primary_font_color || '#fff'
              }}
            >
              <div className="flex items-center gap-4">
                {agent.branding_config.app_icon && (
                  <img src={agent.branding_config.app_icon} alt={agent.name} className="w-12 h-12 rounded-xl object-cover" />
                )}
                <h2 className="text-xl font-medium">{agent.name}</h2>
              </div>
              <p className="text-white/60 text-sm flex-1">{agent.description || 'No description available.'}</p>
              <Link 
                to={`/chat/${agent.id}`}
                className="inline-block px-4 py-2 rounded-lg transition-colors text-center font-medium"
                style={{ 
                  backgroundColor: agent.branding_config.primary_color || '#6366f1',
                  color: agent.branding_config.primary_font_color || '#fff'
                }}
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
