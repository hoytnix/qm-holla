import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AdminMenu } from '@/components/AdminMenu';
import { Menu, X as Close, Plus as Add } from 'lucide-react';
import { GlassButton } from '@/components/ui/GlassButton';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function SanctuaryLayout() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isAgentsPage = location.pathname === '/agents';

  const createAgent = async () => {
    const { data, error } = await supabase
      .from('agents')
      .insert([{ name: 'New Agent', is_published: false }])
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
    } else if (data) {
      // Dispatch event to notify AgentList to refresh
      window.dispatchEvent(new CustomEvent('agent-created', { detail: data }));
      // Optionally navigate to the new agent
      navigate(`/agents/${data.id}`);
    }
  };

  // Prevent body scroll when menu is open
  React.useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMenuOpen]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white font-sans selection:bg-white/20">
      {/* The Trigger */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-4">
        <AnimatePresence>
          {isAgentsPage && !isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.8 }}
            >
                <GlassButton
                onClick={createAgent}
                className="rounded-full w-14 h-14 border-white/20 bg-emerald-500/20 hover:bg-emerald-500/40 backdrop-blur-2xl shadow-2xl shadow-black/50 text-emerald-400"
                title="Forge New Agent"
              >
                <Add size={24} />
              </GlassButton>
            </motion.div>
          )}
        </AnimatePresence>

        <GlassButton
          variant="ghost"
          size="icon"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-full w-14 h-14 border-white/20 bg-black/60 hover:bg-white/10 backdrop-blur-2xl shadow-2xl shadow-black/50"
        >
          {isMenuOpen ? <Close size={24} /> : <Menu size={24} />}
        </GlassButton>
      </div>

      {/* The Menu Page (Overlay) */}
      <AdminMenu
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        onLogout={() => {
          signOut();
          setIsMenuOpen(false);
        }}
      />

      {/* Main Content */}
      <main className="relative z-10 min-h-screen p-8 md:p-12 lg:p-16">
        <Outlet />
      </main>
    </div>
  );
}
