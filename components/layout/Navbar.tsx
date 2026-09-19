'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MessageSquare,
  Menu,
  Building2,
  ChevronDown,
  Check,
  Plus,
  Mic,
} from 'lucide-react';
import { MorningPlanningModal } from '@/components/planning/MorningPlanningModal';
import { ThemeSelectionModal } from '@/components/settings/ThemeSelectionModal';
import { VoiceHelmSheet } from '@/components/voice/VoiceHelmSheet';
import { useSettings } from '@/lib/settings/settings-context';

interface NavbarProps {
  onOpenMorningPlanning?: () => void;
  onOpenVoiceHelm?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenMorningPlanning, onOpenVoiceHelm }) => {
  const pathname = usePathname();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [isVoiceHelmInternalOpen, setIsVoiceHelmInternalOpen] = useState(false);
  const [hasReviewedToday, setHasReviewedToday] = useState(false);
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyDropdownRef = React.useRef<HTMLDivElement>(null);

  const {
    themeConfig,
    companies,
    activeCompany,
    switchCompany,
    openCompanyModal,
  } = useSettings();

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

  const handleOpenVoiceHelm = () => {
    if (onOpenVoiceHelm) {
      onOpenVoiceHelm();
    } else {
      setIsVoiceHelmInternalOpen(true);
    }
  };

  const activeCompanyName = activeCompany?.name || 'Workspace';

  return (
    <>
      <header className="fixed md:sticky top-0 inset-x-0 z-50 w-full border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
          {/* Left Cluster: Menu Button -> Profile Icon (opens Profile Switcher) -> Profile Company Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* 1. Menu button first (leftmost) */}
            <Link
              href="/menu"
              aria-label="Open Menu"
              title="Menu"
              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 ${
                pathname === '/menu'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 font-bold'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Menu width={20} height={20} />
            </Link>

            {/* 2 & 3. Profile Icon which opens Profile Switcher + Company Name */}
            <div className="relative" ref={companyDropdownRef}>
              <div className="flex items-center gap-1.5">
                {/* Profile Icon button triggering company switcher */}
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  aria-label="Open Profile Switcher"
                  title="Profile Switcher"
                  className="w-10 h-10 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 flex items-center justify-center text-indigo-400 hover:text-indigo-300 transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <Building2 width={18} height={18} />
                </button>

                {/* Current Profile Company Name text & trigger */}
                <button
                  type="button"
                  onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                  className="hidden xs:flex items-center gap-1 px-2 py-1.5 rounded-xl hover:bg-slate-900/60 transition-colors text-left focus:outline-none"
                  title="Switch Company Profile"
                >
                  <span className="max-w-[110px] sm:max-w-[170px] truncate text-xs sm:text-sm font-semibold text-white tracking-wide">
                    {activeCompanyName}
                  </span>
                  <ChevronDown width={13} height={13} className="text-slate-400 shrink-0" />
                </button>
              </div>

              {/* Profile Switcher Dropdown Menu */}
              {isCompanyDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl p-2 z-[60] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150 space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider text-slate-400 flex items-center justify-between">
                    <span>Company Workspaces</span>
                    <span className="text-indigo-400 font-bold">{companies.length}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto space-y-1">
                    {companies.length === 0 && (
                      <div className="px-2.5 py-2 text-xs text-slate-400 italic">
                        No company profiles found.
                      </div>
                    )}
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
          </div>

          {/* Right Cluster: Floating to the right (Speak With Ceo button [voice chat icon only] -> Helm Chat button [icon only]) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

            {/* Speak With Ceo Button (Voice chat, Icons only) */}
            <button
              type="button"
              onClick={handleOpenVoiceHelm}
              aria-label={`Speak With ${themeConfig.leaderTitle} (Voice Chat)`}
              title={`Speak With ${themeConfig.leaderTitle} (Voice Chat)`}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20 border border-amber-400/40 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/40 shrink-0"
            >
              <Mic width={20} height={20} />
            </button>

            {/* Helm Chat Button (Icons only) */}
            <Link
              href="/chat"
              aria-label="Helm Chat"
              title="Helm Chat"
              className={`flex items-center justify-center w-10 h-10 rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/40 shrink-0 ${
                pathname === '/chat'
                  ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30 font-bold'
                  : 'bg-slate-900/80 border-white/10 text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <MessageSquare width={20} height={20} />
            </Link>
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

      {/* Internal Voice Helm Modal Fallback */}
      <VoiceHelmSheet
        isOpen={isVoiceHelmInternalOpen}
        onClose={() => setIsVoiceHelmInternalOpen(false)}
      />
    </>
  );
};
