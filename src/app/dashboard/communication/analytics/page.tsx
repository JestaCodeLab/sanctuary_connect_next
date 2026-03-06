'use client';

import { BarChart3, TrendingUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { PageHeader, StatsGrid, EmptyState } from '@/components/dashboard';
import { Card } from '@/components/ui';

export default function AnalyticsPage() {
  const stats = [
    { label: 'Total Messages Sent', value: 0, icon: BarChart3 },
    { label: 'Delivery Rate', value: '0%', icon: CheckCircle2 },
    { label: 'Failed Messages', value: 0, icon: AlertCircle },
    { label: 'Pending Messages', value: 0, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics"
        description="Track and analyze SMS communication metrics"
      />

      <StatsGrid stats={stats} />

      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <BarChart3 className="w-16 h-16 text-muted mb-4" />
          <h3 className="text-lg font-semibold text-foreground">No Analytics Data Yet</h3>
          <p className="text-muted text-sm mt-1">Send messages to start tracking analytics</p>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Messages by Day</h3>
            <p className="text-sm text-muted mt-1">Last 7 days</p>
          </div>
          <div className="flex items-center justify-center h-48">
            <p className="text-muted text-sm">Chart will appear here</p>
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="font-semibold text-foreground">Delivery Status</h3>
            <p className="text-sm text-muted mt-1">Message distribution</p>
          </div>
          <div className="flex items-center justify-center h-48">
            <p className="text-muted text-sm">Chart will appear here</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
