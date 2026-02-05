'use client';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function ProgressBar({
  progress,
  className = '',
  showLabel = false,
  size = 'md',
}: ProgressBarProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  const sizeStyles = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full ${className}`}>
      <div className={`w-full bg-gray-200 dark:bg-gray-700 rounded-full ${sizeStyles[size]}`}>
        <div
          className={`bg-[#3AAFDC] rounded-full transition-all duration-500 ease-out ${sizeStyles[size]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
      {showLabel && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 text-right">
          {clampedProgress}% Complete
        </p>
      )}
    </div>
  );
}
