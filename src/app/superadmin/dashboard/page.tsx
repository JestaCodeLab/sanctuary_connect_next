'use client';

import { useEffect, useState } from 'react';
import { Building2, Users, CreditCard, MessageSquare, TrendingUp, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

interface PlatformStats {
  totalOrgs: number;
  activeOrgs: number;
  suspendedOrgs: number;
  totalMembers: number;
  totalSmsCreditsInCirculation: number;
  planBreakdown: Record<string, { total: number; active: number }>;
}

function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div className={`bg-card rounded-xl border p-5 ${accent ? 'border-error/30' : 'border-border'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-muted-foreground">{label}</span>
        <Icon className={`w-5 h-5 ${accent ? 'text-error' : 'text-muted'}`} />
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/api/superadmin/stats')
      .then((r) => setStats(r.data))
      .catch(() => setError('Failed to load platform stats'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg">
        <AlertCircle className="w-5 h-5" />
        {error}
      </div>
    );
  }

  const plans = ['seed', 'growth', 'ascend', 'sanctuary'];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">Live stats across all churches</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Churches" value={stats?.totalOrgs ?? 0} icon={Building2} sub={`${stats?.activeOrgs} active`} />
        <StatCard label="Suspended" value={stats?.suspendedOrgs ?? 0} icon={AlertCircle} accent={(stats?.suspendedOrgs ?? 0) > 0} />
        <StatCard label="Total Members" value={(stats?.totalMembers ?? 0).toLocaleString()} icon={Users} />
        <StatCard label="SMS Credits in Circulation" value={(stats?.totalSmsCreditsInCirculation ?? 0).toLocaleString()} icon={MessageSquare} />
      </div>

      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-muted" />
          <h2 className="text-sm font-semibold text-foreground">Plan Distribution</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const data = stats?.planBreakdown[plan];
            return (
              <div key={plan} className="bg-background rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground capitalize mb-1">{plan}</p>
                <p className="text-xl font-bold text-foreground">{data?.total ?? 0}</p>
                <p className="text-xs text-muted-foreground">{data?.active ?? 0} active</p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <CreditCard className="w-4 h-4" />
        Data reflects live database state
      </div>
    </div>
  );
}
