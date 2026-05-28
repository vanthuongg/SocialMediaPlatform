// [auto] Reusable Button variants
import { cva } from 'class-variance-authority';
import { cn } from '@/shared/utils/cn.js';
import { Slot } from '@radix-ui/react-slot';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary/95 hover:shadow-primary/25 hover:shadow-lg active:scale-[0.97]',
        secondary:
          'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/90 hover:shadow-secondary/25 hover:shadow-md active:scale-[0.97]',
        outline:
          'border border-border/80 bg-background/50 backdrop-blur-md text-foreground hover:bg-accent hover:border-primary/40 hover:text-primary active:scale-[0.97]',
        ghost:
          'text-foreground hover:bg-accent/80 hover:text-primary active:scale-[0.97]',
        destructive:
          'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 hover:shadow-destructive/20 hover:shadow-md active:scale-[0.97]',
        gradient:
          'bg-nova-gradient text-white font-bold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/50 hover:brightness-110 hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 animate-btn-glow',
        glass:
          'glass border border-white/20 dark:border-white/10 text-foreground hover:bg-white/90 dark:hover:bg-card/90 shadow-sm active:scale-[0.97]',
        link:
          'text-primary underline-offset-4 hover:underline p-0 h-auto font-medium',
      },
      size: {
        xs: 'h-7 px-3 text-xs rounded-lg',
        sm: 'h-8.5 px-3.5 text-xs rounded-lg',
        md: 'h-10 px-4 text-sm rounded-xl',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-8 text-base rounded-2xl tracking-wide',
        xl: 'h-13 px-8 text-base rounded-2xl font-bold',
        icon: 'h-10 w-10 rounded-xl',
        'icon-sm': 'h-8.5 w-8.5 rounded-lg',
        'icon-xs': 'h-7 w-7 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(({ className, variant, size, asChild = false, isLoading = false, children, ...props }, ref) => {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>Processing...</span>
        </>
      ) : children}
    </Comp>
  );
});

Button.displayName = 'Button';
export { Button, buttonVariants };
export default Button;

