'use client';

import React, { useState } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSettings, LLMProvider } from '@/lib/settings/settings-context';
import {
  Sparkles,
  Bot,
  Cpu,
  Eye,
  EyeOff,
  ClipboardPaste,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Download,
  Trash2,
  RefreshCw,
  HardDrive,
  ShieldCheck,
  Zap,
  Gauge,
} from 'lucide-react';

const MODEL_PRESETS: Record<LLMProvider, { label: string; value: string; desc: string }[]> = {
  gemini: [
    { label: 'Gemini 2.5 Flash (Recommended)', value: 'gemini-2.5-flash', desc: 'Ultra-fast, low-latency, free demo tier via Google AI Studio' },
    { label: 'Gemini 2.5 Pro', value: 'gemini-2.5-pro', desc: 'Deep reasoning, large context window' },
    { label: 'Gemini 1.5 Flash', value: 'gemini-1.5-flash', desc: 'High-throughput legacy fast model' },
  ],
  openrouter: [
    { label: 'Gemini 2.5 Flash', value: 'google/gemini-2.5-flash', desc: 'Fast multimodal via OpenRouter' },
    { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet', desc: 'High intelligence and nuanced writing' },
    { label: 'DeepSeek Chat (V3)', value: 'deepseek/deepseek-chat', desc: 'Cost-effective reasoning & coding' },
    { label: 'GPT-4o Mini', value: 'openai/gpt-4o-mini', desc: 'Fast, compact multimodal model' },
  ],
  openai_compatible: [
    { label: 'GPT-4o Mini', value: 'gpt-4o-mini', desc: 'OpenAI default efficient model' },
    { label: 'Llama 3.3 70B (Groq)', value: 'llama-3.3-70b-versatile', desc: 'Groq ultra-fast open weights' },
    { label: 'Local Ollama / vLLM', value: 'local-model', desc: 'Self-hosted Ollama or vLLM instance' },
  ],
};

const DEFAULT_BASE_URLS: Record<LLMProvider, string> = {
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  openrouter: 'https://openrouter.ai/api/v1',
  openai_compatible: 'https://api.openai.com/v1',
};

export default function SettingsPage() {
  const {
    config,
    updateConfig,
    isConfigured,
    testConnection,
    exportVaultData,
    flushLocalStorage,
  } = useSettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    running: boolean;
    success?: boolean;
    latencyMs?: number;
    error?: string;
  }>({ running: false });

  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [showFlushModal, setShowFlushModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleProviderSelect = (provider: LLMProvider) => {
    const presets = MODEL_PRESETS[provider];
    updateConfig({
      provider,
      model: presets[0]?.value || config.model,
      baseUrl: DEFAULT_BASE_URLS[provider],
    });
  };

  const handlePasteApiKey = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        updateConfig({ apiKey: clipText.trim() });
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleTestConnection = async () => {
    setTestStatus({ running: true });
    const res = await testConnection();
    setTestStatus({
      running: false,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error,
    });
  };

  const handleSaveSettings = () => {
    setSaveFeedback('Engine settings safely written to browser OPFS SQLite.');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const dataStr = await exportVaultData();
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quarkmeme-vault-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export vault data:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleConfirmFlush = async () => {
    await flushLocalStorage();
    setShowFlushModal(false);
    setSaveFeedback('Local settings and browser cache cleared.');
    setTimeout(() => setSaveFeedback(null), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Header & Status Banner */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                  <Flame width={20} height={20} />
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Ship's Engine & Settings
                </h1>
              </div>
              <p className="text-sm text-slate-400">
                Configure your LLM fuel. Your keys are encrypted and stored exclusively in browser-secured OPFS storage.
              </p>
            </div>

            {/* Status Badge */}
            <div className="shrink-0">
              {isConfigured ? (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Ready · Fuel Loaded</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-medium">
                  <AlertTriangle width={14} height={14} className="text-amber-400" />
                  <span>Missing Key · Offline Mode</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Provider Selector Tab Cards */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              1. Select LLM Fuel Provider
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Gemini Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('gemini')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  config.provider === 'gemini'
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-[0_0_20px_rgba(245,158,11,0.15)] ring-1 ring-amber-500/40'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sparkles width={18} height={18} />
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 font-mono font-bold uppercase">
                    Recommended
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">Google Gemini</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Ultra-fast, low-latency, free demo tier via Google AI Studio keys.
                </p>
              </button>

              {/* OpenRouter Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('openrouter')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  config.provider === 'openrouter'
                    ? 'bg-indigo-950/40 border-indigo-500/60 shadow-[0_0_20px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/40'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Bot width={18} height={18} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">OpenRouter</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Universal access: Claude, GPT-4o, Gemini, DeepSeek via a single key.
                </p>
              </button>

              {/* OpenAI / Self-Hosted Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('openai_compatible')}
                className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                  config.provider === 'openai_compatible'
                    ? 'bg-emerald-950/40 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/40'
                    : 'bg-slate-900/60 border-white/10 hover:border-white/20 hover:bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Cpu width={18} height={18} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">OpenAI / Self-Hosted</h3>
                <p className="text-xs text-slate-400 line-clamp-2">
                  Custom Base URL, Groq, Ollama (localhost), vLLM, or official OpenAI.
                </p>
              </button>
            </div>
          </section>

          {/* Configuration Fields */}
          <GlassCard className="p-6 space-y-6 border-white/10 bg-slate-900/80">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              2. Provider Engine Configuration
            </h2>

            {/* API Key */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>
                  Provider API Key <span className="text-rose-400">*</span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Stored strictly in browser OPFS SQLite
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  value={config.apiKey}
                  onChange={(e) => updateConfig({ apiKey: e.target.value.trim() })}
                  placeholder={
                    config.provider === 'gemini'
                      ? 'AIzaSy...'
                      : config.provider === 'openrouter'
                      ? 'sk-or-v1-...'
                      : 'sk-...'
                  }
                  className="w-full px-4 py-2.5 pr-20 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 font-mono"
                />
                <div className="absolute right-2 flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    title={showApiKey ? 'Hide Key' : 'Reveal Key'}
                  >
                    {showApiKey ? <EyeOff width={15} height={15} /> : <Eye width={15} height={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={handlePasteApiKey}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                    title="Paste from Clipboard"
                  >
                    <ClipboardPaste width={15} height={15} />
                  </button>
                </div>
              </div>
            </div>

            {/* Model Name & Presets Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Model Presets
                </label>
                <select
                  value={config.model}
                  onChange={(e) => updateConfig({ model: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
                >
                  {MODEL_PRESETS[config.provider].map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label} ({m.value})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-300">
                  Custom Model Name
                </label>
                <input
                  type="text"
                  value={config.model}
                  onChange={(e) => updateConfig({ model: e.target.value })}
                  placeholder="e.g. gemini-2.5-flash or gpt-4o-mini"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>
            </div>

            {/* Custom Base URL (Editable for all, especially openai_compatible) */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Base Endpoint URL</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Default: {DEFAULT_BASE_URLS[config.provider]}
                </span>
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                placeholder={DEFAULT_BASE_URLS[config.provider]}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>

            {/* Requests Per Minute (RPM) Rate Limit Setting */}
            <div className="space-y-3 pt-2 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-slate-300 flex items-center gap-2">
                  <Gauge width={16} height={16} className="text-amber-400" />
                  <span>Requests Per Minute (RPM)</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={config.requestsPerMinute ?? 4}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (!isNaN(val) && val >= 1) {
                        updateConfig({ requestsPerMinute: Math.min(120, Math.max(1, val)) });
                      }
                    }}
                    className="w-20 px-2.5 py-1 text-right rounded-lg bg-slate-950 border border-white/10 text-sm font-mono text-amber-300 focus:outline-none focus:border-amber-400"
                  />
                  <span className="text-xs text-slate-400 font-mono">RPM</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={1}
                  max={60}
                  step={1}
                  value={config.requestsPerMinute ?? 4}
                  onChange={(e) => updateConfig({ requestsPerMinute: parseInt(e.target.value, 10) })}
                  className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-amber-500 border border-white/10"
                />
                <span className="text-xs font-mono text-slate-400 shrink-0 w-12 text-right">
                  {config.requestsPerMinute ?? 4}/min
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Paces automated crew delegations and tool calls to remain safely within provider rate limits (default: 4 RPM for Gemini free tier).
              </p>
            </div>

            {/* Actions: Test Transmission & Save Settings */}
            <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/10">
              <div className="flex items-center gap-3">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleTestConnection}
                  disabled={testStatus.running || !config.apiKey}
                  className="flex items-center gap-2"
                >
                  {testStatus.running ? (
                    <RefreshCw width={16} height={16} className="animate-spin" />
                  ) : (
                    <Zap width={16} height={16} className="text-amber-400" />
                  )}
                  <span>Test Transmission</span>
                </GlassButton>

                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleSaveSettings}
                  className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 border-amber-400/40"
                >
                  <ShieldCheck width={16} height={16} />
                  <span>Save Engine Settings</span>
                </GlassButton>
              </div>

              {/* Status or Latency output */}
              {testStatus.success !== undefined && (
                <div
                  className={`text-xs font-mono px-3 py-1.5 rounded-xl border flex items-center gap-2 ${
                    testStatus.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}
                >
                  {testStatus.success ? (
                    <>
                      <CheckCircle2 width={14} height={14} />
                      <span>Ping Successful ({testStatus.latencyMs}ms)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle width={14} height={14} />
                      <span>Failed: {testStatus.error}</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {saveFeedback && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
                <CheckCircle2 width={15} height={15} className="text-emerald-400 shrink-0" />
                <span>{saveFeedback}</span>
              </div>
            )}
          </GlassCard>

          {/* Data Management & Vault Controls */}
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              3. Local Sovereign Vault Management
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <GlassCard className="p-5 border-white/10 bg-slate-900/60 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                    <Download width={18} height={18} className="text-indigo-400" />
                    <span>Export Vault Data</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Download a full JSON archive of your agents, markdown vault documents, and tasks directly from OPFS SQLite.
                  </p>
                </div>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleExportData}
                  disabled={isExporting}
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <RefreshCw width={15} height={15} className="animate-spin" />
                  ) : (
                    <Download width={15} height={15} />
                  )}
                  <span>Export Vault Data (.json)</span>
                </GlassButton>
              </GlassCard>

              <GlassCard className="p-5 border-white/10 bg-slate-900/60 flex flex-col justify-between space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-white font-bold text-sm mb-1">
                    <Trash2 width={18} height={18} className="text-rose-400" />
                    <span>Flush Local Storage</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Reset local configuration keys and cached credentials back to defaults.
                  </p>
                </div>
                <GlassButton
                  type="button"
                  variant="danger"
                  onClick={() => setShowFlushModal(true)}
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Trash2 width={15} height={15} />
                  <span>Flush Local Storage</span>
                </GlassButton>
              </GlassCard>
            </div>
          </section>
        </div>

        {/* Flush Confirmation Modal */}
        {showFlushModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <GlassCard className="p-6 max-w-md w-full border-rose-500/30 bg-slate-900/95 shadow-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <AlertTriangle width={20} height={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Clear Local Keys & Settings?</h3>
                  <p className="text-xs text-slate-400">
                    This will clear all saved LLM keys from browser cache and reset provider settings to defaults.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <GlassButton
                  variant="secondary"
                  onClick={() => setShowFlushModal(false)}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="danger"
                  onClick={handleConfirmFlush}
                >
                  Yes, Flush Storage
                </GlassButton>
              </div>
            </GlassCard>
          </div>
        )}
      </main>
    </div>
  );
}
