'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, TrendingUp, TrendingDown, Wallet, ArrowRight } from 'lucide-react';

import { PageHeader, StatsGrid } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { financeApi } from '@/lib/api';
import FinanceChart from '@/components/dashboard/FinanceChart';

function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

const quickLinks = [
  { label: 'Income', description: 'Record and manage donations', href: '/dashboard/finance/income', icon: TrendingUp },
  { label: 'Expenses', description: 'Track and manage expenses', href: '/dashboard/finance/expenses', icon: TrendingDown },
  { label: 'Reports', description: 'Generate financial reports', href: '/dashboard/finance/reports', icon: Wallet },
];

export default function FinanceOverviewPage() {
  const { data: overview, isLoading } = useQuery({
    queryKey: ['finance', 'overview'],
    queryFn: financeApi.getOverview,
  });

  const stats = [
    {
      label: 'Total Income',
      value: formatCurrency(overview?.totalIncome ?? 0),
      icon: TrendingUp,
    },
    {
      label: 'Total Expenses',
      value: formatCurrency(overview?.totalExpenses ?? 0),
      icon: TrendingDown,
    },
    {
      label: 'Net Balance',
      value: formatCurrency(overview?.netBalance ?? 0),
      icon: DollarSign,
    },
  ];

  return (
    <div>
      <PageHeader title="Finance Overview" description="Summary of your church's financial health" />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <StatsGrid stats={stats} />

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
