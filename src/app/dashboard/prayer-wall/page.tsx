'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { HandHeart, Heart, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Card, Button, Input, Select } from '@/components/ui';
import { prayerRequestsApi } from '@/lib/api';
import { prayerRequestSchema } from '@/lib/validations';
import type { PrayerRequestFormData } from '@/lib/validations';
import type { PrayerRequest } from '@/types';

type StatusFilter = 'all' | 'active' | 'answered';

const categoryBadgeVariant: Record<PrayerRequest['category'], 'error' | 'warning' | 'info' | 'success' | 'muted'> = {
  health: 'error',
  family: 'warning',
  financial: 'info',
  spiritual: 'success',
  other: 'muted',
};

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) return '1 week ago';
  if (diffWeeks < 4) return `${diffWeeks} weeks ago`;
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths === 1) return '1 month ago';
  return `${diffMonths} months ago`;
}

export default function PrayerWallPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [prayedSet, setPrayedSet] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: prayers = [], isLoading } = useQuery({
    queryKey: ['prayer-requests'],
    queryFn: prayerRequestsApi.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PrayerRequestFormData>({
    resolver: zodResolver(prayerRequestSchema) as any,
    defaultValues: {
      category: 'other',
      isAnonymous: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: prayerRequestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      toast.success('Prayer request submitted');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to submit prayer request';
      toast.error(message);
    },
  });

  const prayMutation = useMutation({
    mutationFn: prayerRequestsApi.pray,
    onSuccess: (_data, prayerId) => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      setPrayedSet((prev) => {
        const next = new Set(prev);
        next.add(prayerId);
        return next;
      });
      toast.success('Prayer added');
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to record prayer';
      toast.error(message);
    },
  });

  const markAnsweredMutation = useMutation({
    mutationFn: prayerRequestsApi.markAsAnswered,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      toast.success('Marked as answered');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: prayerRequestsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prayer-requests'] });
      toast.success('Prayer request deleted');
      setDeleteId(null);
    },
  });

  const onSubmit = (data: PrayerRequestFormData) => {
    createMutation.mutate({
      title: data.title,
      description: data.description,
      category: data.category,
      isAnonymous: data.isAnonymous,
    });
  };

  // Computed stats
  const activeCount = prayers.filter((p: PrayerRequest) => p.status === 'active').length;
  const answeredCount = prayers.filter((p: PrayerRequest) => p.status === 'answered').length;
  const totalPrayersOffered = prayers.reduce((sum: number, p: PrayerRequest) => sum + p.prayerCount, 0);

  const stats = [
    { label: 'Active Requests', value: activeCount, icon: HandHeart },
    { label: 'Answered Prayers', value: answeredCount, icon: CheckCircle },
    { label: 'Total Prayers Offered', value: totalPrayersOffered, icon: Heart },
  ];

  // Client-side filtering
  const filteredPrayers = prayers.filter((prayer: PrayerRequest) => {
    if (statusFilter === 'all') return true;
    return prayer.status === statusFilter;
  });

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Active', value: 'active' },
    { label: 'Answered', value: 'answered' },
  ];

  const prayerToDelete = deleteId
    ? prayers.find((p: PrayerRequest) => p._id === deleteId)
    : null;

  return (
    <div>
      <PageHeader
        title="Prayer Wall"
        description="Share and support prayer requests"
        actionLabel="Submit Request"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {filterButtons.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary text-white'
                : 'bg-card text-muted hover:text-foreground hover:bg-background border border-border'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Prayer Request Cards */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : filteredPrayers.length === 0 ? (
        <EmptyState
          icon={HandHeart}
          title="No prayer requests"
          description={
            statusFilter !== 'all'
              ? 'Try selecting a different filter.'
              : 'Be the first to submit a prayer request.'
          }
          actionLabel={statusFilter === 'all' ? 'Submit Request' : undefined}
          onAction={statusFilter === 'all' ? () => setIsModalOpen(true) : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrayers.map((prayer: PrayerRequest) => (
            <Card
              key={prayer._id}
              padding="md"
              className="hover:shadow-md transition-shadow"
            >
              {/* Top row: Category + Answered Badge */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant={categoryBadgeVariant[prayer.category]}>
                    {prayer.category.charAt(0).toUpperCase() + prayer.category.slice(1)}
                  </Badge>
                  {prayer.status === 'answered' && (
                    <Badge variant="success">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Answered
                      </span>
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {prayer.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markAnsweredMutation.mutate(prayer._id)}
                      aria-label="Mark as answered"
                    >
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteId(prayer._id)}
                    aria-label="Delete prayer request"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-foreground mt-3">
                {prayer.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-muted mt-2 line-clamp-3">
                {prayer.description}
              </p>

              {/* Author */}
              <p className="text-xs text-muted-foreground mt-3">
                {prayer.isAnonymous ? 'Anonymous' : prayer.authorName || 'Anonymous'}
              </p>

              {/* Bottom row */}
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                <div className="flex items-center gap-1.5 text-sm text-muted">
                  <Heart
                    className="w-4 h-4"
                    fill={prayedSet.has(prayer._id) ? 'currentColor' : 'none'}
                  />
                  <span>{prayer.prayerCount} prayers</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={prayedSet.has(prayer._id)}
                  onClick={() => prayMutation.mutate(prayer._id)}
                >
                  {prayedSet.has(prayer._id) ? 'Prayed' : 'Pray'}
                </Button>
              </div>

              {/* Time ago */}
              <p className="text-xs text-muted-foreground mt-2">
                {getTimeAgo(prayer.createdAt)}
              </p>
            </Card>
          ))}
        </div>
      )}

      {/* Submit Prayer Request Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Submit Prayer Request"
        description="Share your prayer request with the congregation."
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <Input
            label="Title"
            error={errors.title?.message}
            {...register('title')}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              className={`block w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2.5
                text-gray-900 dark:text-gray-100 transition-colors duration-200
                focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent
                ${errors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}`}
              rows={4}
              {...register('description')}
            />
            {errors.description && (
              <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{errors.description.message}</p>
            )}
          </div>

          <Select
            label="Category"
            options={[
              { value: 'health', label: 'Health' },
              { value: 'family', label: 'Family' },
              { value: 'financial', label: 'Financial' },
              { value: 'spiritual', label: 'Spiritual' },
              { value: 'other', label: 'Other' },
            ]}
            error={errors.category?.message}
            {...register('category')}
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAnonymous"
              className="rounded border-gray-300 text-primary focus:ring-primary"
              {...register('isAnonymous')}
            />
            <label htmlFor="isAnonymous" className="text-sm text-gray-700 dark:text-gray-300">
              Submit anonymously
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
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
            <Button
              type="submit"
              isLoading={createMutation.isPending}
            >
              Submit Request
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Delete Prayer Request"
        description="This action cannot be undone."
        size="sm"
      >
        <div>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to delete{' '}
            <span className="font-semibold text-foreground">
              {prayerToDelete ? prayerToDelete.title : 'this prayer request'}
            </span>
            ?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
