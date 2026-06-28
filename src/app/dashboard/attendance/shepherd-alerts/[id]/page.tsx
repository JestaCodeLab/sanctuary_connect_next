'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertCircle, Loader, Plus, X } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Member {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
}

interface FormData {
  name: string;
  shepherds: Array<{ memberId: string; phoneNumber: string }>;
  absenceThreshold: number;
  lookbackPeriodDays: number;
}

export default function EditShepherdAlertPage() {
  const router = useRouter();
  const params = useParams();
  const alertId = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<FormData>({
    name: '',
    shepherds: [],
    absenceThreshold: 3,
    lookbackPeriodDays: 30,
  });

  const [selectedShepherd, setSelectedShepherd] = useState('');

  useEffect(() => {
    if (!alertId) {
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        const [alertRes, membersRes] = await Promise.all([
          api.get(`/api/shepherd-alerts/${alertId}`),
          api.get('/api/members'),
        ]);

        const alertData = alertRes.data.alert || alertRes.data;

        if (!alertData || !alertData.name) {
          throw new Error('Invalid alert data received');
        }

        setFormData({
          name: alertData.name || '',
          shepherds: alertData.shepherds || [],
          absenceThreshold: alertData.absenceThreshold || 3,
          lookbackPeriodDays: alertData.lookbackPeriodDays || 30,
        });

        setMembers(Array.isArray(membersRes.data) ? membersRes.data : membersRes.data.members || []);
      } catch (err: any) {
        console.error('Error fetching data:', err);
        const errorMsg = err?.response?.data?.error || err?.message || 'Failed to load alert';
        setError(errorMsg);
        toast.error(errorMsg);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [alertId]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) : value,
    }));
  };

  const handleAddShepherd = () => {
    if (!selectedShepherd) {
      setError('Please select a shepherd');
      return;
    }

    const alreadyAdded = formData.shepherds.some(s => s.memberId === selectedShepherd);
    if (alreadyAdded) {
      setError('This shepherd is already added');
      return;
    }

    const member = members.find(m => m._id === selectedShepherd);
    if (!member) return;

    setFormData(prev => ({
      ...prev,
      shepherds: [
        ...prev.shepherds,
        {
          memberId: selectedShepherd,
          phoneNumber: member.phone,
        },
      ],
    }));
    setSelectedShepherd('');
    setError('');
  };

  const handleRemoveShepherd = (memberId: string) => {
    setFormData(prev => ({
      ...prev,
      shepherds: prev.shepherds.filter(s => s.memberId !== memberId),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!alertId) {
      setError('Alert ID not found');
      return;
    }

    if (!formData.name.trim()) {
      setError('Alert name is required');
      return;
    }

    if (formData.shepherds.length === 0) {
      setError('Please add at least one shepherd to notify');
      return;
    }

    try {
      setSubmitting(true);
      await api.patch(`/api/shepherd-alerts/${alertId}`, formData);
      toast.success('Shepherd alert updated successfully!');
      router.push('/dashboard/attendance/shepherd-alerts');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to update alert';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !alertId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !formData.name) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance/shepherd-alerts">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Edit Shepherd Alert</h1>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">{error}</p>
              <Link href="/dashboard/attendance/shepherd-alerts">
                <Button variant="outline" size="sm">
                  Back to Alerts
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const shepherdNames = formData.shepherds
    .map(s => members.find(m => m._id === s.memberId))
    .filter((m): m is Member => Boolean(m));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/attendance/shepherd-alerts">
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Shepherd Alert</h1>
          <p className="text-muted-foreground mt-1">
            Update shepherd alert settings and notifications
          </p>
        </div>
      </div>

      {/* Form Container - Full Width */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it works:</strong> This alert monitors attendance for <strong>all members</strong> in your organization. When any member reaches the absence threshold, selected shepherds will be notified via SMS.
          </p>
        </div>

        {/* Form Fields - 2 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Alert Name - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">Alert Name</label>
            <Input
              name="name"
              placeholder="e.g., 'Sunday Service Attendance Monitor'"
              value={formData.name}
              onChange={handleInputChange}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground mt-1">{formData.name.length}/100</p>
          </div>

          {/* Absence Threshold */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Absence Threshold
            </label>
            <select
              name="absenceThreshold"
              value={formData.absenceThreshold}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>
                  {n} absence{n !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">Alert when member exceeds this</p>
          </div>

          {/* Look Back Period */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Look Back Period
            </label>
            <select
              name="lookbackPeriodDays"
              value={formData.lookbackPeriodDays}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
              <option value={60}>Last 60 days</option>
              <option value={90}>Last 90 days</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">Count absences in this period</p>
          </div>

          {/* Shepherds to Notify - Full Width */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-foreground mb-2">
              Shepherds to Notify
            </label>
            <p className="text-xs text-muted-foreground mb-3">
              Select which shepherds/leaders should be notified when attendance thresholds are exceeded
            </p>
            <div className="flex gap-2 mb-3">
              <select
                value={selectedShepherd}
                onChange={e => setSelectedShepherd(e.target.value)}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select a shepherd...</option>
                {members
                  .filter(m => !formData.shepherds.some(s => s.memberId === m._id))
                  .map(member => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName} ({member.phone})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddShepherd}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            {shepherdNames.length > 0 && (
              <div className="space-y-2">
                {shepherdNames.map(member => (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border border-border"
                  >
                    <div className="text-sm">
                      <div className="font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="text-xs text-muted-foreground">{member.phone}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveShepherd(member._id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Buttons - Compact Width */}
        <div className="flex gap-3 pt-6 border-t border-border">
          <Link href="/dashboard/attendance/shepherd-alerts">
            <Button variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            isLoading={submitting}
          >
            Update Alert
          </Button>
        </div>
      </form>
    </div>
  );
}
