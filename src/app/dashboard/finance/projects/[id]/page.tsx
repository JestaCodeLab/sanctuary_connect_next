'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Download, Target, Wallet, TrendingUp, Hash } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Button, Card, ProgressBar } from '@/components/ui';
import { financeApi, donationsApi } from '@/lib/api';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import type { Donation } from '@/types';

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

  const handleExportCSV = async () => {
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
  ];

  return (
    <div>
      <Link href="/dashboard/finance/projects" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Projects
      </Link>

      <PageHeader title={project.name} description={project.description || 'Project fundraising report'} />

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
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Donations</h2>
            <p className="text-sm text-muted mt-1">All donations recorded against this project</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>

        {isDonationsLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : donations.length === 0 ? (
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
