import React, { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      setError('Supabase is not configured. Please check your environment variables.');
      setLoading(false);
      return;
    }

    try {
      const { error } = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timed out. Please check your network.')), 15000)
        )
      ]) as any;

      if (error) {
        setError(error.message);
        setLoading(false);
      } else {
        // Assuming auto-login or redirect to login
        navigate('/login');
      }
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || 'An unexpected error occurred during registration.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 space-y-8 border-white/10 bg-white/5 backdrop-blur-3xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-light tracking-[0.2em] text-white uppercase">
              Join the Forge
            </h1>
            <p className="text-white/40 text-sm tracking-wide">
              Begin your sovereign journey
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <GlassInput
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="admin@sovereign.ai"
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
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                {error}
              </div>
            )}

            <GlassButton
              type="submit"
              className="w-full py-3 text-sm tracking-widest uppercase"
              disabled={loading}
            >
              {loading ? 'Registering...' : 'Register'}
            </GlassButton>
          </form>

          <div className="text-center">
            <Link
              to="/login"
              className="text-xs text-white/30 hover:text-white/60 transition-colors tracking-wide uppercase"
            >
              Already have access? Login
            </Link>
          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
