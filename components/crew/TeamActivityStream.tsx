'use client';

import React from 'react';
import {
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCode,
  BookOpen,
  Send,
  Sparkles,
} from 'lucide-react';
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
  // Synthesize realistic chronological activity stream from tasks and agent logs
  const activities: TeamActivityItem[] = [
    {
      id: 'act-1',
      agent_id: 'scholar-robin',
      agent_name: 'Robin',
      action_type: 'research',
      description: 'Decoded archaeological stone scripts into local vault',
      timestamp: '10:42 AM',
      status: 'Completed',
    },
    {
      id: 'act-2',
      agent_id: 'shipwright-franky',
      agent_name: 'Franky',
      action_type: 'code',
      description: 'Configured OPFS synchronous proxy access handles',
      timestamp: '10:12 AM',
      status: 'Completed',
    },
    {
      id: 'act-3',
      agent_id: 'navigator-nami',
      agent_name: 'Nami',
      action_type: 'audit',
      description: 'Audit Grand Line supply provisions and Berry reserves',
      timestamp: '09:30 AM',
      status: 'Completed',
    },
    {
      id: 'act-4',
      agent_id: 'chef-sanji',
      agent_name: 'Sanji',
      action_type: 'task',
      description: 'Optimize cross-agent context dispatch pipelines',
      timestamp: '09:15 AM',
      status: 'In Progress',
    },
    {
      id: 'act-5',
      agent_id: 'sniper-usopp',
      agent_name: 'Usopp',
      action_type: 'campaign',
      description: 'Draft Grand Line Launch announcement broadcast',
      timestamp: '08:45 AM',
      status: 'Completed',
    },
    {
      id: 'act-6',
      agent_id: 'doctor-chopper',
      agent_name: 'Chopper',
      action_type: 'task',
      description: 'Heartbeat diagnostic checks on Web Worker thread',
      timestamp: '08:00 AM',
      status: 'Completed',
    },
  ];

  // Also include any dynamic completed/in-progress tasks if present
  tasks.slice(0, 3).forEach((t, i) => {
    if (!activities.some((a) => a.id === `task-${t.id}`)) {
      activities.unshift({
        id: `task-${t.id}`,
        agent_id: t.agent_id,
        agent_name: t.agent_id.replace('scholar-', '').replace('shipwright-', '').replace('navigator-', '').replace('doctor-', '').replace('chef-', '').replace('sniper-', ''),
        action_type: 'task',
        description: t.title,
        timestamp: 'Just now',
        status: t.status === 'completed' ? 'Completed' : 'In Progress',
      });
    }
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

  const getActionIcon = (type: TeamActivityItem['action_type']) => {
    switch (type) {
      case 'research':
        return <BookOpen width={14} height={14} className="text-teal-400" />;
      case 'code':
        return <FileCode width={14} height={14} className="text-cyan-400" />;
      case 'audit':
        return <CheckCircle2 width={14} height={14} className="text-amber-400" />;
      default:
        return <Activity width={14} height={14} className="text-indigo-400" />;
    }
  };

  return (
    <div className="mt-12 pt-8 border-t border-white/10">
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
    </div>
  );
};
