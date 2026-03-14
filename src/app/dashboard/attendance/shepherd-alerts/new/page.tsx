'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader,
  Plus,
  X,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { organizationApi, api } from '@/lib/api';

interface Event {
  _id: string;
  title: string;
  startDate: string;
}

interface Member {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

export default function NewShepherdAlertPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monitoredEventIds: [] as string[],
    alertRecipients: [] as Array<{ memberId: string; phoneNumber: string; role: string }>,
    absenceThreshold: 3,
    lookbackPeriodDays: 30,
    smsTemplate: '{memberName} has been absent from {eventName} {absenceCount} times in the past {lookbackPeriodDays} days.',
    checkSchedule: 'weekly',
  });

  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [eventsRes, membersRes] = await Promise.all([
          api.get('/api/events'),
          api.get('/api/members'),
        ]);
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.events || []);
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : membersRes.data.members || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load events and members');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleEventToggle = (eventId: string) => {
    setFormData(prev => ({
      ...prev,
      monitoredEventIds: prev.monitoredEventIds.includes(eventId)
        ? prev.monitoredEventIds.filter(id => id !== eventId)
        : [...prev.monitoredEventIds, eventId],
    }));
  };

  const handleAddRecipient = () => {
    if (!selectedMemberId) {
      setError('Please select a member');
      return;
    }

    const member = members.find(m => m._id === selectedMemberId);
    if (!member) return;

    const alreadyAdded = formData.alertRecipients.some(r => r.memberId === selectedMemberId);
    if (alreadyAdded) {
      setError('This member is already added as a recipient');
      return;
    }

    setFormData(prev => ({
      ...prev,
      alertRecipients: [
        ...prev.alertRecipients,
        {
          memberId: selectedMemberId,
          phoneNumber: member.phone,
          role: 'shepherd',
        },
      ],
    }));
    setSelectedMemberId('');
    setError('');
  };

  const handleRemoveRecipient = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      alertRecipients: prev.alertRecipients.filter(r => r.memberId !== memberId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Alert name is required');
      return;
    }

    if (formData.monitoredEventIds.length === 0) {
      setError('Please select at least one event to monitor');
      return;
    }

    if (formData.alertRecipients.length === 0) {
      setError('Please add at least one alert recipient');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/api/shepherd-alerts', formData);
      router.push('/dashboard/attendance/shepherd-alerts');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create alert');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Link href="/dashboard/attendance/shepherd-alerts">
        <Button variant="ghost" className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
      </Link>

      <div>
        <h1 className="text-3xl font-bold text-foreground">Create Shepherd Alert</h1>
        <p className="text-muted-foreground mt-1">
          Set up automated SMS alerts for member attendance tracking
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Alert Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="e.g., Sunday Service Attendance Alert"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Description (Optional)
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Additional details about this alert..."
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Configuration</h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Absence Threshold *
              </label>
              <input
                type="number"
                name="absenceThreshold"
                value={formData.absenceThreshold}
                onChange={handleInputChange}
                min={1}
                max={10}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Alert when member misses this many times
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Lookback Period (days) *
              </label>
              <input
                type="number"
                name="lookbackPeriodDays"
                value={formData.lookbackPeriodDays}
                onChange={handleInputChange}
                min={7}
                max={365}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Period to count absences
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Check Schedule
            </label>
            <select
              name="checkSchedule"
              value={formData.checkSchedule}
              onChange={handleInputChange}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="manual">Manual Only</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              SMS Template
            </label>
            <textarea
              name="smsTemplate"
              value={formData.smsTemplate}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-xs"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Available variables: {'{memberName}'}, {'{eventName}'}, {'{absenceCount}'}, {'{lookbackPeriodDays}'}
            </p>
          </div>
        </div>

        {/* Events Selection */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Events to Monitor *</h3>
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">No events available. Create events first.</p>
          ) : (
            <div className="space-y-2">
              {events.map(event => (
                <label key={event._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.monitoredEventIds.includes(event._id)}
                    onChange={() => handleEventToggle(event._id)}
                    className="w-4 h-4 rounded border-border focus:ring-2 focus:ring-primary"
                  />
                  <span className="text-sm text-foreground">{event.title}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(event.startDate).toLocaleDateString()}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Recipients */}
        <div className="bg-card rounded-lg border border-border p-6 space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Alert Recipients (Shepherds) *</h3>

          {/* Add Recipient */}
          <div className="flex gap-2">
            <select
              value={selectedMemberId}
              onChange={e => setSelectedMemberId(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a member...</option>
              {members.map(member => (
                <option key={member._id} value={member._id}>
                  {member.firstName} {member.lastName} ({member.phone})
                </option>
              ))}
            </select>
            <Button
              type="button"
              onClick={handleAddRecipient}
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>

          {/* Recipients List */}
          {formData.alertRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recipients added yet.</p>
          ) : (
            <div className="space-y-2">
              {formData.alertRecipients.map(recipient => {
                const member = members.find(m => m._id === recipient.memberId);
                return (
                  <div
                    key={recipient.memberId}
                    className="flex items-center justify-between p-3 bg-accent rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {member?.firstName} {member?.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{recipient.phoneNumber}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRecipient(recipient.memberId)}
                      className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Button
            type="submit"
            disabled={submitting}
            className="gap-2"
          >
            {submitting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Alert'
            )}
          </Button>
          <Link href="/dashboard/attendance/shepherd-alerts">
            <Button variant="outline">Cancel</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
