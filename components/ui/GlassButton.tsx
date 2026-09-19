'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'glow';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/40 shadow-sm shadow-indigo-500/20',
      secondary: 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 border-white/10 hover:border-white/20',
      ghost: 'bg-transparent hover:bg-white/10 text-slate-300 border-transparent',
      danger: 'bg-rose-600/80 hover:bg-rose-600 text-white border-rose-500/40',
      glow: 'bg-indigo-600 hover:bg-indigo-500 text-white border-indigo-400/50 shadow-[0_0_20px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.6)]',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2 w-9 h-9 flex items-center justify-center',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl border font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
GlassButton.displayName = 'GlassButton';
