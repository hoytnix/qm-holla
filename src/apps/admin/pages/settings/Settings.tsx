import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassInput } from '@/components/ui/GlassInput';
import { GlassButton } from '@/components/ui/GlassButton';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Person } from '@mui/icons-material';
import md5 from 'md5';

export default function Settings() {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.user?.email) {
      setEmail(session.user.email);
    }
  }, [session]);

  const handleUpdateProfile = async () => {
    setLoading(true);
    console.log('Update profile clicked');
    // Placeholder for profile update logic
    await new Promise(resolve => setTimeout(resolve, 1000));
    alert('Profile updated (simulation)');
    setLoading(false);
  };

  const handlePasswordReset = async () => {
    console.log('Reset password clicked');
    if (!email) return;
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) alert('Error sending reset email: ' + error.message);
    else alert('Password reset email sent to ' + email);
  };

  const handleLogout = async () => {
    console.log('Logout clicked');
    await signOut();
    navigate('/login');
  };

  const gravatarUrl = email 
    ? `https://www.gravatar.com/avatar/${md5(email.trim().toLowerCase())}?d=mp`
    : '';

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-light tracking-tight text-white uppercase">
        Settings
      </h1>

      <div className="max-w-2xl">
        {/* Profile Section */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2 text-xl font-light text-white/80 uppercase tracking-wide">
            <Person className="text-white/50" /> Profile
          </h2>
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center border border-white/10 overflow-hidden">
                {gravatarUrl ? (
                  <img src={gravatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <Person fontSize="large" className="text-white/30" />
                )}
              </div>
              <div className="text-sm text-white/50">
                Profile picture is managed via <a href="https://en.gravatar.com/" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">Gravatar</a>
              </div>
            </div>
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
            
            <div className="pt-4 border-t border-white/10 space-y-4">
              <h3 className="text-sm font-medium text-white mb-2">Account Actions</h3>
              <div className="flex gap-4">
                <GlassButton variant="secondary" onClick={handlePasswordReset}>
                  Reset Password
                </GlassButton>
                <GlassButton variant="secondary" onClick={handleLogout} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                  Logout
                </GlassButton>
              </div>
            </div>

            <GlassButton onClick={handleUpdateProfile} disabled={loading}>
              {loading ? 'Updating...' : 'Save Changes'}
            </GlassButton>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
