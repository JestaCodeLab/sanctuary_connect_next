'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Calendar, MapPin, Clock, Users as UsersIcon } from 'lucide-react';
import { eventsApi } from '@/lib/api';

export default function PublicEventPage() {
  const { shareToken } = useParams<{ shareToken: string }>();

  const { data: event, isLoading, error } = useQuery({
    queryKey: ['public-event', shareToken],
    queryFn: () => eventsApi.getPublicEvent(shareToken),
    enabled: !!shareToken,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AAFDC]"></div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Event Not Found</h1>
          <p className="text-gray-500">This event link may have expired or is no longer available.</p>
        </div>
      </div>
    );
  }

  const startDate = new Date(event.startDate);
  const endDate = new Date(event.endDate);
  const durationMs = endDate.getTime() - startDate.getTime();
  const durationHours = Math.round(durationMs / (1000 * 60 * 60));

  const statusColors: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    ongoing: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[event.status] || statusColors.scheduled}`}>
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
            {event.eventType && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                {event.eventType}
              </span>
            )}
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
          {event.description && (
            <p className="text-gray-600 mt-3 text-lg">{event.description}</p>
          )}
        </div>
      </div>

      {/* Details */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Calendar className="w-5 h-5 text-[#3AAFDC]" />
              <h2 className="font-semibold text-gray-900">Date & Time</h2>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-900">Start:</span>{' '}
                {startDate.toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}{' '}
                at {startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
              <p>
                <span className="font-medium text-gray-900">End:</span>{' '}
                {endDate.toLocaleDateString('en-US', {
                  weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                })}{' '}
                at {endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <div className="space-y-4">
              {event.location && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <MapPin className="w-5 h-5 text-[#3AAFDC]" />
                    <h2 className="font-semibold text-gray-900">Location</h2>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{event.location}</p>
                </div>
              )}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-[#3AAFDC]" />
                  <h2 className="font-semibold text-gray-900">Duration</h2>
                </div>
                <p className="text-sm text-gray-600 ml-8">
                  {durationHours > 0 ? `${durationHours} hour${durationHours > 1 ? 's' : ''}` : 'Less than 1 hour'}
                </p>
              </div>
              {event.maxCapacity && (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <UsersIcon className="w-5 h-5 text-[#3AAFDC]" />
                    <h2 className="font-semibold text-gray-900">Capacity</h2>
                  </div>
                  <p className="text-sm text-gray-600 ml-8">{event.maxCapacity} people</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {event.organizerId && (
          <div className="mt-6 bg-white rounded-xl p-6 border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-2">Organizer</h2>
            <p className="text-sm text-gray-600">
              {event.organizerId.firstName} {event.organizerId.lastName}
            </p>
          </div>
        )}

        {/* Powered by badge */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            Powered by Sanctuary Connect
          </p>
        </div>
      </div>
    </div>
  );
}
