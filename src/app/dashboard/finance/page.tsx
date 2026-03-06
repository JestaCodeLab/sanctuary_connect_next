'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowRight, CreditCard, Smartphone, Banknote, Globe } from 'lucide-react';

import { PageHeader, StatsGrid } from '@/components/dashboard';
import { Card, Button } from '@/components/ui';
import { financeApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';
import FinanceChart from '@/components/dashboard/FinanceChart';

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  check: 'Check',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  mobile_money: 'Mobile Money',
  online: 'Online',
  unknown: 'Other',
};

const methodIcons: Record<string, typeof DollarSign> = {
  cash: Banknote,
  card: CreditCard,
  mobile_money: Smartphone,
  online: Globe,
};

const quickLinks = [
  { label: 'Income', description: 'Record and manage donations', href: '/dashboard/finance/income', icon: TrendingUp },
  { label: 'Expenses', description: 'Track and manage expenses', href: '/dashboard/finance/expenses', icon: TrendingDown },
  { label: 'Reports', description: 'Generate financial reports', href: '/dashboard/finance/reports', icon: Wallet },
];

export default function FinanceOverviewPage() {
  const [viewMode, setViewMode] = useState<'all' | 'monthly' | 'ytd'>('all');
  const { formatCurrency } = useCurrency();

  const { data: overview, isLoading } = useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: financeApi.getOverview,
  });

  const getStatsForMode = () => {
    if (viewMode === 'monthly' && overview?.monthly) {
      return [
        { label: 'Monthly Income', value: formatCurrency(overview.monthly.income), icon: TrendingUp },
        { label: 'Monthly Expenses', value: formatCurrency(overview.monthly.expenses), icon: TrendingDown },
        { label: 'Monthly Net', value: formatCurrency(overview.monthly.net), icon: DollarSign },
      ];
    }
    if (viewMode === 'ytd' && overview?.ytd) {
      return [
        { label: 'YTD Income', value: formatCurrency(overview.ytd.income), icon: TrendingUp },
        { label: 'YTD Expenses', value: formatCurrency(overview.ytd.expenses), icon: TrendingDown },
        { label: 'YTD Net', value: formatCurrency(overview.ytd.net), icon: DollarSign },
      ];
    }
    return [
      { label: 'Total Income', value: formatCurrency(overview?.totalIncome ?? 0), icon: TrendingUp },
      { label: 'Total Expenses', value: formatCurrency(overview?.totalExpenses ?? 0), icon: TrendingDown },
      { label: 'Net Balance', value: formatCurrency(overview?.netBalance ?? 0), icon: DollarSign },
    ];
  };

  return (
    <div>
      <PageHeader title="Finance Overview" description="Summary of your church's financial health" />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* View Mode Toggle */}
          <div className="flex gap-2 mb-6">
            {(['all', 'monthly', 'ytd'] as const).map((mode) => (
              <Button
                key={mode}
                variant={viewMode === mode ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setViewMode(mode)}
              >
                {mode === 'all' ? 'All Time' : mode === 'monthly' ? 'This Month' : 'Year to Date'}
              </Button>
            ))}
          </div>

          <StatsGrid stats={getStatsForMode()} />

          {/* Income by Payment Method */}
          {overview?.incomeByMethod && overview.incomeByMethod.length > 0 && (
            <Card padding="md" className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Income by Payment Method</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {overview.incomeByMethod.map((item) => {
                  const Icon = methodIcons[item.method] || DollarSign;
                  return (
                    <div key={item.method} className="flex items-center gap-3 p-3 rounded-lg bg-background border border-border">
                      <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted truncate">{methodLabels[item.method] || item.method}</p>
                        <p className="text-sm font-semibold text-foreground">{formatCurrency(item.total)}</p>
                        <p className="text-xs text-muted">{item.count} transaction{item.count !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Monthly Trends Chart */}
          {overview?.monthlyTrends && overview.monthlyTrends.length > 0 && (
            <Card padding="md" className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">Monthly Trends (Last 6 Months)</h2>
              <FinanceChart data={overview.monthlyTrends} />
            </Card>
          )}

          {/* Quick Links */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {quickLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <Card padding="md" className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <link.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{link.label}</h3>
                        <p className="text-xs text-muted mt-0.5">{link.description}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
