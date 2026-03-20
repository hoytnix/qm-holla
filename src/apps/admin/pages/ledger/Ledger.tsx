import React, { useEffect, useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { supabase } from '@/lib/supabase';
import { History, AttachMoney } from '@mui/icons-material';

interface LedgerEntry {
  id: string;
  user_id: string;
  email: string;
  amount: number;
  description: string;
  created_at: string;
}

export default function Ledger() {
  const [transactions, setTransactions] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async () => {
    try {
      const { data, error } = await supabase.rpc('get_ledger_with_emails');
        
      if (error) throw error;
      if (data) setTransactions(data as any);
    } catch (error) {
      console.error('Error fetching ledger:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-light tracking-tight text-white uppercase">
            Global Ledger
          </h1>
          <p className="text-white/40 mt-2 font-light">
            View all credit transactions across the platform.
          </p>
        </div>
      </div>

      <section className="space-y-6">
        <GlassCard className="overflow-hidden p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/5 text-white/50 uppercase text-xs tracking-wider">
              <tr>
                <th className="p-4 font-medium">User</th>
                <th className="p-4 font-medium">Description</th>
                <th className="p-4 font-medium text-right">Amount</th>
                <th className="p-4 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/30">Loading ledger...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-white/30">No transactions found</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white/60 font-mono text-xs">
                      <div>{tx.email}</div>
                      <div className="text-[10px] text-white/30">{tx.user_id}</div>
                    </td>
                    <td className="p-4 text-white/80">{tx.description}</td>
                    <td className={`p-4 text-right font-mono ${tx.amount < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </td>
                    <td className="p-4 text-right text-white/40 font-mono">
                      {new Date(tx.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </GlassCard>
      </section>
    </div>
  );
}
