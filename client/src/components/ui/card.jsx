import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

const Card = forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-lg border border-primary/30 bg-primary/[0.06] text-card-foreground shadow-neon-card',
      className
    )}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = forwardRef(({ className, ...props }, ref) => (
  <h3 ref={ref} className={cn('text-lg font-extrabold leading-snug', className)} {...props} />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = forwardRef(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm leading-relaxed text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-4 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = forwardRef(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-2 p-4 pt-0', className)} {...props} />
));
CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };
