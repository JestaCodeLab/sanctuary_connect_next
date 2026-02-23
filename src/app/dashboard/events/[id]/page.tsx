'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Calendar, Clock, MapPin, Users, Tag, Share2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import ShareButtons from '@/components/dashboard/ShareButtons';
import { eventsApi } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import type { ChurchEvent } from '@/types';

const statusBadgeVariant: Record<ChurchEvent['status'], 'info' | 'success' | 'muted' | 'error'> = {
  scheduled: 'info',
  ongoing: 'success',
  completed: 'muted',
  cancelled: 'error',
};

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getDuration(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffMs = end.getTime() - start.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    if (remainingHours > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''}, ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
    }
    return `${diffDays} day${diffDays > 1 ? 's' : ''}`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''}`;
  }
  const diffMins = Math.floor(diffMs / (1000 * 60));
  return `${diffMins} minute${diffMins !== 1 ? 's' : ''}`;
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  const display = value !== undefined && value !== null && value !== '' ? String(value) : '\u2014';
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{display}</dd>
    </div>
  );
}

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getById(id),
  });

  if (isLoading) {
    return (
      <div className="w-full">
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="w-full">
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-muted">Event not found.</p>
            <Link href="/dashboard/events" className="text-primary hover:underline mt-2 inline-block">
              Back to Events
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Back link */}
      <Link
        href="/dashboard/events"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Events
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">{event.title}</h1>
            <Badge variant={statusBadgeVariant[event.status]}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </Badge>
            {event.eventType && (
              <Badge variant="muted">
                {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
              </Badge>
            )}
          </div>
          {event.description && (
            <p className="text-muted mt-2 max-w-2xl">{event.description}</p>
          )}
        </div>
        <Link href="/dashboard/events">
          <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
            Edit
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Schedule */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Clock className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Schedule</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Start Date" value={formatDateTime(event.startDate)} />
            <DetailField label="End Date" value={formatDateTime(event.endDate)} />
            <DetailField label="Duration" value={getDuration(event.startDate, event.endDate)} />
          </dl>
        </Card>

        {/* Location & Capacity */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Location & Capacity</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Location" value={event.location} />
            <DetailField label="Max Capacity" value={event.maxCapacity} />
          </dl>
        </Card>

        {/* Organizer */}
        {event.organizerId && (
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-6">
              <Users className="w-5 h-5 text-muted" />
              <h2 className="text-lg font-semibold text-foreground">Organizer</h2>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailField
                label="Name"
                value={`${event.organizerId.firstName} ${event.organizerId.lastName}`}
              />
              <DetailField label="Email" value={event.organizerId.email} />
            </dl>
          </Card>
        )}

        {/* Metadata */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Details</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Event Type" value={event.eventType ? event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1) : undefined} />
            <DetailField label="Status" value={event.status.charAt(0).toUpperCase() + event.status.slice(1)} />
            <DetailField label="Created" value={formatDate(event.createdAt)} />
            <DetailField label="Last Updated" value={formatDate(event.updatedAt)} />
          </dl>
        </Card>

        {/* Share Event */}
        <ShareEventSection eventId={id} eventTitle={event.title} existingShareToken={event.shareToken} />
      </div>
    </div>
  );
}

function ShareEventSection({
  eventId,
  eventTitle,
  existingShareToken,
}: {
  eventId: string;
  eventTitle: string;
  existingShareToken?: string;
}) {
  const { hasFeature } = useFeatureAccess();
  const [shareUrl, setShareUrl] = useState<string | null>(
    existingShareToken ? `${window.location.origin}/events/${existingShareToken}` : null
  );

  const shareMutation = useMutation({
    mutationFn: () => eventsApi.generateShareLink(eventId),
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      toast.success('Share link generated');
    },
    onError: () => {
      toast.error('Failed to generate share link');
    },
  });

  if (!hasFeature('event_sharing')) {
    return null;
  }

  return (
    <Card padding="lg">
      <div className="flex items-center gap-2 mb-6">
        <Share2 className="w-5 h-5 text-muted" />
        <h2 className="text-lg font-semibold text-foreground">Share Event</h2>
      </div>

      {shareUrl ? (
        <div className="space-y-4">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="flex-1 bg-transparent text-sm text-gray-600 dark:text-gray-300 outline-none"
            />
          </div>
          <ShareButtons url={shareUrl} title={eventTitle} />
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <button
              disabled
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-gray-400 text-xs font-medium rounded-lg cursor-not-allowed"
              title="Coming Soon"
            >
              <MessageSquare className="w-4 h-4" />
              Share via SMS (Coming Soon)
            </button>
          </div>
        </div>
      ) : (
        <Button
          onClick={() => shareMutation.mutate()}
          isLoading={shareMutation.isPending}
          variant="outline"
          leftIcon={<Share2 className="w-4 h-4" />}
        >
          Generate Share Link
        </Button>
      )}
    </Card>
  );
}
