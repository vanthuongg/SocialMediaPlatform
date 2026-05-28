// [auto] Reusable Avatar component
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { cn } from '@/shared/utils/cn.js';
import { getInitials, stringToColor } from '@/shared/utils/formatters.js';
import { cva } from 'class-variance-authority';

const avatarVariants = cva('relative flex shrink-0 overflow-hidden rounded-full transition-all duration-200 border border-border/40 shadow-xs', {
  variants: {
    size: {
      xxs: 'h-4 w-4 text-[8px]',
      xs: 'h-7 w-7 text-[10px]',
      sm: 'h-8 w-8 text-xs',
      md: 'h-10 w-10 text-sm',
      lg: 'h-12 w-12 text-base font-semibold',
      xl: 'h-16 w-16 text-lg font-bold',
      '2xl': 'h-20 w-20 text-xl font-bold',
      '3xl': 'h-28 w-28 text-2xl font-bold',
    },
  },
  defaultVariants: { size: 'md' },
});

/**
 * Avatar component with fallback initials and dynamic color generation.
 */
export function Avatar({ src, name, size = 'md', className, showRing = false, isOnline = false, ...props }) {
  const fallbackBg = name ? stringToColor(name) : '#7C3AED';
  const initials = getInitials(name);

  return (
    <div className={cn('relative inline-flex shrink-0 items-center justify-center', className)} {...props}>
      <AvatarPrimitive.Root className={cn(avatarVariants({ size }), showRing && 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-primary/20 shadow-md')}>
        <AvatarPrimitive.Image
          src={src}
          alt={name || 'Avatar'}
          className="h-full w-full object-cover"
        />
        <AvatarPrimitive.Fallback
          className="flex h-full w-full items-center justify-center font-bold text-white shadow-inner"
          style={{ backgroundColor: fallbackBg }}
        >
          {initials}
        </AvatarPrimitive.Fallback>
      </AvatarPrimitive.Root>

      {/* Online indicator */}
      {isOnline && (
        <span
          aria-label="Online"
          className={cn(
            'absolute bottom-0 right-0 rounded-full bg-emerald-500 ring-2 ring-background shadow-xs pointer-events-none',
            size === 'xxs' || size === 'xs' || size === 'sm' ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
          )}
        />
      )}
    </div>
  );
}

export default Avatar;


