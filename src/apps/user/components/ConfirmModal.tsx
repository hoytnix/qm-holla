import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassButton } from '@/components/ui/GlassButton';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
}

export function ConfirmModal({ isOpen, onClose, onConfirm, title, message }: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-black/80 border border-white/10 p-6 rounded-2xl w-full max-w-sm space-y-4"
          >
            <h2 className="text-lg font-light">{title}</h2>
            <p className="text-white/60 text-sm">{message}</p>
            <div className="flex justify-end gap-3 pt-4">
              <GlassButton variant="secondary" onClick={onClose} className="text-xs">
                Cancel
              </GlassButton>
              <GlassButton variant="primary" onClick={onConfirm} className="text-xs bg-red-500/20 hover:bg-red-500/30 border-red-500/50">
                Delete
              </GlassButton>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
