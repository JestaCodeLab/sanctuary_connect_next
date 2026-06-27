'use client';

import { use, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, Phone, Calendar, MapPin, Clock, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [phone, setPhone] = useState('');
  const [serviceCode, setServiceCode] = useState('');
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const [checkInResult, setCheckInResult] = useState<any>(null);

  // Fetch event details by token (public API)
  const { data: eventData, isLoading: eventLoading, error: eventError } = useQuery({
    queryKey: ['event', 'token', token],
    queryFn: async () => {
      const response = await axios.get(`${API_URL}/api/events/check-in/${token}`);
      return response.data;
    },
    retry: false,
  });

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post(`${API_URL}/api/attendance/check-in/qr`, data);
      return response.data;
    },
    onSuccess: (result) => {
      setCheckInSuccess(true);
      setCheckInResult(result.record);
      toast.success('Check-in successful!');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed';
      const data = error.response?.data;

      if (data?.requiresServiceCode) {
        toast.error('Service code is required for this event. Please ask the event organizer for the code.');
      } else if (message.includes('Service code')) {
        toast.error('Invalid service code. Please verify the code with the event organizer and try again.');
      } else if (message.includes('token') || message.includes('QR')) {
        toast.error('Invalid or expired check-in code. Please ask the event organizer for a new QR code.');
      } else if (message.includes('Already checked in')) {
        toast.error('You have already checked in to this event.');
      } else {
        toast.error(message);
      }
    },
  });

  const getEventDate = () => eventData.occurrenceDate || eventData.startDate;
  const getEventDateString = (date: string) => new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const handleCheckIn = () => {
    const eventDate = getEventDate();
    if (eventDate && new Date(eventDate) > new Date()) {
      toast.error('Check-in is not yet available. This event starts on ' + getEventDateString(eventDate));
      return;
    }

    if (!phone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    if (eventData.usesServiceCodes && !serviceCode.trim()) {
      toast.error('Service code is required for this event');
      return;
    }

    const data: any = { token, phone: phone.trim() };
    if (eventData.usesServiceCodes && serviceCode) {
      data.serviceCode = serviceCode.trim();
    }

    checkInMutation.mutate(data);
  };

  if (eventLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
        <Card padding="lg" className="w-full max-w-md">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  if (eventError || !eventData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center py-8">
            <XCircle className="w-16 h-16 text-error mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Invalid Check-In Link</h1>
            <p className="text-muted">
              This check-in link is invalid or has expired. Please contact the event organizer.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // Resolve the display name from check-in result
  const resolvedName = checkInResult?.memberId
    ? `${checkInResult.memberId.firstName} ${checkInResult.memberId.lastName}`
    : checkInResult?.userId
    ? `${checkInResult.userId.firstName} ${checkInResult.userId.lastName}`
    : null;

  const resolvedPhone = checkInResult?.memberId?.phone
    || checkInResult?.phone
    || phone;

  if (checkInSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
        <Card padding="lg" className="w-full max-w-md">
          <div className="text-center py-8">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">Check-In Successful!</h1>
            <p className="text-muted mb-6">
              You have successfully checked in to {eventData.title}
            </p>
            <div className="bg-muted/20 rounded-lg p-4 text-left space-y-2 text-sm">
              {resolvedName && (
                <p>
                  <span className="font-medium text-foreground">Name:</span>{' '}
                  <span className="text-muted">{resolvedName}</span>
                </p>
              )}
              <p>
                <span className="font-medium text-foreground">Phone:</span>{' '}
                <span className="text-muted">{resolvedPhone}</span>
              </p>
              <p>
                <span className="font-medium text-foreground">Time:</span>{' '}
                <span className="text-muted">
                  {checkInResult && new Date(checkInResult.checkInTime).toLocaleString()}
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const eventDate = eventData.occurrenceDate || eventData.startDate;
  const eventNotStarted = eventDate && new Date(eventDate) > new Date();

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-primary/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Event Info Card */}
        <Card padding="lg">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground mb-2">{eventData.title}</h1>
            {eventData.description && (
              <p className="text-sm text-muted mb-4">{eventData.description}</p>
            )}
          </div>

          {eventNotStarted && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
                ⚠️ Check-in is not yet available. This event starts on {new Date(eventDate).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </p>
            </div>
          )}

          <div className="space-y-3 bg-muted/20 rounded-lg p-4">
            {eventDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">
                    {eventData.isRecurring ? 'Next Occurrence' : 'Date & Time'}
                  </p>
                  <p className="text-muted">
                    {new Date(eventDate).toLocaleString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            )}

            {eventData.location && (
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Location</p>
                  <p className="text-muted">{eventData.location}</p>
                </div>
              </div>
            )}

            {eventData.eventType && (
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Event Type</p>
                  <p className="text-muted capitalize">{eventData.eventType.replace('_', ' ')}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Check-In Form */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Check In</h2>

          {eventData.usesServiceCodes && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-2">
                <Lock className="w-4 h-4 text-blue-700 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-400 font-medium mb-1">
                    Service Code Required
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-500">
                    Ask the event organizer for the 4-digit code. You have until the next day to check in.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Input
              label="Phone Number"
              type="tel"
              placeholder="Enter your phone number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leftIcon={<Phone className="w-4 h-4" />}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
            />

            {eventData.usesServiceCodes && (
              <Input
                label="Service Code"
                type="text"
                inputMode="numeric"
                placeholder="Enter 4-digit service code"
                value={serviceCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  setServiceCode(value.slice(0, 4));
                }}
                leftIcon={<Lock className="w-4 h-4" />}
                onKeyDown={(e) => e.key === 'Enter' && handleCheckIn()}
                maxLength={4}
              />
            )}
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending || !phone.trim() || (eventData.usesServiceCodes && !serviceCode.trim()) || eventNotStarted}
          >
            {checkInMutation.isPending ? 'Checking In...' :
             eventNotStarted ? 'Event Not Started' : 'Check In'}
          </Button>
        </Card>

        <p className="text-xs text-center text-muted">
          Your information will only be used for attendance tracking.
        </p>
      </div>
    </div>
  );
}
