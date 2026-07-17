'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, Wallet, MoreVertical, Printer, Mail, MessageSquare, Eye, Settings, Check, X, Trash2, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card } from '@/components/ui';
import DonationReceipt from '@/components/dashboard/DonationReceipt';
import { donationsApi, financeApi, membersApi, eventsApi } from '@/lib/api';
import { donationSchema, offeringTypeSchema, type DonationFormData, type OfferingTypeFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import { type DatePreset, datePresetOptions, getPresetRange } from '@/lib/dateFilter';
import type { Donation, OfferingType } from '@/types';

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

function ManageTypesModal({ isOpen, onClose, offeringTypes }: {
  isOpen: boolean;
  onClose: () => void;
  offeringTypes: OfferingType[];
}) {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const { register, handleSubmit, reset, formState: { errors } } = useForm<OfferingTypeFormData>({
    resolver: zodResolver(offeringTypeSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: OfferingTypeFormData) => financeApi.createOfferingType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'offering-types'] });
      reset();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to add offering type');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; enabled?: boolean } }) =>
      financeApi.updateOfferingType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'offering-types'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update offering type');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteOfferingType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'offering-types'] });
      toast.success('Offering type deleted');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to delete offering type');
    },
  });

  const handleDelete = (type: OfferingType) => {
    if (!window.confirm(`Delete offering type "${type.name}"? This cannot be undone.`)) return;
    deleteMutation.mutate(type._id);
  };

  const startRename = (type: OfferingType) => {
    setEditingId(type._id);
    setEditingName(type.name);
  };

  const saveRename = (id: string) => {
    if (!editingName.trim()) return;
    updateMutation.mutate({ id, data: { name: editingName.trim() } });
    setEditingId(null);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Offering Types">
      <div className="space-y-4">
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {offeringTypes.map((type) => (
            <div key={type._id} className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg">
              {editingId === type._id ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <button onClick={() => saveRename(type._id)} className="p-1 text-green-600 hover:bg-green-50 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <button onClick={() => startRename(type)} className="text-sm text-foreground text-left flex-1 hover:underline">
                    {type.name}
                    {type.isDefault && <span className="ml-2 text-xs text-muted">(default)</span>}
                  </button>
                  <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                    <input
                      type="checkbox"
                      checked={type.enabled}
                      onChange={(e) => updateMutation.mutate({ id: type._id, data: { enabled: e.target.checked } })}
                    />
                    Enabled
                  </label>
                  <button
                    onClick={() => handleDelete(type)}
                    disabled={deleteMutation.isPending}
                    className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded disabled:opacity-50"
                    title="Remove offering type"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form
          onSubmit={handleSubmit((data) => createMutation.mutate(data))}
          className="flex items-start gap-2 pt-4 border-t border-border"
        >
          <div className="flex-1">
            <Input placeholder="New offering type name" {...register('name')} />
            {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
          </div>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending}>
            Add
          </Button>
        </form>

        <div className="flex justify-end pt-2">
          <Button variant="outline" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}

function OfferingsPageContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageTypesOpen, setIsManageTypesOpen] = useState(false);
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
    queryKey: ['donations', 'offering', dateRange?.start, dateRange?.end, page],
    queryFn: () =>
      donationsApi.getAllPaginated({
        donationType: 'offering',
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

  const { data: offeringTypes = [] } = useQuery({
    queryKey: ['finance', 'offering-types'],
    queryFn: financeApi.getOfferingTypes,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  // Recent events (last 60 days) to optionally link an offering to the
  // service it was collected at.
  const sixtyDaysAgo = new Date();
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
  const { data: recentEvents = [] } = useQuery({
    queryKey: ['events', 'recent-for-offerings'],
    queryFn: () => eventsApi.getAll({ startDate: sixtyDaysAgo.toISOString().split('T')[0] }),
  });

  const eventOptions = [
    { value: '', label: 'No specific event' },
    ...recentEvents.map((e) => ({ value: e._id, label: `${e.title} — ${new Date(e.startDate).toLocaleDateString()}` })),
  ];

  const donorOptions = [
    { value: '', label: 'Anonymous' },
    ...members.map((m: any) => ({
      value: m._id,
      label: `${m.firstName} ${m.lastName}`,
    })),
  ];

  const enabledTypeOptions = offeringTypes
    .filter((t) => t.enabled)
    .map((t) => ({ value: t._id, label: t.name }));

  // The edit form must still be able to show a type that's since been
  // disabled — otherwise saving without touching the dropdown would silently
  // reassign the donation to whatever option happens to render first.
  const currentEditTypeId = viewTarget?.offeringTypeId?._id;
  const editTypeOptions = currentEditTypeId && !enabledTypeOptions.some((o) => o.value === currentEditTypeId)
    ? [...enabledTypeOptions, { value: currentEditTypeId, label: `${viewTarget?.offeringTypeId?.name} (disabled)` }]
    : enabledTypeOptions;

  const defaultTypeId = offeringTypes.find((t) => t.isDefault)?._id || offeringTypes[0]?._id || '';

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
      donationType: 'offering',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      offeringTypeId: '',
      notes: '',
    },
  });

  const formDonorType = watch('donorType');

  // Default the type select to the org's default offering type once loaded
  useEffect(() => {
    if (defaultTypeId) {
      setValue('offeringTypeId', defaultTypeId);
    }
  }, [defaultTypeId, setValue]);

  const createMutation = useMutation({
    mutationFn: (data: DonationFormData) => donationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Offering recorded successfully');
      reset({
        donorType: 'member',
        donorId: '',
        donorName: '',
        donorEmail: '',
        donorPhone: '',
        amount: undefined,
        donationType: 'offering',
        donationDate: new Date().toISOString().split('T')[0],
        paymentMethod: '',
        offeringTypeId: defaultTypeId,
        notes: '',
      });
      setIsModalOpen(false);
      setMemberSearch('');
      setDonorType('member');
      setPage(1);
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.details || error?.response?.data?.error || 'Failed to record offering';
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
      toast.success('Offering updated successfully');
      setViewTarget(null);
      setIsEditMode(false);
      editForm.reset();
    },
    onError: (error: any) => {
      const msg = error?.response?.data?.details || error?.response?.data?.error || 'Failed to update offering';
      toast.error(msg);
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
      donationType: 'offering',
      donationDate: new Date(viewTarget.donationDate).toISOString().split('T')[0],
      paymentMethod: viewTarget.paymentMethod || '',
      notes: viewTarget.notes || '',
      offeringTypeId: viewTarget.offeringTypeId?._id || defaultTypeId,
      eventId: viewTarget.eventId?._id || '',
    });
    setIsEditMode(true);
  };

  // Totals reflect the full filtered set (server-aggregated), not just the current page.
  const stats = [
    { label: 'Total Offerings', value: totalRecords.toLocaleString(), icon: DollarSign },
    { label: 'Total Amount', value: formatCurrency(data?.totalAmount || 0), icon: Wallet },
    { label: 'Average Offering', value: formatCurrency(data?.averageAmount || 0), icon: TrendingUp },
    { label: 'This Month', value: formatCurrency(data?.monthlyTotal || 0), icon: DollarSign },
  ];

  const handleExportCSV = async () => {
    if (totalRecords === 0) {
      toast.error('No offerings to export');
      return;
    }

    // Export the full filtered set, not just the current page.
    const allFilteredDonations = await donationsApi.getAll({
      donationType: 'offering',
      startDate: dateRange?.start,
      endDate: dateRange?.end,
    });

    const rows: string[][] = [
      ['Donor', 'Type', 'Amount', 'Payment Method', 'Date'],
      ...allFilteredDonations.map((d: Donation) => [
        d.donorId ? `${d.donorId.firstName} ${d.donorId.lastName}` : 'Anonymous',
        d.offeringTypeId?.name || 'General',
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
    link.download = `offerings-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <PageHeader title="Offerings" description="Track and manage offerings received" />

      <div className="flex items-center justify-end gap-3 -mt-4 mb-8">
        <Button variant="outline" onClick={() => setIsManageTypesOpen(true)} leftIcon={<Settings className="w-4 h-4" />}>
          Manage Types
        </Button>
        <Button onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
          Record Offering
        </Button>
      </div>

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
            <h2 className="text-lg font-semibold text-foreground">Offerings</h2>
            <p className="text-sm text-muted mt-1">A record of all offerings received</p>
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
            description="Select a start and end date, then click Search to view offerings."
            icon={Search}
          />
        ) : filteredDonations.length === 0 ? (
          <EmptyState
            title="No Offerings Found"
            description="No offerings were recorded in the selected period."
            icon={DollarSign}
            actionLabel="Record Offering"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Donor</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Type</th>
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
                      <Badge variant="info">
                        {donation.offeringTypeId?.name || 'General'}
                      </Badge>
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

      {/* Record Offering Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Offering">
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
            <label className="block text-sm font-medium text-foreground mb-2">Offering Type</label>
            <select
              {...register('offeringTypeId')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {enabledTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Event (Optional)</label>
            <select
              {...register('eventId')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {eventOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
              placeholder="Add any notes about this offering..."
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
              Record Offering
            </Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Modal */}
      <Modal isOpen={!!viewTarget} onClose={() => setViewTarget(null)} title="Offering Details">
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
                    <p className="text-sm text-muted">Type</p>
                    <p className="font-medium">{viewTarget.offeringTypeId?.name || 'General'}</p>
                  </div>
                  {viewTarget.eventId && (
                    <div>
                      <p className="text-sm text-muted">Event</p>
                      <p className="font-medium">{viewTarget.eventId.title} — {formatDate(viewTarget.eventId.startDate)}</p>
                    </div>
                  )}
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
                  <label className="block text-sm font-medium text-foreground mb-2">Offering Type</label>
                  <select
                    {...editForm.register('offeringTypeId')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {editTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Event (Optional)</label>
                  <select
                    {...editForm.register('eventId')}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {eventOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

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
      <Modal isOpen={!!receiptTarget} onClose={() => setReceiptTarget(null)} title="Offering Receipt">
        {receiptTarget && <DonationReceipt donation={receiptTarget} onClose={() => setReceiptTarget(null)} />}
      </Modal>

      <ManageTypesModal
        isOpen={isManageTypesOpen}
        onClose={() => setIsManageTypesOpen(false)}
        offeringTypes={offeringTypes}
      />
    </div>
  );
}

export default function OfferingsPage() {
  return (
    <FinanceAccessGuard>
      <OfferingsPageContent />
    </FinanceAccessGuard>
  );
}
