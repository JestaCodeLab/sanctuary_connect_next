'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  AlertCircle,
  Edit,
  Trash2,
  Play,
  ToggleLeft,
  ToggleRight,
  Loader,
  Calendar,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui';
import { organizationApi, api } from '@/lib/api';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';

interface ShepherdAlert {
  _id: string;
  name: string;
  description: string;
  isActive: boolean;
  absenceThreshold: number;
  lookbackPeriodDays: number;
  monitoredEventIds: string[];
  alertRecipients: Array<{
    memberId: string;
    phoneNumber: string;
    role: string;
  }>;
  totalAlertsTriggered: number;
  smsSentCount: number;
  lastCheckAt: string | null;
  createdAt: string;
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
      setAlerts(Array.isArray(response.data) ? response.data : response.data.alerts || []);
    } catch (error) {
      console.error('Error fetching shepherd alerts:', error);
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
    } catch (error) {
      console.error('Error deleting alert:', error);
      alert('Failed to delete alert');
    } finally {
      setDeleting(null);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      setToggling(id);
      const response = await api.patch(`/api/shepherd-alerts/${id}/toggle`);
      setAlerts(
        alerts.map(a => (a._id === id ? response.data.alert : a))
      );
    } catch (error) {
      console.error('Error toggling alert:', error);
      alert('Failed to toggle alert');
    } finally {
      setToggling(null);
    }
  };

  const handleRunCheck = async (id: string) => {
    try {
      await api.post(`/api/shepherd-alerts/${id}/run`);
      // Refresh alerts to show updated lastCheckAt
      await fetchAlerts();
      alert('Alert check completed');
    } catch (error) {
      console.error('Error running alert check:', error);
      alert('Failed to run alert check');
    }
  };

  if (!isFeatureAvailable) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
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
          <h1 className="text-3xl font-bold text-foreground">Shepherd Alerts</h1>
          <p className="text-muted-foreground mt-1">
            Automated SMS alerts when members are frequently absent from events
          </p>
        </div>
        <Link href="/dashboard/attendance/shepherd-alerts/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
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
          <h3 className="text-lg font-semibold text-foreground mb-1">No Alerts Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first Shepherd Alert to start monitoring member attendance
          </p>
          <Link href="/dashboard/attendance/shepherd-alerts/new">
            <Button>Create Alert</Button>
          </Link>
        </div>
      )}

      {/* Alerts Grid */}
      {!loading && alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.map(alert => (
            <div
              key={alert._id}
              className="bg-card rounded-lg border border-border p-6 hover:border-primary/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-foreground">{alert.name}</h3>
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
                  {alert.description && (
                    <p className="text-sm text-muted-foreground">{alert.description}</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-border">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Absence Threshold</p>
                  <p className="text-lg font-semibold text-foreground">
                    {alert.absenceThreshold}x
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Lookback Period</p>
                  <p className="text-lg font-semibold text-foreground">
                    {alert.lookbackPeriodDays} days
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Alerts Triggered</p>
                  <p className="text-lg font-semibold text-foreground">
                    {alert.totalAlertsTriggered}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SMS Sent</p>
                  <p className="text-lg font-semibold text-foreground">
                    {alert.smsSentCount}
                  </p>
                </div>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {alert.monitoredEventIds.length} event{alert.monitoredEventIds.length !== 1 ? 's' : ''}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {alert.alertRecipients.length} recipient{alert.alertRecipients.length !== 1 ? 's' : ''}
                </div>
                <div className="text-sm text-muted-foreground">
                  Last check: {alert.lastCheckAt
                    ? new Date(alert.lastCheckAt).toLocaleDateString()
                    : 'Never'}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleToggle(alert._id)}
                  disabled={toggling === alert._id}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  title={alert.isActive ? 'Deactivate' : 'Activate'}
                >
                  {toggling === alert._id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : alert.isActive ? (
                    <ToggleRight className="w-4 h-4" />
                  ) : (
                    <ToggleLeft className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={() => handleRunCheck(alert._id)}
                  className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                  title="Run check now"
                >
                  <Play className="w-4 h-4" />
                </button>

                <Link href={`/dashboard/attendance/shepherd-alerts/${alert._id}`}>
                  <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors">
                    <Edit className="w-4 h-4" />
                  </button>
                </Link>

                <button
                  onClick={() => handleDelete(alert._id)}
                  disabled={deleting === alert._id}
                  className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  title="Delete"
                >
                  {deleting === alert._id ? (
                    <Loader className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
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
