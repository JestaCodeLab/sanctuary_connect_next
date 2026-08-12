'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
  /** Icon chip accent. Defaults to primary when omitted, so existing callers are unaffected. */
  tint?: 'primary' | 'secondary';
}

interface StatsGridProps {
  stats: Stat[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
      {stats.map((stat) => {
        const isSecondary = stat.tint === 'secondary';
        return (
          <Card key={stat.label} padding="md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-foreground mt-1">{stat.value}</p>
                {stat.change && (
                  <p className={`text-sm mt-1 ${stat.changeType === 'positive' ? 'text-success' : stat.changeType === 'negative' ? 'text-error' : 'text-muted'}`}>
                    {stat.change}
                  </p>
                )}
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isSecondary ? 'bg-secondary-light' : 'bg-primary-light'}`}>
                <stat.icon className={`w-6 h-6 ${isSecondary ? 'text-secondary' : 'text-primary'}`} />
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
