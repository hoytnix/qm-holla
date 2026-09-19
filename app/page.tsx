'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord } from '@/lib/db/adapter';
import { RadialGraph } from '@/components/canvas/RadialGraph';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { Navbar } from '@/components/layout/Navbar';
import {
  Compass,
  MessageSquare,
  HardDrive,
  Cpu,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function CanvasPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        await db.init();
        const list = await db.getAgents();
        setAgents(list);
        if (list.length > 0) {
          setSelectedAgent(list[0]);
        }
      } catch (e) {
        console.error('Failed to load agents in canvas:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col">
        {/* Header Hero */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-semibold">
                Autonomous Fleet Navigation
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                v0.1.0-alpha
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl flex items-center gap-3">
              Grand Line Radial Canvas
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-xl">
              Local-first multi-agent orchestration helm. All vector & relational knowledge resides in browser-secured OPFS SQLite WASM storage.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/chat">
              <GlassButton variant="glow" className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" />
                <span>Open Helm Chat</span>
              </GlassButton>
            </Link>
            <Link href="/vault">
              <GlassButton variant="secondary" className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span>Manage Vault</span>
              </GlassButton>
            </Link>
          </div>
        </div>

        {/* Canvas & Inspection Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 items-start">
          {/* Central Interactive Radial Graph */}
          <div className="lg:col-span-8 flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl border border-white/10 bg-gradient-to-b from-slate-900/40 via-slate-950/60 to-slate-950 relative overflow-hidden shadow-2xl min-h-[550px]">
            {/* Background grid lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b12_1px,transparent_1px),linear-gradient(to_bottom,#1e293b12_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            {loading ? (
              <div className="flex flex-col items-center gap-3 text-slate-400">
                <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                <span className="text-sm font-mono">Initializing OPFS SQLite Canvas...</span>
              </div>
            ) : (
              <RadialGraph
                agents={agents}
                onSelectAgent={(agent) => setSelectedAgent(agent)}
                selectedAgentId={selectedAgent?.id}
              />
            )}

            {/* Canvas Legend */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-400 font-mono">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-amber-400 bg-amber-500/30" />
                <span>Captain Orchestrator</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-lg border border-cyan-400 bg-cyan-500/30" />
                <span>Specialist Officers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rotate-45 border border-sky-400 bg-sky-500/40" />
                <span>OPFS Knowledge Satellites</span>
              </div>
            </div>
          </div>

          {/* Inspector Panel for Selected Agent */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {selectedAgent ? (
              <GlassCard className="p-6 border-indigo-500/30 bg-slate-900/70">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 rounded-2xl bg-indigo-950/60 border border-indigo-500/20">
                      {selectedAgent.avatar_url || '⚡'}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold text-white">{selectedAgent.name}</h2>
                      <p className="text-xs text-indigo-300 font-medium">
                        {selectedAgent.role_title}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                      !selectedAgent.parent_agent_id
                        ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                        : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                    }`}
                  >
                    {!selectedAgent.parent_agent_id ? 'Core Helm' : 'Specialist'}
                  </span>
                </div>

                <div className="space-y-4 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Routing Intent Scope
                    </span>
                    <p className="text-slate-200 bg-slate-950/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                      {selectedAgent.routing_description || 'General queries & fleet routing.'}
                    </p>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                      Directive Prompt
                    </span>
                    <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 max-h-40 overflow-y-auto font-mono text-[11px] leading-relaxed">
                      {selectedAgent.system_prompt}
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col gap-2">
                    <Link href={`/chat?agent=${selectedAgent.id}`} className="w-full">
                      <GlassButton variant="primary" className="w-full flex items-center justify-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        <span>Dispatch to {selectedAgent.name.split(' ')[0]}</span>
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </GlassButton>
                    </Link>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6 text-center text-slate-400 text-sm">
                Click any agent node on the radial canvas to inspect directives.
              </GlassCard>
            )}

            {/* Architecture Metrics Card */}
            <GlassCard className="p-5 border-white/10 bg-slate-900/40">
              <div className="flex items-center gap-2 text-slate-200 text-xs font-semibold uppercase tracking-wider mb-3">
                <Cpu className="w-4 h-4 text-indigo-400" />
                <span>Engine Specifications</span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Database Storage</span>
                  <span className="font-mono font-medium text-emerald-400">OPFS /quarkmeme.db</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Vector Search</span>
                  <span className="font-mono font-medium text-sky-400">SQLite FTS5 BM25</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Execution Mode</span>
                  <span className="font-mono font-medium text-amber-400">Local-First PWA</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950/50 border border-white/5">
                  <span className="text-[10px] text-slate-500 block">Sync Path</span>
                  <span className="font-mono font-medium text-purple-400">Turso libSQL Ready</span>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
