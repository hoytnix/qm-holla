import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';
import { Coins, X } from 'lucide-react';

interface TopUpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCredits: number;
}

export function TopUpModal({ isOpen, onClose, currentCredits }: TopUpModalProps) {
  const packages = [
    { amount: 1000, price: 10 },
    { amount: 3000, price: 20 },
    { amount: 10000, price: 50 },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-zinc-900 border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-6 relative"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="space-y-2 text-center">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                <Coins className="text-yellow-500" size={24} />
              </div>
              <h2 className="text-2xl font-light text-white">Top Up Credits</h2>
              <p className="text-white/60 text-sm">
                Current Balance: <span className="font-mono text-yellow-500">{currentCredits}</span>
              </p>
            </div>

            <div className="space-y-3">
              {packages.map((pkg, idx) => (
                <button
                  key={idx}
                  className="w-full flex items-center justify-between p-4 rounded-xl border border-white/10 bg-zinc-800 hover:bg-zinc-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <Coins className="text-yellow-500/70 group-hover:text-yellow-500 transition-colors" size={20} />
                    <span className="text-lg font-medium text-white">{pkg.amount} Credits</span>
                  </div>
                  <span className="text-white/80 font-mono">${pkg.price}</span>
                </button>
              ))}
            </div>

            <GlassButton className="w-full justify-center" onClick={onClose}>
              Cancel
            </GlassButton>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
