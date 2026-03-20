import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Person, Security, VpnKey } from '@mui/icons-material';

export default function Settings() {
  const { session } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    // Placeholder for profile update logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Profile updated (simulation)');
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert('Error sending reset email: ' + error.message);
    else alert('Password reset email sent to ' + email);
  };

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-light tracking-tight text-white uppercase">
        Settings
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Profile Section */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-light text-white/80 uppercase tracking-wide">
            <Person className="text-white/50" /> Profile
          </h2>
          <GlassCard className="p-6 space-y-6">
            <GlassInput
              label="Email Address"
              value={email}
              disabled
              className="opacity-50 cursor-not-allowed"
            />
            <GlassInput
              label="Display Name"
              placeholder="Enter your name"
              defaultValue="Admin User"
            />
            <GlassButton onClick={handleUpdateProfile} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </GlassButton>
          </GlassCard>
        </div>

        {/* Security Section */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-light text-white/80 uppercase tracking-wide">
            <Security className="text-white/50" /> Security
          </h2>
          <GlassCard className="p-6 space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-medium text-white/70 uppercase tracking-wider ml-1">
                API Keys
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-black/40 border border-white/10 font-mono text-sm text-white/60">
                <VpnKey fontSize="small" />
                <span>sk_live_...4x92</span>
                <span className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Active</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-sm font-medium text-white mb-2">Password</h3>
              <p className="text-xs text-white/40 mb-4">
                Send a password reset link to your email address.
              </p>
              <GlassButton variant="secondary" onClick={handlePasswordReset}>
                Reset Password
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
