import React from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon, LayoutDashboard, Library, DollarSign, Settings, LogOut, Activity, FileText } from 'lucide-react';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
}

interface AdminMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
}

const menuItems: MenuItem[] = [
  { icon: Activity, label: 'Dashboard', path: '/dashboard' },
  { icon: LayoutDashboard, label: 'The Archive', path: '/agents' },
  { icon: Library, label: 'The Library', path: '/knowledge' },
  { icon: DollarSign, label: 'The Tolls', path: '/economics' },
  { icon: FileText, label: 'Ledger', path: '/ledger' },
  { icon: Settings, label: 'Profile', path: '/settings' },
];

export function AdminMenu({ isOpen, onClose, onLogout }: AdminMenuProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          animate={{ opacity: 1, backdropFilter: 'blur(24px)' }}
          exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
          className="fixed inset-0 z-40 bg-black/60 overflow-y-auto custom-scrollbar py-20 px-6 flex justify-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full h-fit my-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-all duration-500 flex flex-col items-center justify-center gap-2 aspect-square"
              >
                <item.icon className="w-10 h-10 text-white/50 group-hover:text-white transition-colors duration-500" />
                <span className="text-lg font-light tracking-widest uppercase text-white/70 group-hover:text-white transition-colors duration-500">
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
