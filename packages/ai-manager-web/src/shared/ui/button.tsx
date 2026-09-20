import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'secondary' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'default', size = 'default', children, ...props }, ref) => {
    let variantStyles = 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm';
    if (variant === 'outline') {
      variantStyles = 'border border-border bg-background hover:bg-muted text-foreground';
    } else if (variant === 'ghost') {
      variantStyles = 'hover:bg-muted text-muted-foreground hover:text-foreground';
    } else if (variant === 'secondary') {
      variantStyles = 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
    } else if (variant === 'destructive') {
      variantStyles = 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
    }

    let sizeStyles = 'h-9 px-4 py-2 text-sm';
    if (size === 'sm') {
      sizeStyles = 'h-8 rounded-md px-3 text-xs';
    } else if (size === 'lg') {
      sizeStyles = 'h-11 rounded-md px-8 text-base';
    } else if (size === 'icon') {
      sizeStyles = 'h-9 w-9 p-0';
    }

    return (
      <button
        ref={ref}
        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
