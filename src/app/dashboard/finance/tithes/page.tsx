'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, Wallet, MoreVertical, Printer, Mail, MessageSquare, Eye, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card } from '@/components/ui';
import DonationReceipt from '@/components/dashboard/DonationReceipt';
import { donationsApi, membersApi } from '@/lib/api';
import { donationSchema, type DonationFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import { type DatePreset, datePresetOptions, getPresetRange } from '@/lib/dateFilter';
import type { Donation } from '@/types';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
];

// Uses createdAt (the actual transaction timestamp) rather than donationDate,
// which is a date-only, admin-editable field with no time-of-day component.
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function ActionMenu({ donation, onView, onPrintReceipt, onEmailReceipt, onSmsReceipt }: {
  donation: Donation;
  onView: () => void;
  onPrintReceipt: () => void;
  onEmailReceipt: () => void;
  onSmsReceipt: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <MoreVertical className="w-4 h-4 text-muted" />
      </button>
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-900 border border-border rounded-lg shadow-lg z-10 py-1">
          <button onClick={() => { onView(); setIsOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-gray-800">
            <Eye className="w-4 h-4" /> View Details
          </button>
          <button onClick={() => { onPrintReceipt(); setIsOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-gray-800">
            <Printer className="w-4 h-4" /> Print Receipt
          </button>
          <button onClick={() => { onEmailReceipt(); setIsOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-gray-800">
            <Mail className="w-4 h-4" /> Email Receipt
          </button>
          <button onClick={() => { onSmsReceipt(); setIsOpen(false); }} className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-gray-50 dark:hover:bg-gray-800">
            <MessageSquare className="w-4 h-4" /> SMS Receipt
          </button>
        </div>
      )}
    </div>
  );
}

function TithesPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Donation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<Donation | null>(null);
  const [donorType, setDonorType] = useState<'member' | 'guest'>('member');
  const [memberSearch, setMemberSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [appliedCustomRange, setAppliedCustomRange] = useState<{ start: string; end: string } | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const dateRange = datePreset === 'custom' ? appliedCustomRange : getPresetRange(datePreset);
  const isRangeReady = datePreset !== 'custom' || !!appliedCustomRange;

  const changeDatePreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setPage(1);
  };

  const { data, isLoading } = useQuery({
    queryKey: ['donations', 'tithe', dateRange?.start, dateRange?.end, page],
    queryFn: () =>
      donationsApi.getAllPaginated({
        donationType: 'tithe',
        startDate: dateRange?.start,
        endDate: dateRange?.end,
        page,
        limit,
      }),
    enabled: isRangeReady,
  });

  const filteredDonations = data?.donations || [];
  const totalPages = data?.totalPages || 1;
  const totalRecords = data?.total || 0;

  const handleCustomSearch = () => {
    if (!customStart || !customEnd) return;
    if (customStart > customEnd) {
      toast.error('Start date must be before end date');
      return;
    }
    setAppliedCustomRange({ start: customStart, end: customEnd });
    setPage(1);
  };

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      donorType: 'member',
      donorId: '',
      donorName: '',
      donorEmail: '',
      donorPhone: '',
      amount: undefined,
      donationType: 'tithe',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    },
  });

  const formDonorType = watch('donorType');

  const createMutation = useMutation({
    mutationFn: (data: DonationFormData) => donationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Tithe recorded successfully');
      reset({
        donorType: 'member',
        donorId: '',
        donorName: '',
        donorEmail: '',
        donorPhone: '',
        amount: undefined,
        donationType: 'tithe',
        donationDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        notes: '',
      });
      setIsModalOpen(false);
      setMemberSearch('');
      setDonorType('member');
      setPage(1);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.details || error?.response?.data?.error || 'Failed to record tithe';
      toast.error(msg);
    },
  });

  const editForm = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DonationFormData }) => donationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Tithe updated successfully');
      setViewTarget(null);
      setIsEditMode(false);
      editForm.reset();
    },
    onError: () => {
      toast.error('Failed to update tithe');
    },
  });

  const onSubmit = (data: DonationFormData) => {
    createMutation.mutate(data);
  };

  const handleView = (donation: Donation) => {
    setViewTarget(donation);
    setIsEditMode(false);
  };

  const handleEmailReceipt = async (donation: Donation) => {
    if (!donation.donorId) {
      toast.error('Cannot send receipt for anonymous donation');
      return;
    }
    try {
      const result = await donationsApi.sendReceipt(donation._id, 'email');
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send email receipt');
    }
  };

  const handleSmsReceipt = async (donation: Donation) => {
    if (!donation.donorId) {
      toast.error('Cannot send receipt for anonymous donation');
      return;
    }
    try {
      const result = await donationsApi.sendReceipt(donation._id, 'sms');
      toast.success(result.message);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send SMS receipt');
    }
  };

  const handleStartEdit = () => {
    if (!viewTarget) return;
    editForm.reset({
      donorId: viewTarget.donorId?._id || '',
      amount: viewTarget.amount,
      donationType: 'tithe',
      donationDate: new Date(viewTarget.donationDate).toISOString().split('T')[0],
      paymentMethod: viewTarget.paymentMethod || '',
      notes: viewTarget.notes || '',
    });
    setIsEditMode(true);
  };

  const handleExportCSV = async () => {
    if (totalRecords === 0) {
      toast.error('No tithes to export');
      return;
    }

    // Export the full filtered set, not just the current page.
    const allFilteredDonations = await donationsApi.getAll({
      donationType: 'tithe',
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    });

    const rows: string[][] = [
      ['Donor', 'Amount', 'Payment Method', 'Date'],
      ...allFilteredDonations.map((d: Donation) => [
        d.donorId ? `${d.donorId.firstName} ${d.donorId.lastName}` : 'Anonymous',
        d.amount.toString(),
        d.paymentMethod || 'N/A',
        formatDate(d.createdAt),
      ]),
    ];

    const csvContent = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `tithes-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Totals reflect the full filtered set (server-aggregated), not just the current page.
  const stats = [
    { label: 'Total Tithes', value: totalRecords.toLocaleString(), icon: DollarSign },
    { label: 'Total Amount', value: formatCurrency(data?.totalAmount || 0), icon: Wallet },
    { label: 'Average Tithe', value: formatCurrency(data?.averageAmount || 0), icon: TrendingUp },
    { label: 'This Month', value: formatCurrency(data?.monthlyTotal || 0), icon: DollarSign },
  ];

  return (
    <div>
      <PageHeader
        title="Tithes"
        description="Track and manage tithes received"
        actionLabel="Record Tithe"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <Card padding="md" className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          {datePresetOptions.map((option) => (
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

        {datePreset === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 mt-4 pt-4 border-t border-border">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Start Date</label>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">End Date</label>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
            <Button onClick={handleCustomSearch} leftIcon={<Search className="w-4 h-4" />}>
              Search
            </Button>
          </div>
        )}
      </Card>

      <StatsGrid stats={stats} />

      <Card padding="none">
        <div className="p-6 border-b border-border flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Tithes</h2>
            <p className="text-sm text-muted mt-1">A record of all tithes received</p>
          </div>
          <Button variant="outline" onClick={handleExportCSV} leftIcon={<Download className="w-4 h-4" />}>
            Export
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !isRangeReady ? (
          <EmptyState
            title="Choose a Custom Range"
            description="Select a start and end date, then click Search to view tithes."
            icon={Search}
          />
        ) : filteredDonations.length === 0 ? (
          <EmptyState
            title="No Tithes Found"
            description="No tithes were recorded in the selected period."
            icon={DollarSign}
            actionLabel="Record Tithe"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Donor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Payment Method</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  <th className="px-6 py-3 text-right text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDonations.map((donation: Donation) => (
                  <tr key={donation._id} className="border-b border-border hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-foreground">
                        {donation.donorId ? `${donation.donorId.firstName} ${donation.donorId.lastName}` : 'Anonymous'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-semibold text-foreground">
                        {formatCurrency(donation.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="muted" className="capitalize">
                        {donation.paymentMethod || 'N/A'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">{formatDate(donation.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <ActionMenu
                        donation={donation}
                        onView={() => handleView(donation)}
                        onPrintReceipt={() => setReceiptTarget(donation)}
                        onEmailReceipt={() => handleEmailReceipt(donation)}
                        onSmsReceipt={() => handleSmsReceipt(donation)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, totalRecords)} of {totalRecords}
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
      </Card>

      {/* Record Tithe Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Tithe">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Donor Type Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-3">Donor Type</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setValue('donorType', 'member');
                  setValue('donorId', '');
                  setValue('donorName', '');
                  setValue('donorEmail', '');
                  setValue('donorPhone', '');
                  setMemberSearch('');
                  setIsSearchOpen(false);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formDonorType === 'member'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background hover:bg-muted'
                }`}
              >
                Member
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue('donorType', 'guest');
                  setValue('donorId', '');
                  setMemberSearch('');
                  setIsSearchOpen(false);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  formDonorType === 'guest'
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border bg-background hover:bg-muted'
                }`}
              >
                Guest
              </button>
            </div>
          </div>

          {/* Member Selection */}
          {formDonorType === 'member' && (
            <div className="relative">
              <label className="block text-sm font-medium text-foreground mb-2">
                Select Member *
                {watch('donorId') && <span className="text-green-600 text-xs ml-2">✓ Selected</span>}
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search and click a member..."
                  value={memberSearch}
                  onChange={(e) => {
                    setMemberSearch(e.target.value);
                    setIsSearchOpen(true);
                  }}
                  onFocus={() => setIsSearchOpen(true)}
                  className={`w-full px-3 py-2 border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.donorId ? 'border-red-500' : 'border-border'
                  }`}
                />
                {isSearchOpen && memberSearch && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {members
                      .filter((m: any) =>
                        `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
                      )
                      .map((member: any) => (
                        <button
                          key={member._id}
                          type="button"
                          onClick={() => {
                            setValue('donorId', member._id);
                            setMemberSearch(`${member.firstName} ${member.lastName}`);
                            setIsSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-primary hover:text-primary-foreground transition-colors border-b border-border last:border-b-0 active:bg-primary active:text-primary-foreground"
                        >
                          <div className="font-medium">{member.firstName} {member.lastName}</div>
                          {member.email && <div className="text-xs opacity-75">{member.email}</div>}
                        </button>
                      ))}
                    {members.filter((m: any) =>
                      `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="px-3 py-2 text-sm text-muted">No members found - try another name</div>
                    )}
                  </div>
                )}
              </div>
              {errors.donorId && (
                <span className="text-sm text-red-600 mt-1 block font-medium">
                  ⚠ {errors.donorId.message}
                </span>
              )}
            </div>
          )}

          {/* Guest Donor Info */}
          {formDonorType === 'guest' && (
            <>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Donor Name *</label>
                <Input
                  placeholder="Full name"
                  {...register('donorName')}
                />
                {errors.donorName && <span className="text-sm text-red-600">{errors.donorName.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Email (Optional)</label>
                <Input
                  type="email"
                  placeholder="donor@example.com"
                  {...register('donorEmail')}
                />
                {errors.donorEmail && <span className="text-sm text-red-600">{errors.donorEmail.message}</span>}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Phone (Optional)</label>
                <Input
                  placeholder="Phone number"
                  {...register('donorPhone')}
                />
                {errors.donorPhone && <span className="text-sm text-red-600">{errors.donorPhone.message}</span>}
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
            <Input
              type="number"
              placeholder="0.00"
              {...register('amount', { valueAsNumber: true })}
            />
            {errors.amount && <span className="text-sm text-red-600">{errors.amount.message}</span>}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
            <select
              {...register('paymentMethod')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select method...</option>
              {paymentMethodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Date</label>
            <Input
              type="date"
              {...register('donationDate')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
            <Input
              placeholder="Add any notes about this tithe..."
              {...register('notes')}
            />
          </div>

          <div className="flex gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              isLoading={createMutation.isPending}
              className="flex-1"
            >
              Record Tithe
            </Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Tithe Details">
        {viewTarget && (
          <div className="space-y-4">
            {!isEditMode ? (
              <>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted">Donor</p>
                    <p className="font-medium">
                      {viewTarget.donorId ? `${viewTarget.donorId.firstName} ${viewTarget.donorId.lastName}` : 'Anonymous'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Amount</p>
                    <p className="font-medium">{formatCurrency(viewTarget.amount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Payment Method</p>
                    <p className="font-medium capitalize">{viewTarget.paymentMethod}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted">Date</p>
                    <p className="font-medium">{formatDate(viewTarget.createdAt)}</p>
                  </div>
                </div>
                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setViewTarget(null)} className="flex-1">
                    Close
                  </Button>
                  <Button onClick={handleStartEdit} className="flex-1">
                    Edit
                  </Button>
                </div>
              </>
            ) : (
              <form onSubmit={editForm.handleSubmit((data) => {
                updateMutation.mutate({ id: viewTarget._id, data });
              })} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
                  <Input
                    type="number"
                    placeholder="0.00"
                    {...editForm.register('amount', { valueAsNumber: true })}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setIsEditMode(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateMutation.isPending} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>

      {/* Print Receipt Modal */}
      <Modal isOpen={!!receiptTarget} onClose={() => setReceiptTarget(null)} title="Tithe Receipt">
        {receiptTarget && <DonationReceipt donation={receiptTarget} onClose={() => setReceiptTarget(null)} />}
      </Modal>
    </div>
  );
}

export default function TithesPage() {
  return (
    <FinanceAccessGuard>
      <TithesPageContent />
    </FinanceAccessGuard>
  );
}
