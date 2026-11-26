import { forwardRef } from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-bold transition-colors motion-safe:transition-transform motion-safe:duration-150 motion-safe:active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-b from-[#ffc13a] to-[#ff9a0a] text-primary-foreground shadow-neon hover:brightness-110',
        ghost:
          'border border-primary/60 bg-transparent text-accent shadow-neon-sm hover:bg-primary/10',
        outline: 'border border-border bg-transparent text-secondary hover:text-primary',
      },
      size: {
        default: 'min-h-12 px-7 text-base',
        sm: 'min-h-9 px-4 text-sm',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

const Button = forwardRef(({ className, variant, size, ...props }, ref) => (
  <button ref={ref} className={cn(buttonVariants({ variant, size }), className)} {...props} />
));
Button.displayName = 'Button';

export { Button, buttonVariants };
