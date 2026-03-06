'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { eventsApi } from '@/lib/api';
import { eventSchema, type EventFormData } from '@/lib/validations';
import { Button, Input, Card, Select, Checkbox } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import BranchField from '@/components/dashboard/BranchField';

const eventTypeOptions = [
  { value: 'service', label: 'Service' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'other', label: 'Other' },
];

const recurrencePatternOptions = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Bi-weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const dayOfWeekOptions = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EventFormData>({
    resolver: zodResolver(eventSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      eventType: '',
      startDate: '',
      endDate: '',
      location: '',
      maxCapacity: undefined,
      isRecurring: false,
      recurrencePattern: undefined,
      recurrenceDay: undefined,
      recurrenceEndDate: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      router.push('/dashboard/events');
    },
    onError: () => {
      toast.error('Failed to create event');
    },
  });

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/dashboard/events"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Events
        </Link>
        <PageHeader title="New Event" description="Create a new event" />
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Event Details</h2>
          <div className="space-y-4">
            <Input
              label="Event Title"
              placeholder="Enter event title"
              error={errors.title?.message}
              {...register('title')}
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                placeholder="Describe the event..."
                rows={4}
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent resize-none"
                {...register('description')}
              />
            </div>
            <Select
              label="Event Type"
              options={eventTypeOptions}
              placeholder="Select type"
              error={errors.eventType?.message}
              {...register('eventType')}
            />
            <BranchField
              value={watch('branchId')}
              onChange={(v) => setValue('branchId', v)}
            />
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Schedule & Location</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Start Date & Time"
                type="datetime-local"
                error={errors.startDate?.message}
                {...register('startDate')}
              />
              <Input
                label="End Date & Time"
                type="datetime-local"
                error={errors.endDate?.message}
                {...register('endDate')}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Location"
                placeholder="Event venue"
                error={errors.location?.message}
                {...register('location')}
              />
              <Input
                label="Max Capacity"
                type="number"
                placeholder="Optional"
                error={errors.maxCapacity?.message}
                {...register('maxCapacity')}
              />
            </div>
          </div>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6">Recurring Event</h2>
          <div className="space-y-4">
            <Checkbox
              label="Make this a recurring event"
              {...register('isRecurring')}
            />

            {watch('isRecurring') && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Select
                    label="Recurrence Pattern"
                    options={recurrencePatternOptions}
                    placeholder="Select pattern"
                    error={errors.recurrencePattern?.message}
                    {...register('recurrencePattern')}
                  />
                  <Select
                    label="Day of Week"
                    options={dayOfWeekOptions}
                    placeholder="Select day"
                    error={errors.recurrenceDay?.message}
                    {...register('recurrenceDay')}
                  />
                </div>
                <Input
                  label="Recurrence End Date"
                  type="date"
                  placeholder="When should this recurrence end?"
                  error={errors.recurrenceEndDate?.message}
                  {...register('recurrenceEndDate')}
                />
              </>
            )}
          </div>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => router.push('/dashboard/events')}>
            Cancel
          </Button>
          <Button type="submit" isLoading={createMutation.isPending}>
            Create Event
          </Button>
        </div>
      </form>
    </div>
  );
}
