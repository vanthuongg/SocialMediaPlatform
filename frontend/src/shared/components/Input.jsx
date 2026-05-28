// [auto] Form input component
import { forwardRef } from 'react';
import { cn } from '@/shared/utils/cn.js';

export const Input = forwardRef(({ className, type = 'text', error, label, hint, id, leftIcon, rightIcon, ...props }, ref) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

  return (
    <div className="space-y-1.5 w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-bold text-foreground/90 uppercase tracking-wider">
          {label}
        </label>
      )}
      <div className="relative w-full flex items-center">
        {leftIcon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10 flex items-center justify-center shrink-0">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          type={type}
          className={cn(
            'flex h-11 w-full rounded-2xl border border-border bg-card/70 dark:bg-background/60 backdrop-blur-sm px-4 py-2.5',
            'text-sm text-foreground placeholder:text-muted-foreground/60 font-medium',
            'transition-all duration-200 shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon && 'pl-10.5',
            rightIcon && 'pr-10.5',
            error && 'border-destructive/80 focus:ring-destructive/40 focus:border-destructive',
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground z-10 flex items-center justify-center shrink-0">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-xs font-medium text-destructive animate-fade-in">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-muted-foreground/80">{hint}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;


