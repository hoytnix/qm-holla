import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase';
import { 
  People, 
  SmartToy, 
  Chat, 
  AttachMoney,
  TrendingUp
} from '@mui/icons-material';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalMessages: 0,
    totalCreditsSpent: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Fetch total agents
      const { count: agentsCount } = await supabase
        .from('agents')
        .select('*', { count: 'exact', head: true });

      // Fetch total messages
      const { count: messagesCount } = await supabase
        .from('chat_history')
        .select('*', { count: 'exact', head: true });

      // Fetch total credits spent (sum of negative amounts in ledger)
      // Since we can't do sum easily in client, we'll fetch all negative transactions and sum them up
      // or we can just fetch all ledger entries and sum the negative ones.
      const { data: ledger } = await supabase
        .from('credit_ledger')
        .select('amount')
        .lt('amount', 0);
        
      const totalSpent = ledger ? ledger.reduce((acc, curr) => acc + Math.abs(curr.amount), 0) : 0;

      setStats({
        totalUsers: usersCount || 0,
        totalAgents: agentsCount || 0,
        totalMessages: messagesCount || 0,
        totalCreditsSpent: totalSpent
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white uppercase">
            Solo Genius Labs
          </h1>
          <p className="text-white/40 mt-2 font-light">
            Platform overview and key metrics.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="p-6 space-y-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between text-white/60">
            <span className="text-sm uppercase tracking-wider">Total Users</span>
            <People className="text-indigo-400" />
          </div>
          <div className="text-4xl font-light text-white">
            {loading ? '...' : stats.totalUsers.toLocaleString()}
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between text-white/60">
            <span className="text-sm uppercase tracking-wider">Total Agents</span>
            <SmartToy className="text-emerald-400" />
          </div>
          <div className="text-4xl font-light text-white">
            {loading ? '...' : stats.totalAgents.toLocaleString()}
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between text-white/60">
            <span className="text-sm uppercase tracking-wider">Total Messages</span>
            <Chat className="text-blue-400" />
          </div>
          <div className="text-4xl font-light text-white">
            {loading ? '...' : stats.totalMessages.toLocaleString()}
          </div>
        </GlassCard>

        <GlassCard className="p-6 space-y-4 bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
          <div className="flex items-center justify-between text-white/60">
            <span className="text-sm uppercase tracking-wider">Credits Spent</span>
            <AttachMoney className="text-yellow-400" />
          </div>
          <div className="text-4xl font-light text-white">
            {loading ? '...' : stats.totalCreditsSpent.toLocaleString()}
          </div>
        </GlassCard>
      </div>
      
      {/* Add more charts or tables here if needed */}
    </div>
  );
}
