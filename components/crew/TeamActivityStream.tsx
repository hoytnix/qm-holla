'use client';

import { Clock } from 'lucide-react';
import { TaskRecord } from '@/lib/db/adapter';
import { AgentIcon } from '@/components/ui/AgentIcon';

interface TeamActivityItem {
  id: string;
  agent_id: string;
  agent_name: string;
  action_type: 'task' | 'research' | 'code' | 'audit' | 'campaign';
  description: string;
  timestamp: string;
  status: 'Completed' | 'In Progress' | 'Needs attention';
}

interface TeamActivityStreamProps {
  tasks?: TaskRecord[];
}

export const TeamActivityStream: React.FC<TeamActivityStreamProps> = ({ tasks = [] }) => {
  // Derive activity stream exclusively from real task data
  const activities: TeamActivityItem[] = tasks.map((t) => {
    // Extract a readable agent display name from the agent_id slug
    const agentName = t.agent_id
      .replace(/^(scholar|shipwright|navigator|doctor|chef|sniper|captain)-/, '')
      .replace(/^\w/, (c) => c.toUpperCase());

    const timeField = t.completed_at || t.created_at;
    const timestamp = timeField
      ? new Date(timeField).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
      : 'Recent';

    return {
      id: `task-${t.id}`,
      agent_id: t.agent_id,
      agent_name: agentName,
      action_type: 'task' as const,
      description: t.title,
      timestamp,
      status: t.status === 'completed' ? ('Completed' as const) : ('In Progress' as const),
    };
  });

  const getStatusBadge = (status: TeamActivityItem['status']) => {
    switch (status) {
      case 'Completed':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
            Completed
          </span>
        );
      case 'In Progress':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono">
            In Progress
          </span>
        );
      case 'Needs attention':
        return (
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-[10px] font-mono">
            Needs attention
          </span>
        );
    }
  };

  return (
    <div id="team-activity" className="mt-12 pt-8 border-t border-white/10 scroll-mt-20">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-white tracking-tight">Team activity</h2>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[10px] font-mono font-semibold tracking-wider uppercase">
              TRANSPARENT PROGRESS
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Real-time ledger of division sub-agent actions, research summaries, and task resolutions.
          </p>
        </div>
      </div>

      {/* Activity Timeline */}
      {activities.length === 0 ? (
        <div className="p-8 rounded-2xl bg-slate-900/40 border border-white/5 text-center">
          <p className="text-sm text-slate-400">No team activity recorded yet.</p>
          <p className="text-xs text-slate-600 mt-1">Dispatched tasks and subagent operations will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-white/10 flex items-center justify-center shrink-0">
                  <AgentIcon agentId={act.agent_id} width={18} height={18} className="text-slate-200" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white capitalize">{act.agent_name}:</span>
                    <span className="text-xs text-slate-300 truncate">{act.description}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock width={10} height={10} />
                      <span>{act.timestamp}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="shrink-0">{getStatusBadge(act.status)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
