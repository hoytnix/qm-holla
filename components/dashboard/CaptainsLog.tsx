'use client';

import React from 'react';
import Link from 'next/link';
import { Crown, Sparkles, Users, Sun, ArrowRight, Compass, Flame, Coffee, Shield, Zap, LucideIcon } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { GlassButton } from '@/components/ui/GlassButton';
import { useSettings } from '@/lib/settings/settings-context';
import { AppTheme } from '@/lib/settings/themes';

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

interface CaptainsLogProps {
  openCommitmentsCount: number;
  onOpenDailyBrief: () => void;
}

export const CaptainsLog: React.FC<CaptainsLogProps> = ({
  openCommitmentsCount,
  onOpenDailyBrief,
}) => {
  const { themeConfig, currentTheme } = useSettings();
  const ThemeIcon = THEME_ICONS[currentTheme] || Crown;

  return (
    <GlassCard className="p-6 sm:p-7 border-amber-500/30 bg-gradient-to-r from-amber-950/30 via-slate-900/60 to-cyan-950/20 mb-8 shadow-2xl relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
              <ThemeIcon width={14} height={14} className="text-amber-400" />
              <span>{themeConfig.leaderTitle}'s Log · {themeConfig.defaultGroup}</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-mono">
              {themeConfig.name} OS
            </span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            "{themeConfig.tagline}"
          </h2>

          <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
            Your personal operating system runs completely inside your browser with zero cloud database bills. Direct {themeConfig.defaultGroup} from the Helm or inspect division progress below.
          </p>

          {/* Metric Pills */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-amber-500/20 text-xs font-mono text-amber-300">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{openCommitmentsCount} open commitments</span>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-cyan-500/20 text-xs font-mono text-cyan-300">
              <Users width={14} height={14} />
              <span>One {themeConfig.leaderTitle.toLowerCase()}. Six specialists.</span>
            </div>
          </div>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-row sm:flex-col items-center sm:items-stretch gap-3 w-full sm:w-auto shrink-0">
          <GlassButton
            onClick={onOpenDailyBrief}
            variant="glow"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 text-xs py-2.5 min-h-[44px]"
          >
            <Sun width={16} height={16} className="text-amber-300 animate-spin-slow" />
            <span>Daily Brief</span>
          </GlassButton>

          <Link href="/crew" className="flex-1 sm:flex-initial">
            <GlassButton
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 text-xs py-2.5 min-h-[44px]"
            >
              <Users width={14} height={14} />
              <span>Meet the team</span>
              <ArrowRight width={14} height={14} />
            </GlassButton>
          </Link>
        </div>
      </div>
    </GlassCard>
  );
};
