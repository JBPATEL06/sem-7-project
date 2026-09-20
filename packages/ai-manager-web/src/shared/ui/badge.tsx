import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
}

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', children, ...props }, ref) => {
    let variantStyles = 'bg-primary text-primary-foreground';
    if (variant === 'secondary') {
      variantStyles = 'bg-secondary text-secondary-foreground';
    } else if (variant === 'destructive') {
      variantStyles = 'bg-destructive/15 text-destructive';
    } else if (variant === 'outline') {
      variantStyles = 'border border-border text-foreground';
    }

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-md px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${variantStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Badge.displayName = 'Badge';
