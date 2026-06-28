'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

export default function NewShepherdAlertPage() {
  const router = useRouter();
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
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/api/members');
        setMembers(Array.isArray(response.data) ? response.data : response.data.members || []);
      } catch (err) {
        console.error('Error fetching members:', err);
        setError('Failed to load members');
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

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
      await api.post('/api/shepherd-alerts', formData);
      toast.success('Shepherd alert created successfully!');
      router.push('/dashboard/attendance/shepherd-alerts');
    } catch (err: any) {
      const message = err?.response?.data?.error || 'Failed to create alert';
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const shepherdNames = formData.shepherds
    .map(s => members.find(m => m._id === s.memberId))
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/attendance/shepherd-alerts">
          <button className="p-2 hover:bg-accent rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Shepherd Alert</h1>
          <p className="text-muted-foreground mt-1">
            Automatically monitor all members' attendance and notify shepherds when absence thresholds are exceeded
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
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

        {/* Alert Name */}
        <div>
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

        {/* Absence Threshold & Period */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
        </div>

        {/* Shepherds to Notify */}
        <div>
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

        {/* Submit Buttons */}
        <div className="flex gap-3 pt-6 border-t border-border">
          <Link href="/dashboard/attendance/shepherd-alerts" className="flex-1">
            <Button variant="outline" className="w-full">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={submitting}
            isLoading={submitting}
            className="flex-1"
          >
            Create Alert
          </Button>
        </div>
      </form>
    </div>
  );
}
