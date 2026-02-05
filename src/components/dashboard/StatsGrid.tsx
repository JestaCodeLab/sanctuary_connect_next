'use client';

import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui';

interface Stat {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative';
  icon: LucideIcon;
}

interface StatsGridProps {
  stats: Stat[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat) => (
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
            <div className="w-12 h-12 bg-primary-light rounded-xl flex items-center justify-center">
              <stat.icon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
