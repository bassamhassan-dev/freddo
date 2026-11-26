import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold',
  {
    variants: {
      variant: {
        default: 'border-primary/50 bg-primary/15 text-primary',
        accent: 'border-primary/40 bg-transparent text-accent',
        muted: 'border-border bg-muted/40 text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
