'use client';

import React, { useState } from 'react';
import { useSettings, LLMProvider } from '@/lib/settings/settings-context';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { GOOGLE_AI_STUDIO_MODELS } from '@/lib/ai/models';
import {
  Sparkles,
  Bot,
  Cpu,
  KeyRound,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Eye,
  EyeOff,
  ClipboardPaste,
  ArrowRight,
  Lock,
  ExternalLink,
} from 'lucide-react';

const MODEL_PRESETS: Record<LLMProvider, { label: string; value: string; desc: string }[]> = {
  gemini: GOOGLE_AI_STUDIO_MODELS,
  openrouter: [
    { label: 'Gemini 3.8 Flash', value: 'google/gemini-3.8-flash', desc: 'Cutting-edge high-throughput multimodal' },
    { label: 'Gemini 2.5 Flash', value: 'google/gemini-2.5-flash', desc: 'Fast multimodal via OpenRouter' },
    { label: 'Claude 3.5 Sonnet', value: 'anthropic/claude-3.5-sonnet', desc: 'High intelligence & nuanced reasoning' },
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

interface LlmSetupModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
  onVerified?: () => void;
}

export const LlmSetupModal: React.FC<LlmSetupModalProps> = ({
  forceOpen = false,
  onClose,
  onVerified,
}) => {
  const {
    config,
    updateConfig,
    isLlmVerified,
    setIsLlmVerified,
    testConnection,
    isLoading,
    isLlmModalOpen,
    closeLlmModal,
    openCompanyModal,
  } = useSettings();

  const [showApiKey, setShowApiKey] = useState(false);
  const [testStatus, setTestStatus] = useState<{
    running: boolean;
    success?: boolean;
    latencyMs?: number;
    error?: string;
  }>({ running: false });

  // Modal is open if forceOpen is true, or if isLlmModalOpen is true,
  // or if app has finished initial load and LLM is not verified yet.
  const isOpen = forceOpen || isLlmModalOpen || (!isLoading && !isLlmVerified);

  if (!isOpen) return null;

  const handleProviderSelect = async (provider: LLMProvider) => {
    const presets = MODEL_PRESETS[provider];
    await updateConfig({
      provider,
      model: presets[0]?.value || config.model,
      baseUrl: DEFAULT_BASE_URLS[provider],
    });
    // Reset test status on provider switch
    setTestStatus({ running: false });
  };

  const handlePasteApiKey = async () => {
    try {
      const clipText = await navigator.clipboard.readText();
      if (clipText) {
        await updateConfig({ apiKey: clipText.trim() });
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleTestConnection = async () => {
    if (!config.apiKey.trim()) return;
    setTestStatus({ running: true });
    const res = await testConnection();
    setTestStatus({
      running: false,
      success: res.success,
      latencyMs: res.latencyMs,
      error: res.error,
    });
  };

  const handleProceed = async () => {
    if (!testStatus.success && !isLlmVerified) return;
    await setIsLlmVerified(true);
    closeLlmModal();
    if (onVerified) {
      onVerified();
    } else {
      openCompanyModal();
    }
    if (onClose) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/90 backdrop-blur-2xl p-4 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="llm-modal-title"
    >
      <div className="relative w-full max-w-2xl my-auto py-6">
        {/* Ambient background glows */}
        <div className="absolute -top-10 -left-10 w-64 h-64 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -right-10 w-64 h-64 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

        <GlassCard className="p-6 sm:p-8 border-amber-500/30 bg-slate-900/95 shadow-2xl rounded-3xl relative overflow-hidden space-y-6">
          {/* Header Banner */}
          <div className="text-center max-w-lg mx-auto space-y-2.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-medium">
              <Lock width={13} height={13} />
              <span>Phase 0 · Sovereign Intelligence Gate</span>
            </div>

            <h2 id="llm-modal-title" className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Connect Your LLM Engine
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Quarkmeme is a multi-agent personal operating system powered entirely by local client-side memory.
              Connect your model API key and successfully verify the transmission to unlock workspace creation.
            </p>
          </div>

          {/* Provider Selection */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">
              Select AI Engine Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Google Gemini Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('gemini')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  config.provider === 'gemini'
                    ? 'bg-amber-950/50 border-amber-500/70 shadow-[0_0_20px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/40'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Sparkles width={16} height={16} />
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold uppercase">
                    Free Tier
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">Google Gemini</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Recommended. Free demo keys via Google AI Studio.
                </p>
              </button>

              {/* OpenRouter Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('openrouter')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  config.provider === 'openrouter'
                    ? 'bg-indigo-950/50 border-indigo-500/70 shadow-[0_0_20px_rgba(99,102,241,0.2)] ring-1 ring-indigo-500/40'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                    <Bot width={16} height={16} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">OpenRouter</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Claude, GPT-4o, DeepSeek, & open models in 1 key.
                </p>
              </button>

              {/* OpenAI Compatible Card */}
              <button
                type="button"
                onClick={() => handleProviderSelect('openai_compatible')}
                className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden cursor-pointer ${
                  config.provider === 'openai_compatible'
                    ? 'bg-emerald-950/50 border-emerald-500/70 shadow-[0_0_20px_rgba(16,185,129,0.2)] ring-1 ring-emerald-500/40'
                    : 'bg-slate-950/60 border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Cpu width={16} height={16} />
                  </div>
                </div>
                <h3 className="text-sm font-bold text-white mb-0.5">OpenAI / Local</h3>
                <p className="text-[11px] text-slate-400 line-clamp-2">
                  Groq, Ollama (localhost), vLLM, or official OpenAI.
                </p>
              </button>
            </div>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <span className="flex items-center gap-1.5">
                <KeyRound width={14} height={14} className="text-amber-400" />
                <span>API Key</span>
                <span className="text-rose-400">*</span>
              </span>

              {config.provider === 'gemini' && (
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-amber-300 inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Get Google AI Studio Key</span>
                  <ExternalLink width={11} height={11} />
                </a>
              )}
              {config.provider === 'openrouter' && (
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 text-[11px]"
                >
                  <span>Get OpenRouter Key</span>
                  <ExternalLink width={11} height={11} />
                </a>
              )}
            </div>

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
            <p className="text-[11px] text-slate-400">
              Your API key never leaves your browser: it is stored directly in your local OPFS SQLite engine.
            </p>
          </div>

          {/* Model & Base URL Preset Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Model Preset
              </label>
              <select
                value={config.model}
                onChange={(e) => updateConfig({ model: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
              >
                {MODEL_PRESETS[config.provider].map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label} ({m.value})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-300">
                Base URL Endpoint
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => updateConfig({ baseUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-400 font-mono"
              />
            </div>
          </div>

          {/* Test Status Feedback Display */}
          {testStatus.success !== undefined && (
            <div
              className={`p-3.5 rounded-2xl border text-xs font-mono flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
                testStatus.success
                  ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300'
                  : 'bg-rose-950/50 border-rose-500/50 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                {testStatus.success ? (
                  <CheckCircle2 width={17} height={17} className="text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle width={17} height={17} className="text-rose-400 shrink-0" />
                )}
                <span>
                  {testStatus.success
                    ? `Transmission Verified! Latency: ${testStatus.latencyMs}ms`
                    : `Connection Failed: ${testStatus.error}`}
                </span>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-white/10">
            <div className="text-xs text-slate-400">
              Connection verification required to proceed.
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <GlassButton
                type="button"
                variant="secondary"
                onClick={handleTestConnection}
                disabled={testStatus.running || !config.apiKey.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-xs sm:text-sm"
              >
                {testStatus.running ? (
                  <RefreshCw width={15} height={15} className="animate-spin" />
                ) : (
                  <Zap width={15} height={15} className="text-amber-400" />
                )}
                <span>{testStatus.running ? 'Testing Transmission...' : 'Test Connection'}</span>
              </GlassButton>

              <GlassButton
                type="button"
                variant="primary"
                onClick={handleProceed}
                disabled={!testStatus.success && !isLlmVerified}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border-none shadow-lg shadow-amber-500/25 text-xs sm:text-sm"
              >
                <span>Continue to Company Setup</span>
                <ArrowRight width={15} height={15} />
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
