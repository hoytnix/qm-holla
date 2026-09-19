'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Users, MessageSquare, Database, Sun, SlidersHorizontal, Menu, X } from 'lucide-react';
import { MorningPlanningModal } from '@/components/planning/MorningPlanningModal';
import { useSettings } from '@/lib/settings/settings-context';

const NAV_ITEMS = [
  { href: '/', label: 'Canvas', icon: Compass },
  { href: '/chat', label: 'Helm Chat', icon: MessageSquare },
  { href: '/crew', label: 'Crew Directory', icon: Users },
  { href: '/vault', label: 'Vault & Lore', icon: Database },
  { href: '/settings', label: 'Settings', icon: SlidersHorizontal },
];

interface NavbarProps {
  onOpenMorningPlanning?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMorningPlanning }) => {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasReviewedToday, setHasReviewedToday] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isConfigured } = useSettings();

  // Close mobile navigation drawer whenever route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Lock background scroll when mobile navigation drawer is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

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
            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500/40"
            >
              {isMobileMenuOpen ? (
                <X width={20} height={20} />
              ) : (
                <Menu width={20} height={20} />
              )}
            </button>

            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white shadow-[0_0_15px_rgba(245,158,11,0.4)] group-hover:scale-105 transition-transform">
                <span className="font-mono font-black text-lg">Q</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-white tracking-wide text-base">Quarkmeme</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">
                    OPFS SQLite
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 hidden sm:block">Local-First Multi-Agent Canvas</p>
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
              <span>Fleet Active</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer & Backdrop */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop overlay */}
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Slide-over Drawer */}
          <div className="relative z-10 w-4/5 max-w-xs h-full bg-slate-950 border-r border-white/10 shadow-2xl flex flex-col justify-between p-5">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-red-600 flex items-center justify-center text-white font-mono font-bold text-base shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                    Q
                  </div>
                  <div>
                    <span className="font-bold text-white text-sm block leading-tight">Quarkmeme</span>
                    <span className="text-[10px] text-emerald-400 font-mono">Local Sovereign OS</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close navigation"
                >
                  <X width={18} height={18} />
                </button>
              </div>

              {/* Navigation Links List */}
              <nav className="mt-5 space-y-1.5">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  const isSettingsItem = item.href === '/settings';

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-amber-600 text-white font-bold shadow-lg shadow-amber-600/30'
                          : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent hover:border-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon width={20} height={20} className="shrink-0" />
                        <span>{item.label}</span>
                      </div>

                      {isSettingsItem && !isConfigured && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          Setup
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* Mobile Drawer Footer */}
            <div className="pt-4 border-t border-white/10 space-y-3">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1 text-xs">
                <div className="flex items-center justify-between text-slate-300 font-medium">
                  <span>Engine Storage</span>
                  <span className="text-emerald-400 font-mono text-[11px]">IndexedDB / WASM</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Zero cloud database bills. Sovereign local memory.
                </p>
              </div>

              <div className="flex items-center justify-between px-1 text-[11px] text-slate-500 font-mono">
                <span>Quarkmeme v1.0.0</span>
                <span className="inline-flex items-center gap-1.5 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  Fleet Online
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Internal Modal Fallback if not controlled by parent */}
      <MorningPlanningModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onMarkReviewed={() => setHasReviewedToday(true)}
      />
    </>
  );
};
