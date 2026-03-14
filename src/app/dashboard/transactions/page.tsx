'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Hash,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Button, Card, Select } from '@/components/ui';
import { transactionsApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';

const typeOptions = [
  { value: '', label: 'All Types' },
  { value: 'subscription_payment', label: 'Subscription' },
  { value: 'sms_credit_purchase', label: 'SMS Credits' },
  { value: 'donation', label: 'Donation' },
  { value: 'expense', label: 'Expense' },
  { value: 'refund', label: 'Refund' },
];

const directionOptions = [
  { value: '', label: 'All Directions' },
  { value: 'inflow', label: 'Inflow' },
  { value: 'outflow', label: 'Outflow' },
];

const typeBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  subscription_payment: 'info',
  sms_credit_purchase: 'warning',
  donation: 'success',
  expense: 'error',
  refund: 'muted',
};

const typeLabels: Record<string, string> = {
  subscription_payment: 'Subscription',
  sms_credit_purchase: 'SMS Credits',
  donation: 'Donation',
  expense: 'Expense',
  refund: 'Refund',
};

const statusBadgeVariant: Record<string, 'success' | 'error' | 'warning' | 'muted'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'error',
  refunded: 'muted',
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function TransactionsPage() {
  const { formatCurrency } = useCurrency();
  const [type, setType] = useState('');
  const [direction, setDirection] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const filters = {
    ...(type && { type }),
    ...(direction && { direction }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    page,
    limit,
  };

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => transactionsApi.getAll(filters),
  });

  const summaryFilters = {
    ...(type && { type }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
  };

  const { data: summary } = useQuery({
    queryKey: ['transactions-summary', summaryFilters],
    queryFn: () => transactionsApi.getSummary(summaryFilters),
  });

  const transactions = data?.transactions || [];
  const totalPages = data?.totalPages || 1;
  const total = data?.total || 0;

  const stats = [
    { label: 'Total Inflow', value: formatCurrency(summary?.totalInflow || 0), icon: TrendingUp },
    { label: 'Total Outflow', value: formatCurrency(summary?.totalOutflow || 0), icon: TrendingDown },
    { label: 'Net', value: formatCurrency(summary?.net || 0), icon: DollarSign },
    { label: 'Transactions', value: (summary?.totalCount || 0).toLocaleString(), icon: Hash },
  ];

  const handleFilterChange = () => {
    setPage(1);
  };

  return (
    <div>
      <PageHeader
        title="All Transactions"
        description="Unified view of all financial transactions"
      />

      <StatsGrid stats={stats} />

      <Card padding="none">
        {/* Filter Bar */}
        <div className="p-4 border-b border-border flex flex-wrap gap-3 items-end">
          <div className="w-40">
            <Select
              label="Type"
              value={type}
              onChange={(e) => { setType(e.target.value); handleFilterChange(); }}
              options={typeOptions}
            />
          </div>
          <div className="w-40">
            <Select
              label="Direction"
              value={direction}
              onChange={(e) => { setDirection(e.target.value); handleFilterChange(); }}
              options={directionOptions}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">From</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); handleFilterChange(); }}
              className="px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">To</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); handleFilterChange(); }}
              className="px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {(type || direction || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setType('');
                setDirection('');
                setStartDate('');
                setEndDate('');
                setPage(1);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="No transactions yet"
            description="Transactions will appear here as financial activities occur."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Type</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Description</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Status</th>
                    <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Method</th>
                    <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {transactions.map((txn: any) => (
                    <tr key={txn._id} className="hover:bg-background transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                        {formatDate(txn.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={typeBadgeVariant[txn.type] || 'muted'}>
                          {typeLabels[txn.type] || txn.type}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground max-w-[250px] truncate">
                        {txn.description}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={statusBadgeVariant[txn.status] || 'muted'}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted whitespace-nowrap capitalize">
                        {txn.paymentMethod?.replace('_', ' ') || '—'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap text-right">
                        <span className="flex items-center justify-end gap-1">
                          {txn.direction === 'inflow' ? (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-green-500" />
                          ) : (
                            <ArrowUpRight className="w-3.5 h-3.5 text-red-500" />
                          )}
                          <span className={txn.direction === 'inflow' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}>
                            {txn.direction === 'inflow' ? '+' : '-'}{formatCurrency(txn.amount)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                <p className="text-sm text-muted">
                  Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage(page - 1)}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted px-2">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage(page + 1)}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
