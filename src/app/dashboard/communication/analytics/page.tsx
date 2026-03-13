'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, CheckCircle2, AlertCircle, MessageSquare, Send } from 'lucide-react';
import { PageHeader, StatsGrid } from '@/components/dashboard';
import SmsLogsTable from '@/components/dashboard/SmsLogsTable';
import SmsAnalytics from '@/components/dashboard/SmsAnalytics';
import { smsApi } from '@/lib/api';

const filterTabs = ['SMS Logs', 'Analytics'] as const;

export default function AnalyticsPage() {
  const [activeFilter, setActiveFilter] = useState<string>('SMS Logs');

  const { data: smsCredits } = useQuery({
    queryKey: ['sms-credits'],
    queryFn: smsApi.getCreditsBalance,
  });

  const { data: logsData } = useQuery({
    queryKey: ['sms-logs', { page: 1, limit: 1000 }],
    queryFn: () => smsApi.getSmsLogs({ page: 1, limit: 1000 }),
  });

  const logs = logsData?.logs || [];
  
  // Calculate stats from logs
  const totalSent = logs.length;
  const totalDelivered = logs.reduce((sum: number, log: any) => {
    return sum + (log.recipients?.filter((r: any) => r.status === 'delivered').length || 0);
  }, 0);
  const totalFailed = logs.reduce((sum: number, log: any) => {
    return sum + (log.recipients?.filter((r: any) => ['failed', 'undelivered'].includes(r.status)).length || 0);
  }, 0);
  const totalCreditsUsed = logs.reduce((sum: number, log: any) => sum + (log.creditsUsed || 0), 0);

  const stats = [
    { label: 'Total Campaigns', value: totalSent, icon: MessageSquare },
    { label: 'Messages Delivered', value: totalDelivered, icon: CheckCircle2 },
    { label: 'Messages Failed', value: totalFailed, icon: AlertCircle },
    { label: 'Credits Used', value: totalCreditsUsed, icon: Send },
  ];

  return (
    <div>
      <PageHeader
        title="SMS Analytics"
        description="Track and analyze SMS communication metrics"
      />

      <StatsGrid stats={stats} />

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1 mb-6 w-fit">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
              activeFilter === tab
                ? 'bg-primary text-white'
                : 'text-muted hover:text-foreground hover:bg-card'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeFilter === 'SMS Logs' && (
        <div className="space-y-4">
          <SmsLogsTable />
        </div>
      )}

      {activeFilter === 'Analytics' && (
        <div className="space-y-4">
          <SmsAnalytics />
        </div>
      )}
    </div>
  );
}
