'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { useSettings } from '@/lib/settings/settings-context';
import { db } from '@/lib/db/opfs-adapter';
import { MorningPlanningModal } from '@/components/planning/MorningPlanningModal';
import { ThemeSelectionModal } from '@/components/settings/ThemeSelectionModal';
import {
  Compass,
  MessageSquare,
  Users,
  Database,
  SlidersHorizontal,
  Sun,
  Building2,
  Plus,
  Check,
  HardDrive,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  Activity,
  Workflow,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

const MAIN_NAV_MODULES = [
  {
    href: '/',
    label: 'Grand Line Canvas',
    shortLabel: 'Canvas',
    description: 'Radial knowledge graph with real-time orbit visualization and agent nodes.',
    icon: Compass,
    accentBorder: 'hover:border-amber-500/40',
    accentBg: 'from-amber-500/10 to-orange-500/10',
    iconColor: 'text-amber-400',
    badge: 'Core Visualizer',
  },
  {
    href: '/chat',
    label: 'Helm Chat & Delegation',
    shortLabel: 'Helm Chat',
    description: 'Direct communication with Captain & Orchestrator with sub-agent dispatch traces.',
    icon: MessageSquare,
    accentBorder: 'hover:border-cyan-500/40',
    accentBg: 'from-cyan-500/10 to-blue-500/10',
    iconColor: 'text-cyan-400',
    badge: 'Level 0 Orchestrator',
  },
  {
    href: '/crew',
    label: 'Crew Directory & Models',
    shortLabel: 'Crew Directory',
    description: 'Autonomous specialists, domain routing rules, role prompts, and per-agent AI models.',
    icon: Users,
    accentBorder: 'hover:border-emerald-500/40',
    accentBg: 'from-emerald-500/10 to-teal-500/10',
    iconColor: 'text-emerald-400',
    badge: 'Specialist Agents',
  },
  {
    href: '/vault',
    label: 'Knowledge Vault & Lore',
    shortLabel: 'Knowledge Vault',
    description: 'Local markdown documents, full-text FTS5 search, and sovereign note lore ingestion.',
    icon: Database,
    accentBorder: 'hover:border-indigo-500/40',
    accentBg: 'from-indigo-500/10 to-purple-500/10',
    iconColor: 'text-indigo-400',
    badge: 'FTS5 Indexed',
  },
  {
    href: '/settings',
    label: 'System Settings & Keys',
    shortLabel: 'Settings',
    description: 'Gemini & OpenRouter API configurations, database migrations, and telemetry controls.',
    icon: SlidersHorizontal,
    accentBorder: 'hover:border-purple-500/40',
    accentBg: 'from-purple-500/10 to-pink-500/10',
    iconColor: 'text-purple-400',
    badge: 'Runtime Config',
  },
];

export default function MenuPage() {
  const router = useRouter();
  const {
    currentTheme,
    themeConfig,
    companies,
    activeCompany,
    switchCompany,
    openCompanyModal,
    isConfigured,
  } = useSettings();

  const [isMorningPlanningOpen, setIsMorningPlanningOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [docCount, setDocCount] = useState<number | null>(null);
  const [taskCount, setTaskCount] = useState<number | null>(null);
  const [isDbReady, setIsDbReady] = useState<boolean>(false);

  useEffect(() => {
    async function loadStats() {
      try {
        await db.init();
        setIsDbReady(true);
        const [agents, docs, tasks] = await Promise.all([
          db.getAgents ? db.getAgents() : Promise.resolve([]),
          db.getAllDocuments ? db.getAllDocuments() : Promise.resolve([]),
          db.getTasks ? db.getTasks() : Promise.resolve([]),
        ]);
        setAgentCount(agents.length);
        setDocCount(docs.length);
        setTaskCount(tasks.length);
      } catch (err) {
        console.error('Failed to load menu database statistics:', err);
      }
    }
    loadStats();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500/30">
      <Navbar onOpenMorningPlanning={() => setIsMorningPlanningOpen(true)} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Page Header Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2.5 mb-1.5">
              <span className="text-xs font-mono uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                System Command Center
              </span>
              <span className="text-xs font-mono text-slate-400 hidden sm:inline">
                {themeConfig.name} · {themeConfig.defaultGroup}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              Application Navigation & Vitals
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl">
              Instant access to all modules, workspace profiles, squad rituals, and local OPFS SQLite system vitals.
            </p>
          </div>

          {/* Quick Actions Header */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsMorningPlanningOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 border border-red-400/30 transition-all active:scale-95"
            >
              <Sun width={15} height={15} className="text-amber-200 shrink-0" />
              <span>Morning Planning</span>
            </button>

            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-slate-200 text-xs font-mono transition-all"
            >
              <Sparkles width={14} height={14} className="text-amber-400 shrink-0" />
              <span>Theme: {themeConfig.name}</span>
            </button>
          </div>
        </div>

        {/* Primary Navigation Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Layers width={16} height={16} className="text-amber-400" />
              <span>Core Fleet Modules</span>
            </h2>
            <span className="text-xs text-slate-400 font-mono">5 Modules Available</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {MAIN_NAV_MODULES.map((module) => {
              const Icon = module.icon;
              return (
                <Link key={module.href} href={module.href} className="group block focus:outline-none">
                  <GlassCard
                    className={`h-full p-5 flex flex-col justify-between transition-all duration-200 ${module.accentBorder} group-hover:-translate-y-0.5 group-hover:shadow-xl group-hover:shadow-black/40`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-tr ${module.accentBg} flex items-center justify-center border border-white/10 ${module.iconColor} group-hover:scale-105 transition-transform`}
                        >
                          <Icon width={20} height={20} />
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400">
                          {module.badge}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors flex items-center gap-2">
                        <span>{module.label}</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                        {module.description}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
                      <span>Launch module</span>
                      <ArrowRight
                        width={14}
                        height={14}
                        className="group-hover:translate-x-1 transition-transform text-amber-400"
                      />
                    </div>
                  </GlassCard>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Company & Multi-Tenant Workspaces Section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 width={16} height={16} className="text-indigo-400" />
              <span>Company Workspaces</span>
            </h2>
            <button
              type="button"
              onClick={openCompanyModal}
              className="flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20"
            >
              <Plus width={13} height={13} />
              <span>Create New Workspace</span>
            </button>
          </div>

          {companies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {companies.map((c) => {
                const isActive = c.id === activeCompany?.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => switchCompany(c.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-indigo-600/20 border-indigo-500/60 shadow-lg shadow-indigo-600/10'
                        : 'bg-slate-900/60 border-white/10 hover:border-indigo-500/30 hover:bg-slate-900/90'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-white truncate">{c.name}</span>
                          {isActive && (
                            <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 shrink-0">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-1 truncate">
                          {c.owners || 'No owners specified'}
                        </p>
                      </div>
                      {isActive ? (
                        <div className="w-5 h-5 rounded-full bg-indigo-500/30 border border-indigo-400 flex items-center justify-center shrink-0">
                          <Check width={12} height={12} className="text-indigo-300" />
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Switch</span>
                      )}
                    </div>
                    {c.mission_vision && (
                      <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 border-t border-white/5 pt-2">
                        {c.mission_vision}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-900/40 border border-white/5 text-center text-xs text-slate-400">
              No company workspaces found. Click &quot;Create New Workspace&quot; to organize agent objectives by entity.
            </div>
          )}
        </section>

        {/* System Architecture & Vitals Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Activity width={16} height={16} className="text-emerald-400" />
              <span>Sovereignty & Storage Vitals</span>
            </h2>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              OPFS Synchronized
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <GlassCard className="p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>SQLite WASM Status</span>
                <HardDrive width={14} height={14} className="text-emerald-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {isDbReady ? 'OPFS Active' : 'Initializing...'}
              </div>
              <p className="text-[11px] text-slate-400">
                Origin Private File System (<code className="text-slate-300 font-mono">quarkmeme.db</code>)
              </p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Active Crew Agents</span>
                <Users width={14} height={14} className="text-amber-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {agentCount !== null ? `${agentCount} Agents` : '...'}
              </div>
              <p className="text-[11px] text-slate-400">
                Orchestrator + Division Leads seeded
              </p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>FTS5 Documents</span>
                <Database width={14} height={14} className="text-indigo-400" />
              </div>
              <div className="text-lg font-bold text-white font-mono">
                {docCount !== null ? `${docCount} Entries` : '...'}
              </div>
              <p className="text-[11px] text-slate-400">
                Full-text search virtual index ready
              </p>
            </GlassCard>

            <GlassCard className="p-4 space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span>Cloud Bills Guarantee</span>
                <ShieldCheck width={14} height={14} className="text-cyan-400" />
              </div>
              <div className="text-lg font-bold text-emerald-400 font-mono">
                $0.00 / mo
              </div>
              <p className="text-[11px] text-slate-400">
                Local-first client storage invariant
              </p>
            </GlassCard>
          </div>
        </section>

        {/* Quick Links & Tips Footer */}
        <section className="p-5 rounded-2xl bg-gradient-to-r from-slate-900/80 to-slate-950 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Looking to configure LLM API keys or custom endpoints?</span>
            </h3>
            <p className="text-xs text-slate-400">
              Quarkmeme supports Gemini 2.5 Flash, OpenRouter, and local OpenAI-compatible endpoints with client-side key storage.
            </p>
          </div>
          <Link
            href="/settings"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-white/10 transition-colors whitespace-nowrap"
          >
            <span>Open Settings</span>
            <ExternalLink width={13} height={13} />
          </Link>
        </section>
      </main>

      {/* Internal Modals for Morning Planning and Theme Selection */}
      <MorningPlanningModal
        isOpen={isMorningPlanningOpen}
        onClose={() => setIsMorningPlanningOpen(false)}
      />

      <ThemeSelectionModal
        forceOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}
