'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, AlertCircle, Edit, Trash2, ToggleLeft, ToggleRight, Loader, Users } from 'lucide-react';
import { Button } from '@/components/ui';
import { api } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import toast from 'react-hot-toast';

interface ShepherdAlert {
  _id: string;
  name: string;
  isActive: boolean;
  absenceThreshold?: number;
  lookbackPeriodDays?: number;
  shepherds?: Array<{ memberId: string; phoneNumber: string }>;
  totalAlertsTriggered?: number;
  smsSentCount?: number;
  lastCheckAt?: string | null;
}

export default function ShepherdAlertsPage() {
  const router = useRouter();
  const { hasFeature } = useFeatureAccess();
  const [alerts, setAlerts] = useState<ShepherdAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const isFeatureAvailable = hasFeature('ai_shepherd_alerts');

  useEffect(() => {
    if (isFeatureAvailable) {
      fetchAlerts();
    }
  }, [isFeatureAvailable]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/shepherd-alerts');
      const data = Array.isArray(response.data) ? response.data : response.data.alerts || [];

      // Ensure all fields have defaults
      const normalized = data.map((alert: any) => ({
        ...alert,
        shepherds: alert.shepherds || [],
        totalAlertsTriggered: alert.totalAlertsTriggered || 0,
        smsSentCount: alert.smsSentCount || 0,
        absenceThreshold: alert.absenceThreshold || 3,
        lookbackPeriodDays: alert.lookbackPeriodDays || 30,
      }));

      setAlerts(normalized);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      toast.error('Failed to load shepherd alerts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      setDeleting(id);
      await api.delete(`/api/shepherd-alerts/${id}`);
      setAlerts(alerts.filter(a => a._id !== id));
      toast.success('Alert deleted');
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setToggling(id);
      const response = await api.patch(`/api/shepherd-alerts/${id}/toggle`);
      setAlerts(alerts.map(a => (a._id === id ? response.data.alert : a)));
      const alert = alerts.find(a => a._id === id);
      toast.success(alert?.isActive ? 'Alert deactivated' : 'Alert activated');
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Failed to toggle alert');
    } finally {
      setToggling(null);
    }
  };

  if (!isFeatureAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Feature Not Available</h1>
          <p className="text-muted-foreground">
            Shepherd Alerts are available on Growth, Ascend, and Sanctuary plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Shepherd Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Monitor member attendance and automatically notify shepherds
          </p>
        </div>
        <Link href="/dashboard/attendance/shepherd-alerts/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Alert
          </Button>
        </Link>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}

      {/* Empty State */}
      {!loading && alerts.length === 0 && (
        <div className="bg-card rounded-lg border border-border p-8 text-center">
          <AlertCircle className="w-12 h-12 text-muted mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-1">No Alerts Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first Shepherd Alert to start monitoring member attendance
          </p>
          <Link href="/dashboard/attendance/shepherd-alerts/new">
            <Button>Create Alert</Button>
          </Link>
        </div>
      )}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <div
              key={alert._id}
              className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{alert.name}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        alert.isActive
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                      }`}
                    >
                      {alert.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Threshold</p>
                  <p className="text-lg font-semibold">{alert.absenceThreshold || 3}x</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Period</p>
                  <p className="text-lg font-semibold">{alert.lookbackPeriodDays || 30}d</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Alerts Triggered</p>
                  <p className="text-lg font-semibold">{alert.totalAlertsTriggered || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SMS Sent</p>
                  <p className="text-lg font-semibold">{alert.smsSentCount || 0}</p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-border text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Monitors all members
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Notifying {(alert.shepherds || []).length} shepherd{(alert.shepherds || []).length !== 1 ? 's' : ''}
                </div>
                <div>
                  Last check: {alert.lastCheckAt ? new Date(alert.lastCheckAt).toLocaleDateString() : 'Never'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(alert._id)}
                  disabled={toggling === alert._id}
                  className="p-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50"
                  title={alert.isActive ? 'Deactivate' : 'Activate'}
                >
                  {toggling === alert._id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : alert.isActive ? (
                    <ToggleRight className="w-4 h-4 text-green-600" />
                  ) : (
                    <ToggleLeft className="w-4 h-4 text-gray-400" />
                  )}
                </button>

                <Link href={`/dashboard/attendance/shepherd-alerts/${alert._id}`}>
                  <button className="p-2 rounded-lg hover:bg-accent transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </Link>

                <button
                  onClick={() => handleDelete(alert._id)}
                  disabled={deleting === alert._id}
                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 ml-auto"
                >
                  {deleting === alert._id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 text-red-600" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
