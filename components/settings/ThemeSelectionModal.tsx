'use client';

import React from 'react';
import { useSettings } from '@/lib/settings/settings-context';
import { AppTheme, THEMES, ThemeConfig } from '@/lib/settings/themes';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
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
};

interface ThemeSelectionModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

export const ThemeSelectionModal: React.FC<ThemeSelectionModalProps> = ({
  forceOpen = false,
  onClose,
}) => {
  const { currentTheme, setTheme, hasSelectedTheme, dismissThemeModal } = useSettings();
  const [selectedThemeId, setSelectedThemeId] = React.useState<AppTheme>(currentTheme);

  // Sync selected card when currentTheme updates
  React.useEffect(() => {
    setSelectedThemeId(currentTheme);
  }, [currentTheme]);

  // Modal displays if forceOpen is true, or if user hasn't selected a theme yet
  const isOpen = forceOpen || !hasSelectedTheme;

  if (!isOpen) return null;

  const handleSelectUniverse = async (themeId: AppTheme) => {
    setSelectedThemeId(themeId);
    await setTheme(themeId);
    if (onClose) {
      onClose();
    }
  };

  const handleConfirm = async () => {
    await setTheme(selectedThemeId);
    if (onClose) {
      onClose();
    } else {
      dismissThemeModal();
    }
  };

  const handleDismiss = () => {
    if (onClose) {
      onClose();
    } else {
      dismissThemeModal();
    }
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
        <div className="absolute -bottom-12 -right-12 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />

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
              You can switch universes anytime in your ship's Settings.
            </p>
          </div>

          {/* Universe Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {themesList.map((theme) => {
              const isSelected = selectedThemeId === theme.id;
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
                  }`}
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
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold uppercase ${theme.badgeBg} ${theme.badgeText} border border-white/5`}
                        >
                          {theme.leaderTitle}
                        </span>

                        {isSelected && (
                          <CheckCircle2
                            width={18}
                            height={18}
                            className="text-amber-400 shrink-0"
                          />
                        )}
                      </div>
                    </div>

                    <h3 className="text-base font-bold text-white mb-1 group-hover:text-amber-300 transition-colors">
                      {theme.name}
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
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold border-none shadow-lg shadow-amber-500/25"
              >
                <span>Enter Universe</span>
                <ArrowRight width={16} height={16} />
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};
