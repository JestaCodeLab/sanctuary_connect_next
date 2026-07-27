'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft, Bell, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { eventsApi, departmentsApi } from '@/lib/api';
import { eventSchema, type EventFormData } from '@/lib/validations';
import { Button, Input, Card, Select, Checkbox } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import BranchField from '@/components/dashboard/BranchField';

const reminderOffsetOptions = [
  { value: '15', label: '15 minutes before' },
  { value: '60', label: '1 hour before' },
  { value: '120', label: '2 hours before' },
  { value: '1440', label: '1 day before' },
  { value: '2880', label: '2 days before' },
  { value: '10080', label: '1 week before' },
];

const eventTypeOptions = [
  { value: 'service', label: 'Service' },
  { value: 'meeting', label: 'Meeting' },
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

function addHoursToDatetimeLocal(datetimeLocal: string, hours: number): string {
  const d = new Date(datetimeLocal);
  d.setHours(d.getHours() + hours);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function NewEventPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const departmentId = searchParams.get('departmentId') || undefined;
  const dateParam = searchParams.get('date') || undefined;

  const { data: department } = useQuery({
    queryKey: ['departments', departmentId],
    queryFn: () => departmentsApi.getById(departmentId!),
    enabled: !!departmentId,
  });

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
      departmentId,
      startDate: dateParam || '',
      endDate: dateParam ? addHoursToDatetimeLocal(dateParam, 1) : '',
      location: '',
      maxCapacity: undefined,
      isRecurring: false,
      recurrencePattern: undefined,
      recurrenceDay: undefined,
      recurrenceEndDate: '',
    },
  });

  // Pre-fill title + event type once the department (from ?departmentId=) loads
  useEffect(() => {
    if (department) {
      setValue('title', `${department.name} Meeting`);
      setValue('eventType', 'meeting');
    }
  }, [department, setValue]);

  const createMutation = useMutation({
    mutationFn: eventsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      router.push(departmentId ? `/dashboard/departments/${departmentId}` : '/dashboard/events');
    },
    onError: () => {
      toast.error('Failed to create event');
    },
  });

  const [reminders, setReminders] = useState<{ offsetMinutes: number; message: string }[]>([]);
  const [newReminderOffset, setNewReminderOffset] = useState('1440');
  const [newReminderMessage, setNewReminderMessage] = useState('');

  const handleAddReminder = () => {
    if (!newReminderMessage.trim()) return;
    setReminders((prev) => [...prev, { offsetMinutes: parseInt(newReminderOffset, 10), message: newReminderMessage.trim() }]);
    setNewReminderMessage('');
  };

  const handleRemoveReminder = (index: number) => {
    setReminders((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: EventFormData) => {
    createMutation.mutate({ ...data, reminders });
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href={departmentId ? `/dashboard/departments/${departmentId}` : '/dashboard/events'}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {departmentId ? 'Back to Department' : 'Back to Events'}
        </Link>
        <PageHeader
          title={department ? `Schedule ${department.name} Meeting` : 'New Event'}
          description={department ? 'Create a meeting for this department' : 'Create a new event'}
        />
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
                className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5] focus:border-transparent resize-none"
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

        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Bell className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">SMS Reminders</h2>
          </div>
          <div className="space-y-4">
            {reminders.length > 0 && (
              <div className="space-y-2">
                {reminders.map((reminder, index) => (
                  <div key={index} className="flex items-start justify-between gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-primary">
                        {reminderOffsetOptions.find((o) => o.value === String(reminder.offsetMinutes))?.label || `${reminder.offsetMinutes} min before`}
                      </p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{reminder.message}</p>
                    </div>
                    <button type="button" onClick={() => handleRemoveReminder(index)} className="p-1 text-gray-400 hover:text-red-500 flex-shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col md:flex-row gap-2">
              <select
                value={newReminderOffset}
                onChange={(e) => setNewReminderOffset(e.target.value)}
                className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              >
                {reminderOffsetOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Reminder message..."
                value={newReminderMessage}
                onChange={(e) => setNewReminderMessage(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#4F46E5]"
              />
              <Button type="button" variant="outline" leftIcon={<Plus className="w-4 h-4" />} onClick={handleAddReminder}>
                Add
              </Button>
            </div>
            <p className="text-xs text-gray-400">Reminders are sent by SMS to the event&apos;s audience ahead of each occurrence.</p>
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
