'use client';

import { Church } from 'lucide-react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = 'md', showText = true, className = '' }: LogoProps) {
  const sizes = {
    sm: { icon: 'w-8 h-8', text: 'text-lg', iconInner: 'w-4 h-4' },
    md: { icon: 'w-10 h-10', text: 'text-xl', iconInner: 'w-5 h-5' },
    lg: { icon: 'w-12 h-12', text: 'text-2xl', iconInner: 'w-6 h-6' },
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizes[size].icon} bg-[#3AAFDC] rounded-lg flex items-center justify-center`}
      >
        <Church className={`${sizes[size].iconInner} text-white`} />
      </div>
      {showText && (
        <span className={`font-semibold text-gray-600 dark:text-gray-300 ${sizes[size].text}`}>
          Sanctuary Connect
        </span>
      )}
    </div>
  );
}
