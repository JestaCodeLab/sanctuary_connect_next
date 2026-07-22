'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Target, Wallet, TrendingUp, Hash, Receipt } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Button, Card, ProgressBar } from '@/components/ui';
import { financeApi, donationsApi, expensesApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import type { Donation, Expense } from '@/types';

type Tab = 'donations' | 'expenses';

const statusBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'error',
};

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function ProjectReportContent({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('donations');
  const limit = 20;
  const { formatCurrency } = useCurrency();

  const { data: projects = [], isLoading: isProjectLoading } = useQuery({
    queryKey: ['finance', 'projects'],
    queryFn: financeApi.getProjects,
  });
  const project = projects.find((p) => p._id === id);

  const { data, isLoading: isDonationsLoading } = useQuery({
    queryKey: ['donations', 'project', id, page],
    queryFn: () => donationsApi.getAllPaginated({ fundBucketId: id, page, limit }),
    enabled: !!project,
  });

  const donations = data?.donations || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.total || 0;

  // Unpaginated — a project's tied expenses are expected to stay small
  // relative to its donation history, matching the main Expenses page.
  const { data: expenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', 'project', id],
    queryFn: () => expensesApi.getAll({ projectId: id }),
    enabled: !!project,
  });

  // Tabs and the expense stat card only appear once at least one expense has
  // actually been tied to this project — otherwise the page stays exactly as
  // it was (donations only, no empty "Expenses" tab to click through).
  const hasExpenses = expenses.length > 0;

  const handleExportDonationsCSV = async () => {
    if (totalRecords === 0) return;

    const allDonations = await donationsApi.getAll({ fundBucketId: id });

    const rows: string[][] = [
      ['Donor', 'Amount', 'Payment Method', 'Event', 'Date'],
      ...allDonations.map((d: Donation) => [
        d.donorId ? `${d.donorId.firstName} ${d.donorId.lastName}` : (d.donorName || 'Anonymous'),
        d.amount.toString(),
        d.paymentMethod || 'N/A',
        d.eventId?.title || '',
        formatDate(d.donationDate),
      ]),
    ];

    const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.name || 'project'}-donations-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportExpensesCSV = () => {
    if (expenses.length === 0) return;

    const rows: string[][] = [
      ['Date', 'Description', 'Category', 'Vendor', 'Payment Method', 'Status', 'Amount'],
      ...expenses.map((e: Expense) => [
        formatDate(e.date),
        e.description || '',
        e.category,
        e.vendor || '',
        e.paymentMethod?.replace('_', ' ') || 'N/A',
        e.status,
        e.amount.toString(),
      ]),
    ];

    const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${project?.name || 'project'}-expenses-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    if (activeTab === 'expenses') {
      handleExportExpensesCSV();
    } else {
      handleExportDonationsCSV();
    }
  };

  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <Card padding="md" className="text-center py-12">
        <p className="text-muted">Project not found</p>
        <Link href="/dashboard/finance/projects" className="text-primary hover:underline mt-2 inline-block text-sm">
          Back to Projects
        </Link>
      </Card>
    );
  }

  const progress = project.targetAmount ? (project.raisedAmount / project.targetAmount) * 100 : 0;

  const stats = [
    { label: 'Raised', value: formatCurrency(project.raisedAmount), icon: Wallet },
    { label: 'Target', value: project.targetAmount ? formatCurrency(project.targetAmount) : '—', icon: Target },
    { label: 'Progress', value: project.targetAmount ? `${Math.round(progress)}%` : '—', icon: TrendingUp },
    { label: 'Donations', value: project.donationCount.toLocaleString(), icon: Hash },
    ...(hasExpenses
      ? [{ label: 'Total Expenses', value: formatCurrency(project.expensedAmount), icon: Receipt }]
      : []),
  ];

  const isTableLoading = activeTab === 'donations' ? isDonationsLoading : isExpensesLoading;

  return (
    <div>
      <Link href="/dashboard/finance/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <PageHeader title={project.name} description={project.description || 'Project details'} />

      <div className="flex items-center gap-2 -mt-6 mb-8">
        {project.groupId && typeof project.groupId !== 'string' && (
          <Badge variant="info">{project.groupId.name}</Badge>
        )}
        {project.status === 'archived' && <Badge variant="muted">Archived</Badge>}
        {project.status === 'completed' && <Badge variant="success">Completed</Badge>}
        {project.targetDate && <span className="text-sm text-muted">Target date: {formatDate(project.targetDate)}</span>}
      </div>

      {project.targetAmount ? (
        <Card padding="md" className="mb-8">
          <ProgressBar progress={progress} size="md" />
        </Card>
      ) : null}

      <StatsGrid stats={stats} />

      <Card padding="none">
        {hasExpenses ? (
          <div className="px-6 pt-2 flex items-center justify-between border-b border-border">
            <div className="flex gap-2">
              {([
                { id: 'donations' as const, label: 'Donations' },
                { id: 'expenses' as const, label: 'Expenses' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="outline" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        ) : (
          <div className="p-6 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Donations</h2>
              <p className="text-sm text-muted mt-1">All donations recorded against this project</p>
            </div>
            <Button variant="outline" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
              Export
            </Button>
          </div>
        )}

        {isTableLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'donations' ? (
          donations.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No donations yet"
              description="Donations recorded against this project will appear here."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Donor</th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Event</th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Payment Method</th>
                      <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                      <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {donations.map((donation) => (
                      <tr key={donation._id} className="hover:bg-background transition-colors">
                        <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                          {donation.donorId ? `${donation.donorId.firstName} ${donation.donorId.lastName}` : (donation.donorName || 'Anonymous')}
                        </td>
                        <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">{donation.eventId?.title || '—'}</td>
                        <td className="px-6 py-4 text-sm text-muted whitespace-nowrap capitalize">{donation.paymentMethod?.replace('_', ' ') || '—'}</td>
                        <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatDate(donation.donationDate)}</td>
                        <td className="px-6 py-4 text-sm font-medium text-foreground text-right whitespace-nowrap">
                          {formatCurrency(donation.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-border">
                  <p className="text-sm text-muted">
                    Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, totalRecords)} of {totalRecords}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm text-muted px-2">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Expenses recorded against this project will appear here."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Status</th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense) => (
                  <tr key={expense._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-[200px] truncate">{expense.description || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="muted">{expense.category}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">{expense.vendor || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={statusBadgeVariant[expense.status] || 'muted'}>
                        {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground text-right whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function ProjectReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <FinanceAccessGuard>
      <ProjectReportContent id={id} />
    </FinanceAccessGuard>
  );
}
