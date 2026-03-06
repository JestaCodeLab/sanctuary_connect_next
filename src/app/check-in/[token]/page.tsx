'use client';

import { use, useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle, XCircle, User, Mail, Phone, Calendar, MapPin, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export default function PublicCheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [checkInType, setCheckInType] = useState<'member' | 'guest'>('guest');
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
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
      console.log('Making API call with data:', data);
      const response = await axios.post(`${API_URL}/api/attendance/check-in/qr`, data);
      return response.data;
    },
    onSuccess: (result) => {
      setCheckInSuccess(true);
      setCheckInResult(result.record);
      toast.success('Check-in successful!');
    },
    onError: (error: any) => {
      console.error('Check-in error:', error.response?.data || error.message);
      const message = error.response?.data?.error || 'Check-in failed';
      
      // Show more helpful messages based on error type
      if (message.includes('token') || message.includes('QR')) {
        toast.error('Invalid or expired check-in code. Please ask the event organizer for a new QR code.');
      } else if (message.includes('Already checked in')) {
        toast.error('You have already checked in to this event.');
      } else {
        toast.error(message);
      }
    },
  });

  const handleCheckIn = () => {
    // Check if event has started
    if (eventData.startDate && new Date(eventData.startDate) > new Date()) {
      toast.error('Check-in is not yet available. This event starts on ' + new Date(eventData.startDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      }));
      return;
    }

    if (checkInType === 'guest') {
      if (!guestInfo.name) {
        toast.error('Name is required');
        return;
      }
    }

    // Always include the token
    const data: any = { token };

    if (checkInType === 'guest') {
      data.name = guestInfo.name;
      data.email = guestInfo.email;
      data.phone = guestInfo.phone;
    }

    console.log('Check-in data being sent:', data); // Debug log
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
              <p>
                <span className="font-medium text-foreground">Name:</span>{' '}
                <span className="text-muted">
                  {checkInResult?.name || 
                   (checkInResult?.memberId && `${checkInResult.memberId.firstName} ${checkInResult.memberId.lastName}`) ||
                   (checkInResult?.userId && `${checkInResult.userId.firstName} ${checkInResult.userId.lastName}`)}
                </span>
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

          {/* Event Not Started Notice */}
          {eventData.startDate && new Date(eventData.startDate) > new Date() && (
            <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 text-center">
                ⚠️ Check-in is not yet available. This event starts on {new Date(eventData.startDate).toLocaleDateString('en-US', {
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
            {eventData.startDate && (
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-medium text-foreground">Date & Time</p>
                  <p className="text-muted">
                    {new Date(eventData.startDate).toLocaleString('en-US', {
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
          
          {/* Guest Information */}
          <div className="space-y-4">
            <Input
              label="Full Name"
              placeholder="Enter your name"
              value={guestInfo.name}
              onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
              leftIcon={<User className="w-4 h-4" />}
              required
            />
            <Input
              label="Email (Optional)"
              type="email"
              placeholder="your@email.com"
              value={guestInfo.email}
              onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
              leftIcon={<Mail className="w-4 h-4" />}
            />
            <Input
              label="Phone (Optional)"
              type="tel"
              placeholder="+1 (555) 000-0000"
              value={guestInfo.phone}
              onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
              leftIcon={<Phone className="w-4 h-4" />}
            />
          </div>

          <Button
            className="w-full mt-6"
            size="lg"
            onClick={handleCheckIn}
            disabled={
              checkInMutation.isPending || 
              !guestInfo.name || 
              (eventData.startDate && new Date(eventData.startDate) > new Date())
            }
          >
            {checkInMutation.isPending ? 'Checking In...' : 
             (eventData.startDate && new Date(eventData.startDate) > new Date()) ? 'Event Not Started' : 'Check In'}
          </Button>
        </Card>

        {/* Privacy Notice */}
        <p className="text-xs text-center text-muted">
          Your information will only be used for attendance tracking and event communications.
        </p>
      </div>
    </div>
  );
}
