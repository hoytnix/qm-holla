'use client';

import React, { useState } from 'react';
import { useSettings } from '@/lib/settings/settings-context';
import { CompanyProfile } from '@/lib/db/adapter';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import {
  Building2,
  Users,
  Compass,
  CheckSquare,
  Plus,
  Trash2,
  ArrowRight,
  Sparkles,
  X,
  Target,
} from 'lucide-react';

interface CompanySetupModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onCreated?: (profile: CompanyProfile) => void;
}

export const CompanySetupModal: React.FC<CompanySetupModalProps> = ({
  forceOpen = false,
  onClose,
  onCreated,
}) => {
  const {
    isLlmVerified,
    companies,
    createCompany,
    isCompanyModalOpen,
    closeCompanyModal,
    openThemeModal,
    isLoading,
  } = useSettings();

  const [companyName, setCompanyName] = useState('');
  const [owners, setOwners] = useState('');
  const [missionVision, setMissionVision] = useState('');
  const [todoInput, setTodoInput] = useState('');
  const [todos, setTodos] = useState<string[]>([
    'Define core quarterly roadmap & deliverables',
    'Organize vault collections and domain knowledge',
    'Assign initial tasks to division specialists',
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal displays if forceOpen is true, or if isCompanyModalOpen is true,
  // or on fresh onboarding when LLM is verified and no companies exist yet.
  const isOpen =
    forceOpen ||
    isCompanyModalOpen ||
    (!isLoading && isLlmVerified && companies.length === 0);

  if (!isOpen) return null;

  const handleAddTodo = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!todoInput.trim()) return;
    setTodos((prev) => [...prev, todoInput.trim()]);
    setTodoInput('');
  };

  const handleRemoveTodo = (index: number) => {
    setTodos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setError('Please provide a company or workspace name.');
      return;
    }
    if (!owners.trim()) {
      setError('Please provide the name(s) of the company owner(s) or creator.');
      return;
    }
    if (!missionVision.trim()) {
      setError('Please provide the mission, vision, or core operating principles.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const newProfile = await createCompany({
        name: companyName.trim(),
        owners: owners.trim(),
        mission_vision: missionVision.trim(),
        initialTodos: todos.length > 0 ? todos : undefined,
      });

      // Reset form
      setCompanyName('');
      setOwners('');
      setMissionVision('');
      setTodos([
        'Define core quarterly roadmap & deliverables',
        'Organize vault collections and domain knowledge',
        'Assign initial tasks to division specialists',
      ]);

      closeCompanyModal();

      if (onCreated) {
        onCreated(newProfile);
      }

      if (onClose) {
        onClose();
      }

      // Chain immediately to Theme Selection so user can skin this company
      openThemeModal();
    } catch (err: any) {
      console.error('Failed to create company profile:', err);
      setError(err?.message || 'Failed to create company workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDismiss = () => {
    // Only allow dismissal if at least one company already exists
    if (companies.length > 0) {
      closeCompanyModal();
      if (onClose) onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[115] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="company-setup-title"
    >
      <div className="relative w-full max-w-2xl my-auto py-6">
        {/* Glow ambient effects */}
        <div className="absolute -top-12 -left-12 w-64 h-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-64 h-64 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

        <GlassCard className="p-6 sm:p-8 border-indigo-500/30 bg-slate-900/95 shadow-2xl rounded-3xl relative overflow-hidden space-y-6">
          {/* Allow close button if companies already exist */}
          {companies.length > 0 && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X width={18} height={18} />
            </button>
          )}

          {/* Header */}
          <div className="text-center max-w-lg mx-auto space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono font-medium">
              <Building2 width={13} height={13} />
              <span>Phase 1 · Company Workspace Setup</span>
            </div>

            <h2 id="company-setup-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Create Your Company Profile
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Every venture, business, or project lives in its own sovereign profile. Configure your company details and initial task list below.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Company Name & Owners Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Building2 width={14} height={14} className="text-indigo-400" />
                  <span>Company Name</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Staples Scranton, Warhammer Minis Guild"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                  <Users width={14} height={14} className="text-indigo-400" />
                  <span>Owner Name(s)</span>
                  <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={owners}
                  onChange={(e) => setOwners(e.target.value)}
                  placeholder="e.g. Dwight Schrute, Jim Halpert"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30"
                />
              </div>
            </div>

            {/* Mission, Vision & Principles */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Target width={14} height={14} className="text-indigo-400" />
                  <span>Mission, Vision & Principles</span>
                  <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Synthesized into your Vault charter document
                </span>
              </label>
              <textarea
                rows={3}
                required
                value={missionVision}
                onChange={(e) => setMissionVision(e.target.value)}
                placeholder="e.g. Provide lightning-fast fulfillment with legendary customer service. Prioritize reliability, local community connections, and sovereign execution."
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/30 font-sans leading-relaxed resize-y"
              />
            </div>

            {/* Initial ToDO List */}
            <div className="space-y-2 pt-2 border-t border-white/5">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckSquare width={14} height={14} className="text-amber-400" />
                  <span>Initial ToDO List</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {todos.length} items will be seeded
                </span>
              </label>

              {/* Task list preview */}
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {todos.map((todo, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-white/5 text-xs text-slate-300"
                  >
                    <span className="truncate">{idx + 1}. {todo}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTodo(idx)}
                      className="text-slate-500 hover:text-rose-400 p-1 shrink-0 transition-colors"
                      title="Remove task"
                    >
                      <Trash2 width={13} height={13} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Todo Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={todoInput}
                  onChange={(e) => setTodoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTodo();
                    }
                  }}
                  placeholder="Add another initial task... (Press Enter)"
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400"
                />
                <button
                  type="button"
                  onClick={() => handleAddTodo()}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition-colors"
                >
                  <Plus width={14} height={14} />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-500/40 text-xs text-rose-300 font-mono">
                {error}
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
              <div className="text-xs text-slate-400">
                Next: Select your universe theme for this company.
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {companies.length > 0 && (
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleDismiss}
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Cancel
                  </GlassButton>
                )}
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting || !companyName.trim() || !owners.trim() || !missionVision.trim()}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white font-bold border-none shadow-lg shadow-indigo-500/25 text-xs sm:text-sm"
                >
                  <span>{isSubmitting ? 'Creating Workspace...' : 'Create Profile & Choose Theme'}</span>
                  <ArrowRight width={15} height={15} />
                </GlassButton>
              </div>
            </div>
          </form>
        </GlassCard>
      </div>
    </div>
  );
};
