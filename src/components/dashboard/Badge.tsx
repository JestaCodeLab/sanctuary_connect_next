'use client';

interface BadgeProps {
  variant?: 'success' | 'warning' | 'error' | 'info' | 'muted';
  children: React.ReactNode;
}

const variantStyles = {
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  info: 'bg-[#E8F6FB] text-[#3AAFDC] dark:bg-[#3AAFDC]/20 dark:text-[#5BC0E8]',
  muted: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

export default function Badge({ variant = 'muted', children }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantStyles[variant]}`}>
      {children}
    </span>
  );
}
