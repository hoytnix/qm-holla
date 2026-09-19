'use client';

import React, { useEffect, useState } from 'react';
import { db } from '@/lib/db/opfs-adapter';
import { AgentRecord } from '@/lib/db/adapter';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GlassInput } from '@/components/ui/GlassInput';
import { Users, Plus, Edit2, Trash2, Shield, Check, X, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function CrewPage() {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAgent, setEditingAgent] = useState<AgentRecord | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form fields
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formAvatar, setFormAvatar] = useState('⚓');
  const [formRouting, setFormRouting] = useState('');
  const [formPrompt, setFormPrompt] = useState('');

  const loadAgents = async () => {
    try {
      await db.init();
      const list = await db.getAgents();
      setAgents(list);
    } catch (e) {
      console.error('Failed to load agents:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAgents();
  }, []);

  const openEdit = (agent: AgentRecord) => {
    setEditingAgent(agent);
    setIsCreating(false);
    setFormName(agent.name);
    setFormRole(agent.role_title);
    setFormAvatar(agent.avatar_url || '⚡');
    setFormRouting(agent.routing_description || '');
    setFormPrompt(agent.system_prompt);
  };

  const openCreate = () => {
    setEditingAgent(null);
    setIsCreating(true);
    setFormName('');
    setFormRole('');
    setFormAvatar('⚓');
    setFormRouting('');
    setFormPrompt('');
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
      avatar_url: formAvatar.trim() || '⚡',
      system_prompt: formPrompt.trim(),
      routing_description: formRouting.trim() || null,
      parent_agent_id: editingAgent ? editingAgent.parent_agent_id : 'captain-core',
    };

    await db.saveAgent(newRecord);
    await loadAgents();
    cancelEdit();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to dismiss this crew member from the roster?')) {
      if (db.deleteAgent) {
        await db.deleteAgent(id);
        await loadAgents();
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs uppercase tracking-widest text-indigo-400 font-mono font-semibold">
                Autonomous Roster
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <Users className="w-8 h-8 text-indigo-400" />
              <span>Crew Directory & Role Instructions</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              "A crew for every adventure." Configure specialized agents and their unique routing parameters.
            </p>
          </div>

          <GlassButton variant="primary" onClick={openCreate} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>Recruit Crew Member</span>
          </GlassButton>
        </div>

        {/* Modal / Inline Editor */}
        {(isCreating || editingAgent) && (
          <GlassCard className="p-6 mb-8 border-indigo-500/40 bg-slate-900/90 max-w-2xl mx-auto shadow-2xl">
            <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>{editingAgent ? 'Edit Officer Directives' : 'Recruit New Officer'}</span>
              </h2>
              <button onClick={cancelEdit} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <GlassInput
                    label="Agent Name"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Zoro Swordsman"
                    required
                  />
                </div>
                <div>
                  <GlassInput
                    label="Avatar Emoji"
                    value={formAvatar}
                    onChange={(e) => setFormAvatar(e.target.value)}
                    placeholder="⚔️"
                  />
                </div>
              </div>

              <div>
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
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 backdrop-blur-md"
                  rows={2}
                  value={formRouting}
                  onChange={(e) => setFormRouting(e.target.value)}
                  placeholder="e.g. Handles tactical planning, martial analysis, conflict resolution..."
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider ml-1 block mb-1">
                  System Prompt & Character Persona
                </label>
                <textarea
                  className="w-full rounded-xl border border-white/10 bg-slate-900/60 p-3 text-sm text-white font-mono placeholder:text-slate-500 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/20 backdrop-blur-md"
                  rows={6}
                  value={formPrompt}
                  onChange={(e) => setFormPrompt(e.target.value)}
                  placeholder="You are..."
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <GlassButton type="button" variant="ghost" onClick={cancelEdit}>
                  Cancel
                </GlassButton>
                <GlassButton type="submit" variant="primary" className="flex items-center gap-1.5">
                  <Check className="w-4 h-4" />
                  <span>Save Officer</span>
                </GlassButton>
              </div>
            </form>
          </GlassCard>
        )}

        {/* Crew Grid */}
        {loading ? (
          <div className="text-center py-16 text-slate-400">Loading crew records...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => {
              const isCaptain = !agent.parent_agent_id;
              return (
                <GlassCard
                  key={agent.id}
                  className={`p-6 flex flex-col justify-between transition-all hover:border-white/20 ${
                    isCaptain ? 'border-amber-500/30 bg-amber-950/10' : 'bg-slate-900/50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl p-2 rounded-2xl bg-slate-800/80 border border-white/10">
                          {agent.avatar_url || '⚡'}
                        </span>
                        <div>
                          <h3 className="text-base font-bold text-white">{agent.name}</h3>
                          <p className="text-xs text-indigo-300">{agent.role_title}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-mono border ${
                          isCaptain
                            ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {isCaptain ? 'Captain' : 'Officer'}
                      </span>
                    </div>

                    <div className="space-y-3 mt-4 text-xs">
                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Routing Description
                        </span>
                        <p className="text-slate-300 line-clamp-2 bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                          {agent.routing_description || 'Direct helm instruction & default router.'}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1">
                          Persona Preview
                        </span>
                        <p className="text-slate-400 line-clamp-3 font-mono text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-white/5">
                          {agent.system_prompt}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-5 mt-4 border-t border-white/10">
                    <Link href={`/chat?agent=${agent.id}`}>
                      <GlassButton size="sm" variant="secondary" className="flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Chat</span>
                      </GlassButton>
                    </Link>

                    <div className="flex items-center gap-1.5">
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={() => openEdit(agent)}
                        className="p-1.5"
                      >
                        <Edit2 className="w-4 h-4 text-slate-300" />
                      </GlassButton>
                      {!isCaptain && (
                        <GlassButton
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(agent.id)}
                          className="p-1.5 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </GlassButton>
                      )}
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
