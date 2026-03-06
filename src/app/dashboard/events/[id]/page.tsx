'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Calendar, Clock, MapPin, Users, Tag, Share2, MessageSquare, Copy, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import ShareButtons from '@/components/dashboard/ShareButtons';
import QRCodeDisplay from '@/components/dashboard/QRCodeDisplay';
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
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/events/${event._id}/attendance`}>
            <Button variant="outline" size="sm" leftIcon={<Users className="w-4 h-4" />}>
              View Attendance
            </Button>
          </Link>
          <QRCodeDisplay eventId={event._id} eventTitle={event.title} />
          <ShareEventSection eventId={event._id} eventTitle={event.title} existingShareToken={event.shareToken} />
          <Link href="/dashboard/events">
            <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>
        </div>
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

        {/* Recurring Event Info */}
        {event.isRecurring && (
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-6">
              <Calendar className="w-5 h-5 text-muted" />
              <h2 className="text-lg font-semibold text-foreground">Recurring Event</h2>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              <DetailField 
                label="Pattern" 
                value={event.recurrencePattern ? event.recurrencePattern.charAt(0).toUpperCase() + event.recurrencePattern.slice(1) : undefined} 
              />
              <DetailField 
                label="Day of Week" 
                value={event.recurrenceDay !== undefined ? ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][event.recurrenceDay] : undefined} 
              />
              {event.recurrenceEndDate && (
                <DetailField label="Recurrence End Date" value={formatDate(event.recurrenceEndDate)} />
              )}
            </dl>
          </Card>
        )}
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(
    existingShareToken ? `${window.location.origin}/events/${existingShareToken}` : null
  );
  const [copied, setCopied] = useState(false);

  const shareMutation = useMutation({
    mutationFn: () => eventsApi.generateShareLink(eventId),
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      setIsModalOpen(true);
      toast.success('Share link generated');
    },
    onError: (error: any) => {
      const errorData = error.response?.data;
      if (errorData?.code === 'FEATURE_GATED') {
        toast.error(`Event sharing is only available on the ${errorData.requiredPlan} plan or higher. Please upgrade your subscription.`);
      } else if (errorData?.code === 'NO_SUB') {
        toast.error('No active subscription found. Please set up a subscription to use this feature.');
      } else {
        toast.error(errorData?.error || 'Failed to generate share link');
      }
    },
  });

  const handleCopyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = () => {
    if (shareUrl) {
      setIsModalOpen(true);
    } else {
      shareMutation.mutate();
    }
  };

  if (!hasFeature('event_sharing')) {
    return null;
  }

  return (
    <>
      <Button
        onClick={handleShare}
        isLoading={shareMutation.isPending}
        variant="outline"
        size="sm"
        leftIcon={<Share2 className="w-4 h-4" />}
      >
        Share
      </Button>

      {/* Share Modal */}
      {isModalOpen && shareUrl && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-lg w-full relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-muted hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-primary mr-2" />
                <h2 className="text-xl font-semibold text-foreground">
                  Share Event
                </h2>
              </div>
              <p className="text-sm text-muted">
                Share this link for {eventTitle}
              </p>
            </div>

            <div className="space-y-4">
              {/* Copy Link Section */}
              <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-border">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-foreground outline-none"
                  onClick={(e) => e.currentTarget.select()}
                />
                <Button
                  size="sm"
                  onClick={handleCopyLink}
                  leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  variant={copied ? 'primary' : 'outline'}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </div>

              {/* Share Buttons */}
              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium text-foreground mb-3">Share via:</p>
                <ShareButtons url={shareUrl} title={eventTitle} />
              </div>

              {/* Coming Soon Feature */}
              <div className="border-t border-border pt-4">
                <button
                  disabled
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-muted text-xs font-medium rounded-lg cursor-not-allowed"
                  title="Coming Soon"
                >
                  <MessageSquare className="w-4 h-4" />
                  Share via SMS (Coming Soon)
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  );
}
