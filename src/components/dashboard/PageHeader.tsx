'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
}

export default function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon, onAction }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted mt-1">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} leftIcon={ActionIcon ? <ActionIcon className="w-4 h-4" /> : undefined}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
