'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Compass,
  Users,
  MessageSquare,
  Database,
  Sun,
  SlidersHorizontal,
  Menu,
  X,
  Sparkles,
  Flame,
  Coffee,
  Crown,
  Shield,
  Zap,
  Building2,
  ChevronDown,
  Check,
  Plus,
  LucideIcon,
} from 'lucide-react';
import { MorningPlanningModal } from '@/components/planning/MorningPlanningModal';
import { ThemeSelectionModal } from '@/components/settings/ThemeSelectionModal';
import { useSettings } from '@/lib/settings/settings-context';
import { AppTheme } from '@/lib/settings/themes';

const NAV_ITEMS = [
  { href: '/', label: 'Canvas', icon: Compass },
  { href: '/chat', label: 'Helm Chat', icon: MessageSquare },
  { href: '/crew', label: 'Crew Directory', icon: Users },
  { href: '/vault', label: 'Vault & Lore', icon: Database },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
  { href: '/menu', label: 'Menu', icon: Menu },
];

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

interface NavbarProps {
  onOpenMorningPlanning?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMorningPlanning }) => {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [hasReviewedToday, setHasReviewedToday] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = React.useRef<HTMLDivElement>(null);

  const {
    isConfigured,
    currentTheme,
    themeConfig,
    companies,
    activeCompany,
    switchCompany,
    openCompanyModal,
  } = useSettings();

  const ThemeIcon = THEME_ICONS[currentTheme] || Compass;

  // Close company dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyDropdownRef.current && !companyDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close company dropdown whenever route changes
  useEffect(() => {
    setIsCompanyDropdownOpen(false);
  }, [pathname]);

  const handleOpenModal = () => {
    if (onOpenMorningPlanning) {
      onOpenMorningPlanning();
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Logo & Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile Menu Page Link Button */}
            <Link
              href="/menu"
              aria-label="Open Menu"
              className={`md:hidden flex items-center justify-center w-10 h-10 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                pathname === '/menu'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 font-bold'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Menu width={20} height={20} />
            </Link>

            {/* Logo & Theme Badge */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div
                className={`w-9 h-9 rounded-xl bg-gradient-to-tr ${themeConfig.accentBg} flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform`}
              >
                <ThemeIcon width={19} height={19} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-wide text-base">Quarkmeme</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                    OPFS SQLite
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block font-mono">
                  {themeConfig.name} · {themeConfig.defaultGroup}
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-white/5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isSettingsItem = item.href === '/settings';
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-amber-600/90 text-white shadow-md shadow-amber-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon width={18} height={18} className="shrink-0" />
                  <span>{item.label}</span>
                  {isSettingsItem && !isConfigured && (
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse ml-0.5 shadow-[0_0_8px_rgba(251,191,36,0.6)]" title="API Key Unconfigured" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Header Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Company Profile Switcher Dropdown */}
            {companies.length > 0 && (
              <div className="relative" ref={companyDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-slate-200 text-xs font-medium transition-all"
                  title="Switch Company Profile"
                >
                  <Building2 width={14} height={14} className="text-indigo-400 shrink-0" />
                  <span className="max-w-[100px] sm:max-w-[130px] truncate font-semibold">
                    {activeCompany?.name || 'Workspace'}
                  </span>
                  <ChevronDown width={13} height={13} className="text-slate-400 shrink-0" />
                </button>

                {isCompanyDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-2 z-[60] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                    <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Company Workspaces</span>
                      <span className="text-indigo-400 font-bold">{companies.length}</span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {companies.map((c) => {
                        const isActive = c.id === activeCompany?.id;
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              switchCompany(c.id);
                              setIsCompanyDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left text-xs transition-colors ${
                              isActive
                                ? 'bg-indigo-600/30 text-white font-bold border border-indigo-500/40'
                                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-transparent'
                            }`}
                          >
                            <div className="truncate pr-2">
                              <div className="truncate font-semibold">{c.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{c.owners}</div>
                            </div>
                            {isActive && <Check width={14} height={14} className="text-indigo-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    <div className="pt-1.5 border-t border-white/5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsCompanyDropdownOpen(false);
                          openCompanyModal();
                        }}
                        className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 font-semibold transition-colors"
                      >
                        <Plus width={13} height={13} />
                        <span>Create New Company</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Quick Universe Switcher Trigger */}
            <button
              type="button"
              onClick={() => setIsThemeModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-slate-300 hover:text-white text-xs font-mono transition-all"
              title="Switch Universe Theme"
            >
              <ThemeIcon width={14} height={14} className={themeConfig.accentColor} />
              <span className="hidden sm:inline font-semibold">{themeConfig.name}</span>
            </button>

            {/* High-visibility Crimson Morning Planning Button */}
            <button
              onClick={handleOpenModal}
              className="relative flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold shadow-lg shadow-red-600/25 border border-red-400/30 transition-all active:scale-95 min-h-[38px] sm:min-h-[40px]"
            >
              {!hasReviewedToday && (
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                </span>
              )}
              <Sun width={15} height={15} className="text-amber-200 shrink-0" />
              <span className="whitespace-nowrap hidden xs:inline">Morning planning</span>
              <span className="whitespace-nowrap xs:hidden">Brief</span>
            </button>

            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Squad Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Internal Modal Fallback if not controlled by parent */}
      <MorningPlanningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMarkReviewed={() => setHasReviewedToday(true)}
      />

      {/* On-demand or first-time Theme Selection Modal */}
      <ThemeSelectionModal
        forceOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </>
  );
};
