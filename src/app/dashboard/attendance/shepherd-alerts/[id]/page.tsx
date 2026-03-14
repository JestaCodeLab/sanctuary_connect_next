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
  Calendar,
  Clock,
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

interface ShepherdAlert {
  _id: string;
  name: string;
  description: string;
  monitoredEventIds: string[];
  alertRecipients: Array<{ memberId: string; phoneNumber: string; role: string }>;
  absenceThreshold: number;
  lookbackPeriodDays: number;
  smsTemplate: string;
  checkSchedule: string;
}

interface AlertLog {
  _id: string;
  memberId: string;
  memberName: string;
  eventName: string;
  absenceCount: number;
  triggerred: boolean;
  smsSent: boolean;
  createdAt: string;
}

export default function ShepherdAlertDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [alert, setAlert] = useState<ShepherdAlert | null>(null);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'logs'>('edit');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    monitoredEventIds: [] as string[],
    alertRecipients: [] as Array<{ memberId: string; phoneNumber: string; role: string }>,
    absenceThreshold: 3,
    lookbackPeriodDays: 30,
    smsTemplate: '',
    checkSchedule: 'weekly',
  });

  const [selectedMemberId, setSelectedMemberId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [alertRes, eventsRes, membersRes, logsRes] = await Promise.all([
          api.get(`/api/shepherd-alerts/${params.id}`),
          api.get('/api/events'),
          api.get('/api/members'),
          api.get(`/api/shepherd-alerts/logs/list?shepherdAlertId=${params.id}`),
        ]);
        
        setAlert(alertRes.data.alert || alertRes.data);
        setFormData(alertRes.data.alert || alertRes.data);
        setEvents(Array.isArray(eventsRes.data) ? eventsRes.data : eventsRes.data.events || []);
        setMembers(Array.isArray(membersRes.data) ? membersRes.data : membersRes.data.members || []);
        setLogs(Array.isArray(logsRes.data) ? logsRes.data : logsRes.data.logs || []);
      } catch (err) {
        console.error('Error fetching data:', err);
        setError('Failed to load alert');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [params.id]);

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
      await api.patch(`/api/shepherd-alerts/${params.id}`, formData);
      router.push('/dashboard/attendance/shepherd-alerts');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update alert');
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

  if (!alert) {
    return (
      <div className="space-y-6">
        <Link href="/dashboard/attendance/shepherd-alerts">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
          <p className="text-sm text-destructive">Alert not found</p>
        </div>
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
        <h1 className="text-3xl font-bold text-foreground">{alert.name}</h1>
        <p className="text-muted-foreground mt-1">Edit and manage this Shepherd Alert</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border">
        <button
          onClick={() => setActiveTab('edit')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'edit'
              ? 'text-primary border-b-2 border-primary -mb-[1px]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Edit
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'logs'
              ? 'text-primary border-b-2 border-primary -mb-[1px]'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          History
        </button>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Edit Tab */}
      {activeTab === 'edit' && (
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
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          {/* Configuration */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Configuration</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Absence Threshold
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
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Lookback Period (days)
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
                Variables: {'{memberName}'}, {'{eventName}'}, {'{absenceCount}'}, {'{lookbackPeriodDays}'}
              </p>
            </div>
          </div>

          {/* Events Selection */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Events to Monitor</h3>
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
          </div>

          {/* Recipients */}
          <div className="bg-card rounded-lg border border-border p-6 space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Alert Recipients</h3>

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
                      className="p-2 rounded-lg hover:bg-destructive/20"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
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
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Link href="/dashboard/attendance/shepherd-alerts">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </form>
      )}

      {/* Logs Tab */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          {logs.length === 0 ? (
            <div className="bg-card rounded-lg border border-border p-8 text-center">
              <Clock className="w-12 h-12 text-muted mx-auto mb-4" />
              <p className="text-muted-foreground">No alert history yet</p>
            </div>
          ) : (
            <div className="bg-card rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-accent border-b border-border">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Member</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Absences</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Triggered</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">SMS Sent</th>
                    <th className="px-4 py-3 text-left font-medium text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => (
                    <tr key={log._id} className="border-b border-border hover:bg-accent transition-colors">
                      <td className="px-4 py-3 text-foreground">{log.memberName}</td>
                      <td className="px-4 py-3 text-foreground">{log.eventName}</td>
                      <td className="px-4 py-3 text-foreground">{log.absenceCount}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.triggerred
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {log.triggerred ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          log.smsSent
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {log.smsSent ? 'Sent' : 'Not Sent'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
