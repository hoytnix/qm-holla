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
      primary: 'bg-primary/20 hover:bg-primary/30 text-primary border-primary/20',
      secondary: 'bg-black/20 hover:bg-black/30 text-white border-white/10',
      ghost: 'bg-transparent hover:bg-white/10 text-white border-transparent',
      danger: 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/20',
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
          'inline-flex items-center justify-center rounded-xl border backdrop-blur-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed font-medium',
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
