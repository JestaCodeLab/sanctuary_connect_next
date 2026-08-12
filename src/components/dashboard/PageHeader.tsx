'use client';

import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui';

interface PageHeaderProps {
  title: string;
  description?: string;
  actionLabel?: string;
  actionIcon?: LucideIcon;
  onAction?: () => void;
  /** Extra classes for a wrapper div around the action button - e.g. "hidden lg:block" to hide it on mobile when a page provides its own mobile-only trigger (a floating action button). Applied to a wrapper, not the Button itself, since Button's own base classes already include an unconditional `inline-flex` that a same-specificity `hidden` on the Button can't reliably beat. */
  actionClassName?: string;
}

export default function PageHeader({ title, description, actionLabel, actionIcon: ActionIcon, onAction, actionClassName }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && <p className="text-muted mt-1">{description}</p>}
      </div>
      {actionLabel && onAction && (
        <div className={actionClassName}>
          <Button onClick={onAction} leftIcon={ActionIcon ? <ActionIcon className="w-4 h-4" /> : undefined}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
