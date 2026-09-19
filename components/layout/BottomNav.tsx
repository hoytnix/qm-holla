'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  MessageSquare,
  Users,
  Database,
  SlidersHorizontal,
  LucideIcon,
} from 'lucide-react';
import { useSettings } from '@/lib/settings/settings-context';

interface BottomNavTab {
  href: string;
  label: string;
  icon: LucideIcon;
}

const BOTTOM_NAV_TABS: BottomNavTab[] = [
  { href: '/', label: 'Canvas', icon: Compass },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/crew', label: 'Crew', icon: Users },
  { href: '/vault', label: 'Vault', icon: Database },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

export const BottomNav: React.FC = () => {
  const pathname = usePathname();
  const { isConfigured } = useSettings();

  return (
    <nav
      aria-label="Quick mobile navigation"
      className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-slate-950/90 backdrop-blur-xl border-t border-white/10 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-4px_24px_rgba(0,0,0,0.5)]"
    >
      <div className="flex items-center justify-around max-w-md mx-auto h-12">
        {BOTTOM_NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = pathname === tab.href;
          const isSettingsTab = tab.href === '/settings';

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-label={tab.label}
              title={tab.label}
              className={`relative flex items-center justify-center w-12 h-11 rounded-xl transition-all active:scale-90 touch-manipulation ${
                isActive
                  ? 'bg-amber-500/20 text-amber-400 shadow-sm shadow-amber-500/20 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon width={22} height={22} className="shrink-0" />

              {/* Active glow indicator dot */}
              {isActive && (
                <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]" />
              )}

              {/* Unconfigured key warning indicator on Settings tab */}
              {isSettingsTab && !isConfigured && (
                <span
                  className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  title="LLM Key Unconfigured"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
