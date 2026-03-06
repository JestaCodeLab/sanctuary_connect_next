'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { UserCheck, CheckCircle, XCircle, User, Mail, Phone, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input, Select } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import { attendanceApi, eventsApi, membersApi } from '@/lib/api';
import type { ChurchEvent, Member } from '@/types';

export default function ManualCheckInPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [checkInType, setCheckInType] = useState<'member' | 'guest'>('member');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [notes, setNotes] = useState('');
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);

  // Fetch events
  const { data: events = [] } = useQuery<ChurchEvent[]>({
    queryKey: ['events'],
    queryFn: () => eventsApi.getAll(),
  });

  // Fetch members for member check-in
  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: membersApi.getAll,
    enabled: checkInType === 'member',
  });

  // Auto-populate event date when event is selected
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find((e) => e._id === selectedEventId);
      if (event?.startDate) {
        const date = new Date(event.startDate).toISOString().split('T')[0];
        setEventDate(date);
      }
    }
  }, [selectedEventId, events]);

  const checkInMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.manualCheckIn(data),
    onSuccess: (result) => {
      toast.success('Check-in successful!');
      setLastCheckIn(result.record);
      // Reset form
      setSelectedMemberId('');
      setGuestInfo({ name: '', email: '', phone: '' });
      setNotes('');
      queryClient.invalidateQueries({ queryKey: ['attendance', 'event', selectedEventId] });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed';
      toast.error(message);
    },
  });

  const handleCheckIn = () => {
    if (!selectedEventId) {
      toast.error('Please select an event');
      return;
    }

    const data: any = { 
      eventId: selectedEventId,
      notes,
    };

    if (checkInType === 'member') {
      if (!selectedMemberId) {
        toast.error('Please select a member');
        return;
      }
      data.memberId = selectedMemberId;
    } else if (checkInType === 'guest') {
      if (!guestInfo.name) {
        toast.error('Guest name is required');
        return;
      }
      data.name = guestInfo.name;
      data.email = guestInfo.email;
      data.phone = guestInfo.phone;
    }

    checkInMutation.mutate(data);
  };

  const eventOptions = events.map((e) => ({
    value: e._id,
    label: `${e.title} - ${new Date(e.startDate).toLocaleDateString()}`,
  }));

  const memberOptions = members.map((m) => ({
    value: m._id,
    label: `${m.firstName} ${m.lastName}`,
  }));

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="Manual Check-In"
        description="Manually record attendance for members or guests"
      />

      <div className="space-y-6 mt-6">
        {/* Event Selection */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Select Event</h2>
          <div className="space-y-4">
            <Select
              label="Event"
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              options={eventOptions}
              placeholder="Select an event"
              required
            />
            {eventDate && (
              <div className="flex items-center gap-2 p-3 bg-muted/20 rounded-lg border border-border">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium text-foreground">Event Date</p>
                  <p className="text-sm text-muted">
                    {new Date(eventDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Check-in Type */}
        {selectedEventId && (
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Check-in Type</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setCheckInType('member')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  checkInType === 'member'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <UserCheck className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-foreground">Member</p>
              </button>
              <button
                onClick={() => setCheckInType('guest')}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                  checkInType === 'guest'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <User className="w-6 h-6 mx-auto mb-2 text-primary" />
                <p className="text-sm font-medium text-foreground">Guest</p>
              </button>
            </div>
          </Card>
        )}

        {/* Member Selection or Guest Information */}
        {selectedEventId && (
          <>
            {checkInType === 'member' ? (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-foreground mb-4">Select Member</h2>
                <Select
                  label="Member"
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  options={memberOptions}
                  placeholder="Search and select a member"
                  required
                />
              </Card>
            ) : (
              <Card padding="lg">
                <h2 className="text-lg font-semibold text-foreground mb-4">Guest Information</h2>
                <div className="space-y-4">
                  <Input
                    label="Full Name"
                    placeholder="Enter guest name"
                    value={guestInfo.name}
                    onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                    leftIcon={<User className="w-4 h-4" />}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="Email address (optional)"
                    value={guestInfo.email}
                    onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                    leftIcon={<Mail className="w-4 h-4" />}
                  />
                  <Input
                    label="Phone"
                    type="tel"
                    placeholder="Phone number (optional)"
                    value={guestInfo.phone}
                    onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                    leftIcon={<Phone className="w-4 h-4" />}
                  />
                </div>
              </Card>
            )}

            {/* Notes */}
            <Card padding="lg">
              <h2 className="text-lg font-semibold text-foreground mb-4">Notes (Optional)</h2>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                rows={3}
                placeholder="Add any notes about this check-in..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Card>

            {/* Check-in Button */}
            <div className="w-full">
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending}
                leftIcon={<UserCheck className="w-5 h-5" />}
              >
                {checkInMutation.isPending ? 'Checking In...' : 'Check In'}
              </Button>
            </div>
          </>
        )}

        {/* Success Message */}
        {lastCheckIn && (
          <Card padding="lg">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-success mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Check-in Successful!</h3>
              <p className="text-sm text-muted mb-4">
                {lastCheckIn.memberId
                  ? `${lastCheckIn.memberId.firstName} ${lastCheckIn.memberId.lastName}`
                  : lastCheckIn.name}{' '}
                has been checked in to {lastCheckIn.eventId?.title}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => {
                    setLastCheckIn(null);
                    setSelectedMemberId('');
                    setGuestInfo({ name: '', email: '', phone: '' });
                  }}
                >
                  Check In Another
                </Button>
                <Button onClick={() => router.push(`/dashboard/events/${lastCheckIn.eventId?._id}/attendance`)}>
                  View All Check-Ins
                </Button>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
