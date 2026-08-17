'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, Target, Wallet, Hash, Receipt } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Card, Input } from '@/components/ui';
import { financeApi, donationsApi, expensesApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import { type DatePreset, datePresetOptions, getPresetRange } from '@/lib/dateFilter';
import type { Donation, Expense } from '@/types';

type Tab = 'donations' | 'expenses';

// This page only offers week/month presets plus a custom range — "Last Month" is
// dropped to keep the filter row compact.
const projectDatePresetOptions = datePresetOptions.filter((o) => o.value !== 'last_month');

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

function donorLabel(donation: Donation): string {
  if (donation.donorId) return `${donation.donorId.firstName} ${donation.donorId.lastName}`;
  if (donation.donorType === 'collective') return donation.donorName ? `Collective — ${donation.donorName}` : 'Collective Contribution';
  return donation.donorName || 'Anonymous';
}

function ProjectReportContent({ id }: { id: string }) {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('donations');
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: string; end: string } | null>(null);
  const limit = 20;
  const { formatCurrency } = useCurrency();

  const dateRange = datePreset === 'custom' ? appliedCustomRange : getPresetRange(datePreset);

  const { data: projects = [], isLoading: isProjectLoading } = useQuery({
    queryKey: ['finance', 'projects'],
    queryFn: financeApi.getProjects,
  });
  const project = projects.find((p) => p._id === id);

  const { data, isLoading: isDonationsLoading } = useQuery({
    queryKey: ['donations', 'project', id, dateRange?.start, dateRange?.end, page],
    queryFn: () => donationsApi.getAllPaginated({ fundBucketId: id, startDate: dateRange?.start, endDate: dateRange?.end, page, limit }),
    enabled: !!project,
  });

  const donations = data?.donations || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.total || 0;

  // Unpaginated and unfiltered by date — a project's tied expenses are expected
  // to stay small relative to its donation history, matching the main Expenses
  // page. Fetched once regardless of status/date so "hasExpenses" below reflects
  // whether the project has ANY expense ever tied to it, not just ones that fall
  // in the currently selected date range.
  const { data: allExpenses = [], isLoading: isExpensesLoading } = useQuery({
    queryKey: ['expenses', 'project', id],
    queryFn: () => expensesApi.getAll({ projectId: id }),
    enabled: !!project,
  });

  // Tabs and the expense stat card only appear once at least one expense has
  // actually been tied to this project — otherwise the page stays exactly as
  // it was (donations only, no empty "Expenses" tab to click through).
  const hasExpenses = allExpenses.length > 0;

  const expenses = dateRange
    ? allExpenses.filter((e) => {
        const t = new Date(e.date).getTime();
        return t >= new Date(dateRange.start).getTime() && t <= new Date(`${dateRange.end}T23:59:59.999`).getTime();
      })
    : allExpenses;

  const changeDatePreset = (preset: DatePreset) => {
    if (preset === 'custom') {
      setCustomStart(appliedCustomRange?.start || '');
      setCustomEnd(appliedCustomRange?.end || '');
      setIsCustomModalOpen(true);
      return;
    }
    setDatePreset(preset);
    setPage(1);
  };

  const handleApplyCustomRange = () => {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) {
      toast.error('Start date must be before end date');
      return;
    }
    setAppliedCustomRange({ start: customStart, end: customEnd });
    setDatePreset('custom');
    setIsCustomModalOpen(false);
    setPage(1);
  };

  const handleExportDonationsCSV = async () => {
    if (totalRecords === 0) return;

    const allDonations = await donationsApi.getAll({ fundBucketId: id, startDate: dateRange?.start, endDate: dateRange?.end });

    const rows: string[][] = [
      ['Donor', 'Amount', 'Payment Method', 'Event', 'Date'],
      ...allDonations.map((d: Donation) => [
        donorLabel(d),
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

  const stats = [
    { label: 'Raised', value: formatCurrency(project.raisedAmount), icon: Wallet },
    { label: 'Target', value: project.targetAmount ? formatCurrency(project.targetAmount) : '—', icon: Target },
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

      <div className="flex items-center gap-2 -mt-6 mb-6">
        {project.groupId && typeof project.groupId !== 'string' && (
          <Badge variant="info">{project.groupId.name}</Badge>
        )}
        {project.status === 'archived' && <Badge variant="muted">Archived</Badge>}
        {project.status === 'completed' && <Badge variant="success">Completed</Badge>}
        {project.targetDate && <span className="text-sm text-muted">Target date: {formatDate(project.targetDate)}</span>}
      </div>

      <Card padding="md" className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {projectDatePresetOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => changeDatePreset(option.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                datePreset === option.value
                  ? 'bg-primary text-primary-foreground'
                  : 'border border-border bg-background hover:bg-muted'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </Card>

      <StatsGrid stats={stats} />

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                {activeTab === 'donations' ? 'Donations' : 'Expenses'}
              </h2>
              <p className="text-sm text-muted mt-1">
                {activeTab === 'donations'
                  ? 'All donations recorded against this project'
                  : 'All expenses recorded against this project'}
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleExportCSV} leftIcon={<Download className="w-3.5 h-3.5" />}>
              Export
            </Button>
          </div>

          {hasExpenses && (
            <div className="flex gap-2 mt-4">
              {([
                { id: 'donations' as const, label: 'Donations' },
                { id: 'expenses' as const, label: 'Expenses' },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary text-primary-foreground'
                      : 'border border-border bg-background hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {isTableLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activeTab === 'donations' ? (
          donations.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No Donations Found"
              description="No donations were recorded against this project in the selected period."
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
                          {donorLabel(donation)}
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
            title="No Expenses Found"
            description="No expenses were recorded against this project in the selected period."
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

      <Modal isOpen={isCustomModalOpen} onClose={() => setIsCustomModalOpen(false)} title="Custom Date Range" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
            <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
            <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setIsCustomModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleApplyCustomRange} className="flex-1">
              Apply
            </Button>
          </div>
        </div>
      </Modal>
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
