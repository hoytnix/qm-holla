import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'login' | 'register';
  switchMode: () => void;
}

export function AuthModal({ isOpen, onClose, onSuccess, mode, switchMode }: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

      if (error) throw error;
      
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="w-full max-w-md"
          >
            <GlassCard className="p-8 space-y-6 border-white/20 bg-zinc-900 shadow-2xl">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-light tracking-wider text-white uppercase">
                  {mode === 'login' ? 'Access Terminal' : 'Initialize Identity'}
                </h2>
                <p className="text-white/40 text-xs tracking-wide">
                  {mode === 'login' ? 'Enter your credentials' : 'Create a new secure profile'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <GlassInput
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="user@example.com"
                />
                <GlassInput
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />

                {error && (
                  <div className="p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                    {error}
                  </div>
                )}

                <GlassButton
                  type="submit"
                  className="w-full py-3 text-sm tracking-widest uppercase"
                  disabled={loading}
                >
                  {loading ? 'Processing...' : (mode === 'login' ? 'Connect' : 'Register')}
                </GlassButton>
              </form>

              <div className="text-center">
                <button
                  onClick={switchMode}
                  className="text-xs text-white/40 hover:text-white/80 transition-colors tracking-wide uppercase"
                >
                  {mode === 'login' ? 'Need an account? Register' : 'Already have access? Login'}
                </button>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
