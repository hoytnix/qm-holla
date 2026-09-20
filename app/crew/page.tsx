'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord, TaskRecord, AgentToolsConfig } from '@/lib/db/adapter';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { AgentIcon } from '@/components/ui/AgentIcon';
import { TeamActivityStream } from '@/components/crew/TeamActivityStream';
import {
  Users,
  Plus,
  Edit2,
  Trash2,
  MessageSquare,
  FileCode,
  Shield,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Terminal,
  Cpu,
  Brain,
  Search,
  Wrench,
  Globe,
  Database,
  FileText,
  Edit3,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';
import { GOOGLE_AI_STUDIO_MODELS } from '@/lib/ai/models';

export default function CrewPage() {
  const { themeVersion, activeCompany, themeConfig } = useSettings();
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Editing / Creating agent state
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Role Instructions modal state
  const [inspectingInstructionsAgent, setInspectingInstructionsAgent] = useState<AgentRecord | null>(null);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formRouting, setFormRouting] = useState('');
  const [formPrompt, setFormPrompt] = useState('');
  const [formModel, setFormModel] = useState<string>('');
  const [formTools, setFormTools] = useState<AgentToolsConfig>({
    googleSearch: false,
    codeExecution: false,
    fetchUrlMarkdown: false,
    batchReadFiles: false,
    batchWriteFiles: false,
    sqliteQueryBuilder: false,
  });

  const loadAll = async () => {
    try {
      await db.init();
      const [agentList, taskList] = await Promise.all([
        db.getAgents(),
        db.getTasks ? db.getTasks() : Promise.resolve([]),
      ]);
      setAgents(agentList);
      setTasks(taskList);
    } catch (e) {
      console.error('Failed to load crew page data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // Reload crew when theme changes
  useEffect(() => {
    if (themeVersion === 0) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [themeVersion]);

  const openEdit = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setIsCreating(false);
    setFormName(agent.name);
    setFormRole(agent.role_title);
    setFormRouting(agent.routing_description || '');
    setFormPrompt(agent.system_prompt);
    setFormModel(agent.model || '');
    setFormTools(agent.tools || {
      googleSearch: false,
      codeExecution: false,
      fetchUrlMarkdown: false,
      batchReadFiles: false,
      batchWriteFiles: false,
      sqliteQueryBuilder: false,
    });
  };

  const openCreate = () => {
    setEditingAgent(null);
    setIsCreating(true);
    setFormName('');
    setFormRole('');
    setFormRouting('');
    setFormPrompt('');
    setFormModel('');
    setFormTools({
      googleSearch: false,
      codeExecution: false,
      fetchUrlMarkdown: false,
      batchReadFiles: false,
      batchWriteFiles: false,
      sqliteQueryBuilder: false,
    });
  };

  const cancelEdit = () => {
    setEditingAgent(null);
    setIsCreating(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrompt.trim()) return;

    const id = editingAgent ? editingAgent.id : `agent-${Date.now().toString(36)}`;
    const newRecord: AgentRecord = {
      id,
      name: formName.trim(),
      role_title: formRole.trim() || 'Crew Member',
      avatar_url: editingAgent?.avatar_url || 'sparkles',
      system_prompt: formPrompt.trim(),
      routing_description: formRouting.trim() || null,
      parent_agent_id: editingAgent ? editingAgent.parent_agent_id : 'captain-core',
      model: formModel.trim() || null,
      tools: formTools,
    };

    await db.saveAgent(newRecord);
    await loadAll();
    cancelEdit();
  };

  const handleAgentModelChange = async (agent: AgentRecord, newModel: string) => {
    const updatedAgent: AgentRecord = {
      ...agent,
      model: newModel ? newModel : null,
    };
    // Optimistically update UI
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? updatedAgent : a)));
    await db.saveAgent(updatedAgent);
  };

  const handleAgentToolToggle = async (agent: AgentRecord, toolKey: keyof AgentToolsConfig) => {
    const currentTools: AgentToolsConfig = agent.tools || { googleSearch: false, codeExecution: false };
    const updatedTools: AgentToolsConfig = {
      ...currentTools,
      [toolKey]: !currentTools[toolKey],
    };
    const updatedAgent: AgentRecord = {
      ...agent,
      tools: updatedTools,
    };
    // Optimistically update UI
    setAgents((prev) => prev.map((a) => (a.id === agent.id ? updatedAgent : a)));
    await db.saveAgent(updatedAgent);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to dismiss this crew member from the roster?')) {
      if (db.deleteAgent) {
        await db.deleteAgent(id);
        await loadAll();
      }
    }
  };

  // Get count of open tasks assigned to an agent
  const getOpenAssignmentsCount = (agentId: string) => {
    return tasks.filter((t) => t.agent_id === agentId && t.status !== 'completed').length;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#030712] text-slate-100 selection:bg-amber-500/30">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Hero Banner */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10 pb-8 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs uppercase tracking-widest text-amber-400 font-mono font-semibold">
                Autonomous Roster & Hierarchy
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
                Level 0 - Level 2
              </span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-tight">
              A crew for every adventure.
            </h1>
            <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Seven familiar faces, each with a clear job in your world. Zero cloud database fees, sovereign browser persistence, and distinct system prompts.
            </p>
          </div>

          <GlassButton variant="primary" onClick={openCreate} className="flex items-center gap-2 shrink-0 min-h-[44px]">
            <Plus width={18} height={18} />
            <span>Recruit Specialist</span>
          </GlassButton>
        </div>

        {/* Modal / Inline Editor */}
        {(isCreating || editingAgent) && (
          <GlassCard className="p-6 sm:p-8 mb-10 border-amber-500/40 bg-slate-900/90 max-w-2xl mx-auto shadow-2xl">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{editingAgent ? `Edit Directives: ${editingAgent.name}` : 'Recruit New Officer'}</span>
              </h2>
              <button onClick={cancelEdit} className="text-slate-400 hover:text-white p-1 rounded-lg">
                <X width={18} height={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <GlassInput
                  label="Agent Name"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Zoro Swordsman"
                  required
                />
                <GlassInput
                  label="Role Title"
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                  placeholder="e.g. Combat Strategist & First Mate"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  Routing Intent Keywords & Description
                </label>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-sm text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 backdrop-blur-md"
                  rows={2}
                  value={formRouting}
                  onChange={(e) => setFormRouting(e.target.value)}
                  placeholder="e.g. Handles tactical planning, martial analysis, conflict resolution..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  Assigned AI Model (Custom Per-Agent)
                </label>
                <select
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs sm:text-sm text-white focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 backdrop-blur-md font-mono"
                >
                  <option value="">Default Fleet Model (Global Setting)</option>
                  {GOOGLE_AI_STUDIO_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.value}) {m.recommended ? '★ Recommended' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1 ml-1">
                  Assign a unique AI model for this specialist. If set to default, uses the global model from Settings.
                </p>
              </div>

              {/* Agent Tools Form Group (All 6 Direct Tools) */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-2 flex items-center gap-1.5">
                  <Wrench width={14} height={14} className="text-amber-400" />
                  <span>Enabled Tools & Autonomous Capabilities</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* batch_read_files */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.batchReadFiles || formTools.vaultRead
                        ? 'border-blue-500/50 bg-blue-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!(formTools.batchReadFiles || formTools.vaultRead)}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, batchReadFiles: e.target.checked, vaultRead: undefined }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-blue-500 focus:ring-blue-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <FileText width={13} height={13} className="text-blue-400" />
                        <span>Batch Read (batch_read_files)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Reads multiple markdown notes, briefs, and memory bank files simultaneously in a single turn without separate requests.
                      </p>
                    </div>
                  </label>

                  {/* batch_write_files */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.batchWriteFiles || formTools.vaultWrite
                        ? 'border-amber-500/50 bg-amber-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!(formTools.batchWriteFiles || formTools.vaultWrite)}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, batchWriteFiles: e.target.checked, vaultWrite: undefined }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-amber-500 focus:ring-amber-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Edit3 width={13} height={13} className="text-amber-400" />
                        <span>Batch Write (batch_write_files)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Writes or updates multiple living specs, plans, and artifacts simultaneously in one atomic turn.
                      </p>
                    </div>
                  </label>

                  {/* sqlite_query_builder */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.sqliteQueryBuilder
                        ? 'border-teal-500/50 bg-teal-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!formTools.sqliteQueryBuilder}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, sqliteQueryBuilder: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-teal-500 focus:ring-teal-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Database width={13} height={13} className="text-teal-400" />
                        <span>SQLite Query Builder (sqlite_query_builder)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Executes analytical SQL queries against local SQLite database tables with safety guards.
                      </p>
                    </div>
                  </label>

                  {/* fetch_url_as_markdown */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.fetchUrlMarkdown
                        ? 'border-purple-500/50 bg-purple-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!formTools.fetchUrlMarkdown}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, fetchUrlMarkdown: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-purple-500 focus:ring-purple-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Globe width={13} height={13} className="text-purple-400" />
                        <span>Web Markdowner (fetch_url_as_markdown)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Fetches public URLs and ingests clean Markdown (powered by md.dhr.wtf).
                      </p>
                    </div>
                  </label>

                  {/* googleSearch */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.googleSearch
                        ? 'border-emerald-500/50 bg-emerald-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!formTools.googleSearch}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, googleSearch: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-emerald-500 focus:ring-emerald-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Search width={13} height={13} className="text-emerald-400" />
                        <span>Google Search Grounding (googleSearch)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Enables live Google web search and real-time grounding citations.
                      </p>
                    </div>
                  </label>

                  {/* codeExecution */}
                  <label
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      formTools.codeExecution
                        ? 'border-cyan-500/50 bg-cyan-950/30'
                        : 'border-white/10 bg-slate-900/60 hover:border-white/20'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!formTools.codeExecution}
                      onChange={(e) =>
                        setFormTools((prev) => ({ ...prev, codeExecution: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-white/20 bg-slate-900 text-cyan-500 focus:ring-cyan-500/30"
                    />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                        <Terminal width={13} height={13} className="text-cyan-400" />
                        <span>Code Execution (codeExecution)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-normal">
                        Allows writing and sandboxed execution of computational Python/code snippets.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  System Prompt & Character Persona
                </label>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-900/80 p-3 text-xs sm:text-sm text-white font-mono placeholder:text-slate-500 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400/20 backdrop-blur-md"
                  rows={6}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="You are..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <GlassButton type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" className="flex items-center gap-1.5">
                  <Check width={16} height={16} />
                  <span>Save Specialist</span>
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Crew Cards Grid */}
        {loading ? (
          <div className="text-center py-20 text-slate-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
            <span className="font-mono text-xs">Loading Straw Hat roster...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const isCaptain = !agent.parent_agent_id;
              const openAssignments = getOpenAssignmentsCount(agent.id);
              const captainAgent = agents.find((a) => !a.parent_agent_id);
              const ceoName = activeCompany?.owners?.trim()
                ? activeCompany.owners.split(/[,&/]/)[0].trim()
                : (captainAgent?.name ? captainAgent.name.split(' ')[0] : (themeConfig?.leaderTitle || 'CEO'));

              return (
                <GlassCard
                  key={agent.id}
                  className={`p-6 flex flex-col justify-between transition-all duration-200 hover:border-white/25 shadow-xl ${
                    isCaptain
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-950/30 to-slate-900/80'
                      : 'border-white/10 bg-slate-900/60'
                  }`}
                >
                  <div>
                    {/* Card Header */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                            isCaptain
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                              : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
                          }`}
                        >
                          <AgentIcon agentId={agent.id} role={agent.role_title} width={22} height={22} />
                        </div>
                        <div>
                          <h3 className="text-base font-bold text-white leading-tight">{agent.name}</h3>
                          <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                            {agent.role_title}
                          </p>
                        </div>
                      </div>

                      {/* Reporting Hierarchy Tag */}
                      <span
                        className={`text-[9px] px-2.5 py-1 rounded-full font-mono font-bold tracking-wider uppercase border shrink-0 ${
                          isCaptain
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {isCaptain ? 'REPORTS TO YOU' : `REPORTS TO ${ceoName.toUpperCase()}`}
                      </span>
                    </div>

                    {/* Responsibility Overview Paragraph */}
                    <div className="space-y-3 mt-3 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Responsibility Scope
                        </span>
                        <p className="text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-white/5 line-clamp-2 leading-relaxed">
                          {agent.routing_description || 'Direct helm leadership and intent routing.'}
                        </p>
                      </div>

                      {/* Open Assignments Badge & Model Selector */}
                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-slate-300">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              openAssignments > 0 ? 'bg-amber-400 animate-pulse' : 'bg-slate-500'
                            }`}
                          />
                          <span>{openAssignments} open assignments</span>
                        </span>

                        {agent.model && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-[10px] font-mono text-indigo-300">
                            <Cpu width={11} height={11} />
                            <span>{agent.model}</span>
                          </span>
                        )}

                        {(agent.tools?.batchReadFiles || agent.tools?.vaultRead) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 text-[10px] font-mono text-blue-300">
                            <FileText width={10} height={10} />
                            <span>Batch Read</span>
                          </span>
                        )}

                        {(agent.tools?.batchWriteFiles || agent.tools?.vaultWrite) && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-[10px] font-mono text-amber-300">
                            <Edit3 width={10} height={10} />
                            <span>Batch Write</span>
                          </span>
                        )}

                        {agent.tools?.sqliteQueryBuilder && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-teal-500/15 border border-teal-500/30 text-[10px] font-mono text-teal-300">
                            <Database width={10} height={10} />
                            <span>SQL</span>
                          </span>
                        )}

                        {agent.tools?.googleSearch && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
                            <Search width={10} height={10} />
                            <span>Search</span>
                          </span>
                        )}

                        {agent.tools?.codeExecution && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                            <Terminal width={10} height={10} />
                            <span>Code</span>
                          </span>
                        )}

                        {agent.tools?.fetchUrlMarkdown && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-purple-500/15 border border-purple-500/30 text-[10px] font-mono text-purple-300">
                            <Globe width={10} height={10} />
                            <span>Markdown</span>
                          </span>
                        )}
                      </div>

                      {/* Model Selector Dropdown on Card */}
                      <div className="pt-2">
                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Brain width={12} height={12} className="text-amber-400" />
                            <span>Assigned AI Model</span>
                          </span>
                          {agent.model ? (
                            <span className="text-[9px] text-amber-300 font-mono">Custom</span>
                          ) : (
                            <span className="text-[9px] text-slate-500 font-mono">Global Default</span>
                          )}
                        </label>
                        <select
                          value={agent.model || ''}
                          onChange={(e) => handleAgentModelChange(agent, e.target.value)}
                          className="w-full text-xs rounded-xl bg-slate-950/90 border border-white/10 py-1.5 px-2.5 text-slate-200 focus:outline-none focus:border-amber-400 font-mono"
                        >
                          <option value="">Default Fleet Model (Global)</option>
                          {GOOGLE_AI_STUDIO_MODELS.map((m) => (
                            <option key={m.value} value={m.value}>
                              {m.label} ({m.value}) {m.recommended ? '★' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Built-In Tools Selector Group on Card */}
                      <div className="pt-2">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                            <Wrench width={11} height={11} className="text-amber-400" />
                            <span>Enabled Tools</span>
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">
                            {`${
                              ((agent.tools?.batchReadFiles || agent.tools?.vaultRead) ? 1 : 0) +
                              ((agent.tools?.batchWriteFiles || agent.tools?.vaultWrite) ? 1 : 0) +
                              (agent.tools?.sqliteQueryBuilder ? 1 : 0) +
                              (agent.tools?.fetchUrlMarkdown ? 1 : 0) +
                              (agent.tools?.googleSearch ? 1 : 0) +
                              (agent.tools?.codeExecution ? 1 : 0)
                            } / 6 active`}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {/* batchReadFiles */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'batchReadFiles')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.batchReadFiles || agent.tools?.vaultRead
                                ? 'bg-blue-500/15 border-blue-500/40 text-blue-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle Batch Read (batch_read_files) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <FileText width={11} height={11} className={(agent.tools?.batchReadFiles || agent.tools?.vaultRead) ? 'text-blue-400' : 'text-slate-500'} />
                              <span>B-Read</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.batchReadFiles || agent.tools?.vaultRead
                                  ? 'bg-blue-500/20 text-blue-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {(agent.tools?.batchReadFiles || agent.tools?.vaultRead) ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* batchWriteFiles */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'batchWriteFiles')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.batchWriteFiles || agent.tools?.vaultWrite
                                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle Batch Write (batch_write_files) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <Edit3 width={11} height={11} className={(agent.tools?.batchWriteFiles || agent.tools?.vaultWrite) ? 'text-amber-400' : 'text-slate-500'} />
                              <span>B-Write</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.batchWriteFiles || agent.tools?.vaultWrite
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {(agent.tools?.batchWriteFiles || agent.tools?.vaultWrite) ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* sqliteQueryBuilder */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'sqliteQueryBuilder')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.sqliteQueryBuilder
                                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle SQLite Query Builder (sqlite_query_builder) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <Database width={11} height={11} className={agent.tools?.sqliteQueryBuilder ? 'text-teal-400' : 'text-slate-500'} />
                              <span>SQL</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.sqliteQueryBuilder
                                  ? 'bg-teal-500/20 text-teal-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {agent.tools?.sqliteQueryBuilder ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* fetchUrlMarkdown */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'fetchUrlMarkdown')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.fetchUrlMarkdown
                                ? 'bg-purple-500/15 border-purple-500/40 text-purple-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle Web Markdowner (fetch_url_as_markdown) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <Globe width={11} height={11} className={agent.tools?.fetchUrlMarkdown ? 'text-purple-400' : 'text-slate-500'} />
                              <span>MD</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.fetchUrlMarkdown
                                  ? 'bg-purple-500/20 text-purple-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {agent.tools?.fetchUrlMarkdown ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* googleSearch */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'googleSearch')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.googleSearch
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle Google Search Grounding (googleSearch) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <Search width={11} height={11} className={agent.tools?.googleSearch ? 'text-emerald-400' : 'text-slate-500'} />
                              <span>Search</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.googleSearch
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {agent.tools?.googleSearch ? 'ON' : 'OFF'}
                            </span>
                          </button>

                          {/* codeExecution */}
                          <button
                            type="button"
                            onClick={() => handleAgentToolToggle(agent, 'codeExecution')}
                            className={`flex flex-col items-center justify-center p-1.5 rounded-xl border text-[10px] font-mono transition-all ${
                              agent.tools?.codeExecution
                                ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300 shadow-sm'
                                : 'bg-slate-950/60 border-white/10 text-slate-400 hover:border-white/20'
                            }`}
                            title="Toggle Code Execution (codeExecution) for this agent"
                          >
                            <span className="flex items-center gap-1">
                              <Terminal width={11} height={11} className={agent.tools?.codeExecution ? 'text-cyan-400' : 'text-slate-500'} />
                              <span>Code</span>
                            </span>
                            <span
                              className={`text-[8px] mt-0.5 px-1 py-0.2 rounded font-bold uppercase tracking-wider ${
                                agent.tools?.codeExecution
                                  ? 'bg-cyan-500/20 text-cyan-300'
                                  : 'bg-white/5 text-slate-500'
                              }`}
                            >
                              {agent.tools?.codeExecution ? 'ON' : 'OFF'}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between gap-2 pt-4 mt-5 border-t border-white/10">
                    <div className="flex items-center gap-2">
                      <Link href={`/chat?agent=${agent.id}`}>
                        <GlassButton size="sm" variant="secondary" className="flex items-center gap-1.5 min-h-[36px]">
                          <MessageSquare width={14} height={14} />
                          <span>Dispatch</span>
                        </GlassButton>
                      </Link>

                      <button
                        onClick={() => setInspectingInstructionsAgent(agent)}
                        className="text-xs text-indigo-400 hover:text-indigo-300 px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors font-medium"
                      >
                        View role instructions
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(agent)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit directives"
                      >
                        <Edit2 width={15} height={15} />
                      </button>
                      {!isCaptain && (
                        <button
                          onClick={() => handleDelete(agent.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10 transition-colors"
                          title="Dismiss"
                        >
                          <Trash2 width={15} height={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Transparent Activity Stream (Phase 4.3) */}
        <TeamActivityStream tasks={tasks} />

        {/* Role Instructions Modal */}
        {inspectingInstructionsAgent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md">
            <div className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[85vh] flex flex-col">
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <AgentIcon
                      agentId={inspectingInstructionsAgent.id}
                      role={inspectingInstructionsAgent.role_title}
                      width={20}
                      height={20}
                    />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">{inspectingInstructionsAgent.name}</h3>
                    <p className="text-xs text-slate-400">Role Instructions & Autonomous Directives</p>
                  </div>
                </div>

                <button
                  onClick={() => setInspectingInstructionsAgent(null)}
                  className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10"
                >
                  <X width={18} height={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    System Prompt Specification
                  </span>
                  <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                    {inspectingInstructionsAgent.system_prompt}
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Assigned AI Model
                  </span>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs text-slate-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Cpu width={15} height={15} className="text-amber-400" />
                      <span className="font-mono text-white">
                        {inspectingInstructionsAgent.model || 'Default Fleet Model (Global)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      {inspectingInstructionsAgent.model ? 'Custom Dedicated Model' : 'Inherited from Settings'}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Isolated Memory Bank (/memory-bank/agents/{inspectingInstructionsAgent.id}/)
                  </span>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs text-slate-300 space-y-1.5">
                    <p className="text-amber-300 font-mono text-[11px]">
                      • Directory: /memory-bank/agents/{inspectingInstructionsAgent.id}/
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      • 6 Core Files: <span className="font-mono text-slate-300">projectbrief.md</span>, <span className="font-mono text-slate-300">productContext.md</span>, <span className="font-mono text-slate-300">systemPatterns.md</span>, <span className="font-mono text-slate-300">techContext.md</span>, <span className="font-mono text-slate-300">activeContext.md</span>, <span className="font-mono text-slate-300">progress.md</span>.
                    </p>
                    <p className="text-slate-400 text-[11px]">
                      • Automatically loaded & rehydrated on every execution turn. Updates synced on task completion.
                    </p>
                    <div className="pt-1">
                      <Link href={`/vault?agent=${inspectingInstructionsAgent.id}`}>
                        <span className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 underline font-medium">
                          <span>Open Memory Bank in Vault</span>
                          <ArrowRight width={12} height={12} />
                        </span>
                      </Link>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                    Scoped Knowledge & Tool Access
                  </span>
                  <div className="bg-slate-950/60 p-3 rounded-2xl border border-white/5 text-xs text-slate-400 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-300 font-medium">Tools & Autonomous Capabilities:</span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.batchReadFiles || inspectingInstructionsAgent.tools?.vaultRead
                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <FileText width={10} height={10} />
                        <span>Batch Read: {(inspectingInstructionsAgent.tools?.batchReadFiles || inspectingInstructionsAgent.tools?.vaultRead) ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.batchWriteFiles || inspectingInstructionsAgent.tools?.vaultWrite
                            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <Edit3 width={10} height={10} />
                        <span>Batch Write: {(inspectingInstructionsAgent.tools?.batchWriteFiles || inspectingInstructionsAgent.tools?.vaultWrite) ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.sqliteQueryBuilder
                            ? 'bg-teal-500/15 border-teal-500/40 text-teal-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <Database width={10} height={10} />
                        <span>SQLite Query: {inspectingInstructionsAgent.tools?.sqliteQueryBuilder ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.fetchUrlMarkdown
                            ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <Globe width={10} height={10} />
                        <span>Web Markdowner: {inspectingInstructionsAgent.tools?.fetchUrlMarkdown ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.googleSearch
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <Search width={10} height={10} />
                        <span>Google Search: {inspectingInstructionsAgent.tools?.googleSearch ? 'Enabled' : 'Disabled'}</span>
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-mono ${
                          inspectingInstructionsAgent.tools?.codeExecution
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-500'
                        }`}
                      >
                        <Terminal width={10} height={10} />
                        <span>Code Execution: {inspectingInstructionsAgent.tools?.codeExecution ? 'Enabled' : 'Disabled'}</span>
                      </span>
                    </div>
                    <p>• Scoped FTS5 BM25 search restricted to knowledge base lore.</p>
                    <p>• Inter-agent shared memory context resolution via orchestrator bus.</p>
                    <p>• Local OPFS SQLite document & task persistence.</p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end shrink-0">
                <GlassButton variant="primary" onClick={() => setInspectingInstructionsAgent(null)}>
                  Done
                </GlassButton>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
