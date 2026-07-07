'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, Wallet, MoreVertical, Printer, Mail, MessageSquare, Eye, Settings, Check, X } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import DonationReceipt from '@/components/dashboard/DonationReceipt';
import { donationsApi, financeApi, membersApi } from '@/lib/api';
import { donationSchema, offeringTypeSchema, type DonationFormData, type OfferingTypeFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import type { Donation, OfferingType } from '@/types';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
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
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const { data: allDonations = [], isLoading } = useQuery({
    queryKey: ['donations'],
    queryFn: donationsApi.getAll,
  });

  // Filter to only offerings
  const donations = allDonations.filter((d: Donation) => d.donationType === 'offering');

  const { data: offeringTypes = [] } = useQuery({
    queryKey: ['finance', 'offering-types'],
    queryFn: financeApi.getOfferingTypes,
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

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

  const defaultTypeId = offeringTypes.find((t) => t.isDefault)?._id || offeringTypes[0]?._id || '';

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      donorId: '',
      amount: undefined,
      donationType: 'offering',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      offeringTypeId: '',
      notes: '',
    },
  });

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
      reset();
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to record offering');
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
    onError: () => {
      toast.error('Failed to update offering');
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
      offeringTypeId: viewTarget.offeringTypeId?._id || '',
    });
    setIsEditMode(true);
  };

  const totalDonations = donations.length;
  const totalAmount = donations.reduce((sum: number, d: Donation) => sum + d.amount, 0);
  const averageDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

  const now = new Date();
  const thisMonthTotal = donations
    .filter((d: Donation) => {
      const date = new Date(d.donationDate);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, d: Donation) => sum + d.amount, 0);

  const stats = [
    { label: 'Total Offerings', value: totalDonations.toLocaleString(), icon: DollarSign },
    { label: 'Total Amount', value: formatCurrency(totalAmount), icon: Wallet },
    { label: 'Average Offering', value: formatCurrency(averageDonation), icon: TrendingUp },
    { label: 'This Month', value: formatCurrency(thisMonthTotal), icon: DollarSign },
  ];

  return (
    <div>
      <PageHeader
        title="Offerings"
        description="Track and manage offerings received"
        actionLabel="Record Offering"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      <Card padding="md" className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-foreground">Offering Types</h2>
          <Button variant="outline" size="sm" onClick={() => setIsManageTypesOpen(true)} leftIcon={<Settings className="w-3.5 h-3.5" />}>
            Manage Types
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {offeringTypes.filter((t) => t.enabled).map((type) => (
            <span
              key={type._id}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-light text-primary"
            >
              {type.name}
            </span>
          ))}
        </div>
      </Card>

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Offerings</h2>
          <p className="text-sm text-muted mt-1">A record of all offerings received</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : donations.length === 0 ? (
          <EmptyState
            title="No Offerings Yet"
            description="Start tracking offerings by recording your first offering."
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
                {donations.map((donation: Donation) => (
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
                    <td className="px-6 py-4 text-sm text-muted">{formatDate(donation.donationDate)}</td>
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
      </Card>

      {/* Record Offering Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Record Offering">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Donor</label>
            <select
              {...register('donorId')}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {donorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

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
                    <p className="font-medium">{formatDate(viewTarget.donationDate)}</p>
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
                    {enabledTypeOptions.map((option) => (
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
