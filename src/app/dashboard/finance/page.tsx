'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { DollarSign, Plus, TrendingUp, Wallet } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { donationsApi, organizationApi } from '@/lib/api';
import { donationSchema, type DonationFormData } from '@/lib/validations';
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

function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function FinancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: donations = [], isLoading } = useQuery({
    queryKey: ['donations'],
    queryFn: donationsApi.getAll,
  });

  const { data: orgData } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const fundBuckets = orgData?.fundBuckets ?? [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema),
    defaultValues: {
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

  const onSubmit = (data: DonationFormData) => {
    createMutation.mutate(data);
  };

  // Compute stats from donations array
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
    {
      label: 'Total Donations',
      value: totalDonations.toLocaleString(),
      icon: DollarSign,
    },
    {
      label: 'Total Amount',
      value: formatCurrency(totalAmount),
      icon: Wallet,
    },
    {
      label: 'Average Donation',
      value: formatCurrency(averageDonation),
      icon: TrendingUp,
    },
    {
      label: 'This Month',
      value: formatCurrency(thisMonthTotal),
      icon: DollarSign,
    },
  ];

  const fundBucketOptions = fundBuckets.map((bucket) => ({
    value: bucket._id,
    label: bucket.name,
  }));

  return (
    <div>
      <PageHeader
        title="Finance"
        description="Track donations and manage funds"
        actionLabel="Record Donation"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      {/* Fund Buckets */}
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

      {/* Donations Table */}
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
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Date
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Donor
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Amount
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Type
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Payment Method
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
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
                      <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">
                        {donorName}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                        {formatCurrency(donation.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {donation.donationType ? (
                          <Badge variant={badgeVariant}>
                            {donation.donationType.charAt(0).toUpperCase() +
                              donation.donationType.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-sm text-muted">--</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted whitespace-nowrap capitalize">
                        {donation.paymentMethod?.replace('_', ' ') ?? '--'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            /* TODO: view/edit donation */
                          }}
                        >
                          View
                        </Button>
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
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Record Donation"
        description="Enter the details of the donation received."
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Amount"
            type="number"
            step="0.01"
            placeholder="0.00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Select
            label="Donation Type"
            options={donationTypeOptions}
            placeholder="Select donation type"
            error={errors.donationType?.message}
            {...register('donationType')}
          />

          <Input
            label="Donation Date"
            type="date"
            error={errors.donationDate?.message}
            {...register('donationDate')}
          />

          <Select
            label="Payment Method"
            options={paymentMethodOptions}
            placeholder="Select payment method"
            error={errors.paymentMethod?.message}
            {...register('paymentMethod')}
          />

          {fundBucketOptions.length > 0 && (
            <Select
              label="Fund Bucket"
              options={fundBucketOptions}
              placeholder="Select fund bucket"
              error={errors.fundBucketId?.message}
              {...register('fundBucketId')}
            />
          )}

          <div className="w-full">
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
            >
              Notes
            </label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Optional notes about this donation..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('notes')}
            />
            {errors.notes?.message && (
              <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                {errors.notes.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Record Donation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
