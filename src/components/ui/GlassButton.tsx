import React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

export const GlassButton = React.forwardRef<HTMLButtonElement, GlassButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    const variants = {
      primary: 'bg-[var(--user-primary)] hover:opacity-90 text-branding border-[var(--user-primary)]',
      secondary: 'bg-zinc-800 hover:bg-zinc-700 text-white border-white/10',
      ghost: 'bg-transparent hover:bg-white/10 text-white border-transparent',
      danger: 'bg-red-600 hover:bg-red-700 text-white border-red-600',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      icon: 'p-2',
    };

    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-xl border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium [text-shadow:0_1px_2px_rgba(255,255,255,0.8)]',
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
