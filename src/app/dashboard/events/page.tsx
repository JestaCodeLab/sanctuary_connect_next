'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Users,
  Trash2,
  Edit2,
} from 'lucide-react';
import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { eventsApi } from '@/lib/api';
import { eventSchema, type EventFormData } from '@/lib/validations';
import type { ChurchEvent } from '@/types';

type StatusFilter = 'all' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

const statusBadgeVariant: Record<ChurchEvent['status'], 'info' | 'success' | 'muted' | 'error'> = {
  scheduled: 'info',
  ongoing: 'success',
  completed: 'muted',
  cancelled: 'error',
};

const eventTypeOptions = [
  { value: 'service', label: 'Service' },
  { value: 'conference', label: 'Conference' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'social', label: 'Social' },
  { value: 'outreach', label: 'Outreach' },
  { value: 'prayer', label: 'Prayer' },
  { value: 'other', label: 'Other' },
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function EventsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<ChurchEvent | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ChurchEvent | null>(null);

  // Data fetching
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: EventFormData) => eventsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event created successfully');
      setIsModalOpen(false);
      reset();
    },
    onError: () => {
      toast.error('Failed to create event');
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => eventsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted successfully');
      setDeleteTarget(null);
    },
    onError: () => {
      toast.error('Failed to delete event');
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EventFormData }) => eventsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event updated successfully');
      setIsModalOpen(false);
      setEditTarget(null);
      reset();
    },
    onError: () => {
      toast.error('Failed to update event');
    },
  });

  // Form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EventFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(eventSchema) as any,
  });

  const onSubmit = (data: EventFormData) => {
    if (modalMode === 'edit' && editTarget) {
      updateMutation.mutate({ id: editTarget._id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (event: ChurchEvent) => {
    setEditTarget(event);
    setModalMode('edit');
    reset({
      title: event.title,
      description: event.description || '',
      eventType: event.eventType || '',
      startDate: event.startDate ? new Date(event.startDate).toISOString().slice(0, 16) : '',
      endDate: event.endDate ? new Date(event.endDate).toISOString().slice(0, 16) : '',
      location: event.location || '',
      maxCapacity: event.maxCapacity,
    });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    setModalMode('create');
    setEditTarget(null);
    reset({
      title: '',
      description: '',
      eventType: '',
      startDate: '',
      endDate: '',
      location: '',
      maxCapacity: undefined,
    });
    setIsModalOpen(true);
  };

  // Computed stats
  const totalEvents = events.length;
  const upcomingCount = events.filter((e) => e.status === 'scheduled').length;
  const ongoingCount = events.filter((e) => e.status === 'ongoing').length;
  const completedCount = events.filter((e) => e.status === 'completed').length;

  const stats = [
    { label: 'Total Events', value: totalEvents, icon: Calendar },
    { label: 'Upcoming', value: upcomingCount, icon: Clock },
    { label: 'Ongoing', value: ongoingCount, icon: Users },
    { label: 'Completed', value: completedCount, icon: Calendar },
  ];

  // Client-side filtering
  const filteredEvents = events.filter((event) => {
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesSearch =
      searchText.trim() === '' ||
      event.title.toLowerCase().includes(searchText.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const filterButtons: { label: string; value: StatusFilter }[] = [
    { label: 'All', value: 'all' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'Ongoing', value: 'ongoing' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  return (
    <div>
      <PageHeader
        title="Events"
        description="Manage church events and activities"
        actionLabel="Create Event"
        actionIcon={Plus}
        onAction={handleOpenCreate}
      />

      <StatsGrid stats={stats} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
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
        <div className="sm:ml-auto w-full sm:w-72">
          <Input
            placeholder="Search events..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* Events Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} padding="md" className="animate-pulse">
              <div className="h-4 bg-background rounded w-3/4 mb-4" />
              <div className="h-3 bg-background rounded w-full mb-2" />
              <div className="h-3 bg-background rounded w-2/3 mb-4" />
              <div className="h-3 bg-background rounded w-1/2" />
            </Card>
          ))}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No events yet"
          description="Create your first event to get started managing your church activities."
          actionLabel="Create Event"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map((event) => (
            <Card
              key={event._id}
              padding="md"
              className="hover:shadow-md transition-shadow relative"
            >
              {/* Status Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  {event.eventType && (
                    <Badge variant="muted">
                      {event.eventType}
                    </Badge>
                  )}
                </div>
                <Badge variant={statusBadgeVariant[event.status]}>
                  {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-bold text-foreground text-lg mb-1">
                {event.title}
              </h3>

              {/* Description */}
              {event.description && (
                <p className="text-muted text-sm line-clamp-2 mb-4">
                  {event.description}
                </p>
              )}

              {/* Details */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-sm text-muted">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>
                    {formatDate(event.startDate)} - {formatDate(event.endDate)}
                  </span>
                </div>

                {event.location && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span>{event.location}</span>
                  </div>
                )}

                {event.maxCapacity && (
                  <div className="flex items-center gap-2 text-sm text-muted">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span>Capacity: {event.maxCapacity}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Edit2 className="w-4 h-4" />}
                  onClick={() => handleEdit(event)}
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  leftIcon={<Trash2 className="w-4 h-4" />}
                  onClick={() => setDeleteTarget(event)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditTarget(null);
          reset();
        }}
        title={modalMode === 'edit' ? 'Edit Event' : 'Create Event'}
        description={modalMode === 'edit' ? 'Update the event details.' : 'Fill in the details to create a new church event.'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="Enter event title"
            error={errors.title?.message}
            {...register('title')}
          />

          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Description
            </label>
            <textarea
              className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              rows={3}
              placeholder="Describe the event..."
              {...register('description')}
            />
            {errors.description?.message && (
              <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">
                {errors.description.message}
              </p>
            )}
          </div>

          <Select
            label="Event Type"
            options={eventTypeOptions}
            placeholder="Select event type"
            error={errors.eventType?.message}
            {...register('eventType')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="datetime-local"
              error={errors.startDate?.message}
              {...register('startDate')}
            />
            <Input
              label="End Date"
              type="datetime-local"
              error={errors.endDate?.message}
              {...register('endDate')}
            />
          </div>

          <Input
            label="Location"
            placeholder="Enter event location"
            error={errors.location?.message}
            {...register('location')}
          />

          <Input
            label="Max Capacity"
            type="number"
            placeholder="Enter maximum capacity"
            error={errors.maxCapacity?.message}
            {...register('maxCapacity')}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                setEditTarget(null);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={modalMode === 'edit' ? updateMutation.isPending : createMutation.isPending}
            >
              {modalMode === 'edit' ? 'Save Changes' : 'Create Event'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? This action cannot be undone."
        size="sm"
      >
        <div>
          {deleteTarget && (
            <p className="text-sm text-muted mb-6">
              You are about to delete <strong className="text-foreground">{deleteTarget.title}</strong>.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget._id);
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
