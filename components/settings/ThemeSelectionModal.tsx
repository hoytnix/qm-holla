'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettings } from '@/lib/settings/settings-context';
import { AppTheme, THEMES, ThemeConfig } from '@/lib/settings/themes';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { db } from '@/lib/db/opfs-adapter';
import { generateCustomThemeDirect, getClientGeminiApiKey } from '@/lib/ai/client-runner';
import {
  Compass,
  Flame,
  Coffee,
  Crown,
  Shield,
  Zap,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  X,
  Lock,
  Wand2,
  RefreshCw,
  AlertTriangle,
  Film,
  LucideIcon,
} from 'lucide-react';

const THEME_ICONS: Record<AppTheme, LucideIcon> = {
  'one-piece': Compass,
  'naruto': Flame,
  'the-office': Coffee,
  'game-of-thrones': Crown,
  'ncis': Shield,
  'pokemon': Zap,
  'frieren': Sparkles,
  'custom': Sparkles,
};

interface ThemeSelectionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const router = useRouter();
  const {
    currentTheme,
    setTheme,
    hasSelectedTheme,
    dismissThemeModal,
    isThemeModalOpen,
    closeThemeModal,
    isLlmConfigured,
    isLlmVerified,
    companies,
    customUniverseQuery,
    setCustomUniverseQuery,
    setCustomThemeConfig,
    config,
  } = useSettings();

  const [selectedThemeId, setSelectedThemeId] = useState<AppTheme>(currentTheme);
  const [showKeyPromptModal, setShowKeyPromptModal] = useState(false);
  const [queryInput, setQueryInput] = useState(customUniverseQuery || '');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [generationSuccess, setGenerationSuccess] = useState<string | null>(null);

  // Sync selected card when currentTheme updates
  React.useEffect(() => {
    setSelectedThemeId(currentTheme);
  }, [currentTheme]);

  React.useEffect(() => {
    if (customUniverseQuery) {
      setQueryInput(customUniverseQuery);
    }
  }, [customUniverseQuery]);

  // Modal displays if forceOpen is true, or if opened from context (isThemeModalOpen),
  // or if user hasn't selected a theme yet, but strictly gated behind Phase 0 (LLM Verification) and Phase 1 (Company Setup)
  const isGated = !isLlmVerified || companies.length === 0;
  const isOpen = (forceOpen || isThemeModalOpen || !hasSelectedTheme) && !isGated;

  if (!isOpen) return null;

  const handleSelectUniverse = async (themeId: AppTheme) => {
    if (themeId === 'custom' && !isLlmConfigured) {
      setShowKeyPromptModal(true);
      return;
    }

    setSelectedThemeId(themeId);
    if (themeId !== 'custom') {
      await setTheme(themeId);
      if (onClose) {
        onClose();
      }
    }
  };

  const handleGenerateCustomUniverse = async () => {
    if (!queryInput.trim()) {
      setGenerateError('Please enter a movie, TV show, or book title.');
      return;
    }

    setIsGenerating(true);
    setGenerateError(null);
    setGenerationSuccess(null);

    try {
      const apiKey = config.apiKey?.trim() || getClientGeminiApiKey();
      if (!apiKey) {
        throw new Error('API key is required. Please configure your LLM API key first.');
      }

      const data = await generateCustomThemeDirect(
        apiKey,
        queryInput.trim(),
        config.model || 'gemini-2.5-flash',
        config.baseUrl
      );

      // Save custom query to context and storage
      await setCustomUniverseQuery(queryInput.trim());

      // Create and save custom theme config
      const customConfig: ThemeConfig = {
        id: 'custom',
        name: data.universeName || queryInput.trim(),
        defaultGroup: data.defaultGroup || `${queryInput.trim()} Squad`,
        tagline: data.tagline || 'Custom AI-generated crew',
        leaderTitle: data.leaderTitle || 'Leader',
        accentColor: data.accentColor || 'text-purple-400',
        accentBg: data.accentBg || 'from-purple-600 to-pink-600',
        accentBorder: data.accentBorder || 'border-purple-500/40',
        badgeBg: data.badgeBg || 'bg-purple-500/10',
        badgeText: data.badgeText || 'text-purple-300',
        description: data.description || 'Custom pop-culture universe mapping.',
      };

      await setCustomThemeConfig(customConfig);

      // Persist character updates to OPFS/IndexedDB SQLite agents table
      if (Array.isArray(data.characters) && data.characters.length > 0) {
        await db.init();
        for (const char of data.characters) {
          await db.saveAgent({
            id: char.id,
            name: `${char.characterName} (${char.thematicTitle})`,
            role_title: char.role,
            avatar_url: char.avatarIcon || null,
            system_prompt: char.systemPrompt,
            routing_description: char.routingDescription,
            parent_agent_id: char.id === 'captain-core' ? null : 'captain-core',
          });
        }
      }

      await setTheme('custom');
      setGenerationSuccess(`Successfully generated ${customConfig.name}! Agent crew updated.`);

      setTimeout(() => {
        closeThemeModal();
        if (onClose) {
          onClose();
        } else {
          dismissThemeModal();
        }
      }, 1200);
    } catch (err: any) {
      console.error('Failed custom universe generation:', err);
      setGenerateError(err?.message || 'Error generating custom universe');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedThemeId === 'custom') {
      if (!isLlmConfigured) {
        setShowKeyPromptModal(true);
        return;
      }
      if (queryInput.trim() && !generationSuccess) {
        await handleGenerateCustomUniverse();
        return;
      }
    }

    await setTheme(selectedThemeId);
    closeThemeModal();
    if (onClose) {
      onClose();
    } else {
      dismissThemeModal();
    }
  };

  const handleDismiss = () => {
    closeThemeModal();
    if (onClose) {
      onClose();
    } else {
      dismissThemeModal();
    }
  };

  const handleGoToSettings = () => {
    closeThemeModal();
    setShowKeyPromptModal(false);
    if (onClose) onClose();
    else dismissThemeModal();
    router.push('/settings');
  };

  const themesList = Object.values(THEMES);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-xl p-4 overflow-y-auto animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="theme-modal-title"
    >
      <div className="relative w-full max-w-5xl my-auto py-8">
        {/* Glow ambient effects */}
        <div className="absolute -top-12 -left-12 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

        <GlassCard className="p-6 sm:p-10 border-white/10 bg-slate-900/90 shadow-2xl rounded-3xl relative overflow-hidden">
          {/* Dismiss button if force opened or accessible */}
          {hasSelectedTheme && (
            <button
              type="button"
              onClick={handleDismiss}
              className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Close universe selector"
            >
              <X width={20} height={20} />
            </button>
          )}

          {/* Header Section */}
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-medium">
              <Sparkles width={14} height={14} />
              <span>Multi-Universe Sovereign OS</span>
            </div>

            <h2
              id="theme-modal-title"
              className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight"
            >
              Choose your vessel. Where does your journey begin?
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Select your universe to customize terminology, crew division hierarchies, and visual branding.
              Or choose Custom to map any show or movie with your configured LLM.
            </p>
          </div>

          {/* Universe Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {themesList.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
              const isCustom = theme.id === 'custom';
              const isLocked = isCustom && !isLlmConfigured;
              const Icon = THEME_ICONS[theme.id] || Compass;

              return (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => handleSelectUniverse(theme.id)}
                  className={`group relative p-5 rounded-2xl border text-left transition-all flex flex-col justify-between overflow-hidden cursor-pointer ${
                    isSelected
                      ? `bg-slate-800/80 border-amber-500/80 shadow-[0_0_25px_rgba(245,158,11,0.25)] ring-2 ring-amber-500/50`
                      : 'bg-slate-950/50 border-white/10 hover:border-white/20 hover:bg-slate-900/60'
                  } ${isLocked ? 'opacity-75' : ''}`}
                >
                  {/* Subtle top gradient accent */}
                  <div
                    className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${theme.accentBg} ${
                      isSelected ? 'opacity-100' : 'opacity-40 group-hover:opacity-100'
                    } transition-opacity`}
                  />

                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div
                        className={`w-10 h-10 rounded-xl bg-slate-900/90 border border-white/10 flex items-center justify-center ${theme.accentColor} shadow-inner group-hover:scale-105 transition-transform`}
                      >
                        <Icon width={20} height={20} />
                      </div>

                      <div className="flex items-center gap-1.5">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                            <Lock width={10} height={10} />
                            <span>Needs Key</span>
                          </span>
                        ) : (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${theme.badgeBg} ${theme.badgeText} border border-white/5`}
                          >
                            {theme.leaderTitle}
                          </span>
                        )}

                        {isSelected && (
                          <CheckCircle2
                            width={18}
                            height={18}
                            className="text-amber-400 shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors flex items-center gap-1.5">
                      <span>{theme.name}</span>
                      {isCustom && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                          AI
                        </span>
                      )}
                    </h3>

                    <div className="text-xs font-semibold text-slate-300 mb-2 font-mono">
                      {theme.defaultGroup}
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                      {theme.tagline}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span className="truncate">{theme.description}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Custom Theme Prompt Input Field (Active when Custom selected & configured) */}
          {selectedThemeId === 'custom' && (
            <div className="mb-8 p-5 rounded-2xl bg-purple-950/30 border border-purple-500/40 space-y-4 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-purple-300 font-semibold text-sm">
                  <Film width={18} height={18} className="text-purple-400" />
                  <span>Custom AI Character Mapping</span>
                </div>
                <span className="text-xs text-purple-400/80 font-mono">
                  Engine: {config.provider} ({config.model})
                </span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                Type any TV show, movie, or book title (e.g., <span className="text-purple-300 font-mono font-medium">Breaking Bad</span>, <span className="text-purple-300 font-mono font-medium">Ted Lasso</span>, <span className="text-purple-300 font-mono font-medium">Interstellar</span>, or <span className="text-purple-300 font-mono font-medium">The Matrix</span>). The structured AI mapper will dynamically cast the characters to Captain, Scholar, Shipwright, Navigator, Doctor, Cook, and Sniper.
              </p>

              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={queryInput}
                    onChange={(e) => {
                      setQueryInput(e.target.value);
                      setGenerateError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isGenerating) {
                        e.preventDefault();
                        handleGenerateCustomUniverse();
                      }
                    }}
                    placeholder="e.g. Breaking Bad, Ted Lasso, Interstellar..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-purple-500/30 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-400/40 font-medium"
                  />
                </div>

                <GlassButton
                  type="button"
                  variant="primary"
                  onClick={handleGenerateCustomUniverse}
                  disabled={isGenerating || !queryInput.trim()}
                  className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-bold border-none shadow-lg shadow-purple-500/25 shrink-0 px-5"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw width={16} height={16} className="animate-spin" />
                      <span>Casting Universe...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 width={16} height={16} />
                      <span>Cast Universe</span>
                    </>
                  )}
                </GlassButton>
              </div>

              {generateError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs text-rose-300 font-mono flex items-center gap-2">
                  <AlertTriangle width={15} height={15} className="text-rose-400 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              {generationSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs text-emerald-300 font-mono flex items-center gap-2">
                  <CheckCircle2 width={15} height={15} className="text-emerald-400 shrink-0" />
                  <span>{generationSuccess}</span>
                </div>
              )}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
            <div className="text-xs text-slate-400 text-center sm:text-left">
              Current selection:{' '}
              <span className="text-white font-semibold font-mono">
                {THEMES[selectedThemeId]?.name} ({THEMES[selectedThemeId]?.defaultGroup})
              </span>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              {hasSelectedTheme && (
                <GlassButton
                  variant="secondary"
                  onClick={handleDismiss}
                  className="w-full sm:w-auto"
                >
                  Keep Current
                </GlassButton>
              )}
              <GlassButton
                variant="primary"
                onClick={handleConfirm}
                disabled={isGenerating}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border-none shadow-lg shadow-amber-500/25"
              >
                <span>Enter Universe</span>
                <ArrowRight width={16} height={16} />
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Conditional Gating Prompt Modal: Directing to Settings */}
      {showKeyPromptModal && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
        >
          <GlassCard className="p-6 max-w-md w-full border-amber-500/40 bg-slate-900/95 shadow-2xl space-y-4 relative">
            <button
              type="button"
              onClick={() => setShowKeyPromptModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
              aria-label="Close modal"
            >
              <X width={16} height={16} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Lock width={22} height={22} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">LLM API Key Required</h3>
                <p className="text-xs text-amber-400 font-mono">Custom Theme AI Mapping</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Custom Universes require an active LLM provider (Google Gemini, OpenRouter, or OpenAI-compatible) to dynamically cast pop-culture characters to your autonomous crew.
            </p>

            <p className="text-xs text-slate-400 leading-relaxed">
              Your API key is never transmitted to cloud databases—it is stored securely and exclusively inside your local browser OPFS SQLite engine.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <GlassButton
                variant="secondary"
                onClick={() => setShowKeyPromptModal(false)}
              >
                Cancel
              </GlassButton>
              <GlassButton
                variant="primary"
                onClick={handleGoToSettings}
                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border-none"
              >
                <span>Configure in Settings</span>
                <ArrowRight width={14} height={14} />
              </GlassButton>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
};
