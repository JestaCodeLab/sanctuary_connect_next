import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'success' | 'warning' | 'info' | 'outline';
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variantStyles = {
      default: 'bg-blue-100 text-blue-900',
      secondary: 'bg-gray-100 text-gray-900',
      destructive: 'bg-red-100 text-red-900',
      success: 'bg-green-100 text-green-900',
      warning: 'bg-yellow-100 text-yellow-900',
      info: 'bg-cyan-100 text-cyan-900',
      outline: 'border border-gray-300 text-gray-900 bg-transparent',
    };

    return (
      <div
        ref={ref}
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${variantStyles[variant]} ${className}`}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';

export { Badge };
