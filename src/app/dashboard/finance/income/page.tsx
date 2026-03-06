'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, Wallet, MoreVertical, Printer, Mail, MessageSquare, Eye } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import DonationReceipt from '@/components/dashboard/DonationReceipt';
import { donationsApi, organizationApi, membersApi } from '@/lib/api';
import { donationSchema, type DonationFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import BranchField from '@/components/dashboard/BranchField';
import type { Donation } from '@/types';

const donationTypeOptions = [
  { value: 'tithe', label: 'Tithe' },
  { value: 'offering', label: 'Offering' },
  { value: 'special', label: 'Special' },
  { value: 'building', label: 'Building' },
  { value: 'missions', label: 'Missions' },
  { value: 'other', label: 'Other' },
];

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
];

const typeBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'muted'> = {
  tithe: 'info',
  offering: 'success',
  special: 'warning',
  building: 'muted',
  missions: 'info',
};

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

export default function IncomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Donation | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [receiptTarget, setReceiptTarget] = useState<Donation | null>(null);
  const queryClient = useQueryClient();
  const { formatCurrency } = useCurrency();

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations'],
    queryFn: donationsApi.getAll,
  });

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
  });

  const donorOptions = [
    { value: '', label: 'Anonymous' },
    ...members.map((m: any) => ({
      value: m._id,
      label: `${m.firstName} ${m.lastName}`,
    })),
  ];

  const fundBuckets = orgData?.fundBuckets ?? [];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<DonationFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      donorId: '',
      amount: undefined,
      donationType: '',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      fundBucketId: '',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DonationFormData) => donationsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Donation recorded successfully');
      reset();
      setIsModalOpen(false);
    },
    onError: () => {
      toast.error('Failed to record donation');
    },
  });

  const editForm = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DonationFormData }) => donationsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      toast.success('Donation updated successfully');
      setViewTarget(null);
      setIsEditMode(false);
      editForm.reset();
    },
    onError: () => {
      toast.error('Failed to update donation');
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
      donationType: viewTarget.donationType || '',
      donationDate: new Date(viewTarget.donationDate).toISOString().split('T')[0],
      paymentMethod: viewTarget.paymentMethod || '',
      notes: viewTarget.notes || '',
      fundBucketId: viewTarget.fundBucketId?._id || '',
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
    { label: 'Total Donations', value: totalDonations.toLocaleString(), icon: DollarSign },
    { label: 'Total Amount', value: formatCurrency(totalAmount), icon: Wallet },
    { label: 'Average Donation', value: formatCurrency(averageDonation), icon: TrendingUp },
    { label: 'This Month', value: formatCurrency(thisMonthTotal), icon: DollarSign },
  ];

  const fundBucketOptions = fundBuckets.map((bucket) => ({
    value: bucket._id,
    label: bucket.name,
  }));

  return (
    <div>
      <PageHeader
        title="Income"
        description="Track donations and manage funds"
        actionLabel="Record Donation"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      {fundBuckets.length > 0 && (
        <Card padding="md" className="mb-8">
          <h2 className="text-sm font-semibold text-foreground mb-3">Fund Buckets</h2>
          <div className="flex flex-wrap gap-2">
            {fundBuckets.map((bucket) => (
              <span
                key={bucket._id}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-primary-light text-primary"
              >
                {bucket.name}
              </span>
            ))}
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Donations</h2>
          <p className="text-sm text-muted mt-1">A record of all donations received</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : donations.length === 0 ? (
          <EmptyState
            icon={DollarSign}
            title="No donations yet"
            description="Record your first donation to start tracking your church finances."
            actionLabel="Record Donation"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Donor</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Type</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Payment Method</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {donations.map((donation: Donation) => {
                  const donorName = donation.donorId
                    ? `${donation.donorId.firstName} ${donation.donorId.lastName}`
                    : 'Anonymous';
                  const badgeVariant = typeBadgeVariant[donation.donationType ?? ''] ?? 'muted';

                  return (
                    <tr key={donation._id} className="hover:bg-background transition-colors">
                      <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                        {formatDate(donation.donationDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{donorName}</td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(donation.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {donation.donationType ? (
                          <Badge variant={badgeVariant}>
                            {donation.donationType.charAt(0).toUpperCase() + donation.donationType.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted whitespace-nowrap capitalize">
                        {donation.paymentMethod?.replace('_', ' ') ?? '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <ActionMenu
                          donation={donation}
                          onView={() => handleView(donation)}
                          onPrintReceipt={() => setReceiptTarget(donation)}
                          onEmailReceipt={() => handleEmailReceipt(donation)}
                          onSmsReceipt={() => handleSmsReceipt(donation)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Donation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title="Record Donation"
        description="Enter the details of the donation received."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <BranchField value={watch('branchId')} onChange={(v) => setValue('branchId', v)} />
          <Select label="Donor" options={donorOptions} placeholder="Select donor (or leave as Anonymous)" error={errors.donorId?.message} {...register('donorId')} />
          <Input label="Amount" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
          <Select label="Donation Type" options={donationTypeOptions} placeholder="Select donation type" error={errors.donationType?.message} {...register('donationType')} />
          <Input label="Donation Date" type="date" error={errors.donationDate?.message} {...register('donationDate')} />
          <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={errors.paymentMethod?.message} {...register('paymentMethod')} />
          {fundBucketOptions.length > 0 && (
            <Select label="Fund Bucket" options={fundBucketOptions} placeholder="Select fund bucket" error={errors.fundBucketId?.message} {...register('fundBucketId')} />
          )}
          <div className="w-full">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Optional notes about this donation..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('notes')}
            />
            {errors.notes?.message && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{errors.notes.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Record Donation</Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Donation Modal */}
      <Modal
        isOpen={viewTarget !== null}
        onClose={() => { setViewTarget(null); setIsEditMode(false); editForm.reset(); }}
        title={isEditMode ? 'Edit Donation' : 'Donation Details'}
        size="lg"
      >
        {viewTarget && !isEditMode && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted">Date</p>
                <p className="text-foreground font-medium">{formatDate(viewTarget.donationDate)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Amount</p>
                <p className="text-foreground font-medium">{formatCurrency(viewTarget.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Donor</p>
                <p className="text-foreground">
                  {viewTarget.donorId ? `${viewTarget.donorId.firstName} ${viewTarget.donorId.lastName}` : 'Anonymous'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted">Type</p>
                <p className="text-foreground capitalize">{viewTarget.donationType || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Payment Method</p>
                <p className="text-foreground capitalize">{viewTarget.paymentMethod?.replace('_', ' ') || '—'}</p>
              </div>
              {viewTarget.fundBucketId && (
                <div>
                  <p className="text-sm text-muted">Fund Bucket</p>
                  <p className="text-foreground">{viewTarget.fundBucketId.name}</p>
                </div>
              )}
              {viewTarget.notes && (
                <div className="col-span-2">
                  <p className="text-sm text-muted">Notes</p>
                  <p className="text-foreground">{viewTarget.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-border">
              <Button variant="outline" onClick={() => { setViewTarget(null); setIsEditMode(false); }}>Close</Button>
              <Button onClick={handleStartEdit}>Edit</Button>
            </div>
          </div>
        )}
        {viewTarget && isEditMode && (
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: viewTarget._id, data }))} className="space-y-5">
            <Select label="Donor" options={donorOptions} placeholder="Select donor (or leave as Anonymous)" error={editForm.formState.errors.donorId?.message} {...editForm.register('donorId')} />
            <Input label="Amount" type="number" step="0.01" error={editForm.formState.errors.amount?.message} {...editForm.register('amount')} />
            <Select label="Donation Type" options={donationTypeOptions} placeholder="Select donation type" error={editForm.formState.errors.donationType?.message} {...editForm.register('donationType')} />
            <Input label="Donation Date" type="date" error={editForm.formState.errors.donationDate?.message} {...editForm.register('donationDate')} />
            <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={editForm.formState.errors.paymentMethod?.message} {...editForm.register('paymentMethod')} />
            {fundBucketOptions.length > 0 && (
              <Select label="Fund Bucket" options={fundBucketOptions} placeholder="Select fund bucket" error={editForm.formState.errors.fundBucketId?.message} {...editForm.register('fundBucketId')} />
            )}
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Notes</label>
              <textarea rows={3} placeholder="Optional notes..." className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...editForm.register('notes')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Print Receipt Modal */}
      <Modal
        isOpen={receiptTarget !== null}
        onClose={() => setReceiptTarget(null)}
        title="Donation Receipt"
        size="lg"
      >
        {receiptTarget && (
          <DonationReceipt
            donation={receiptTarget}
            churchName={orgData?.organization?.churchName}
            onClose={() => setReceiptTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}
