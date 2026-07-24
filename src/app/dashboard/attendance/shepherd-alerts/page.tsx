'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, AlertCircle, Bell, Edit, Trash2, ToggleLeft, ToggleRight, Loader, Users } from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { PageHeader, PageLoader, EmptyState, Badge } from '@/components/dashboard';
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
    <div className="no-card-shadow">
      <PageHeader
        title="Shepherd Alerts"
        description="Monitor member attendance and automatically notify shepherds"
        actionLabel="New Alert"
        actionIcon={Plus}
        onAction={() => router.push('/dashboard/attendance/shepherd-alerts/new')}
      />

      {/* Loading State */}
      {loading && <PageLoader label="Loading alerts..." />}

      {/* Empty State */}
      {!loading && alerts.length === 0 && (
        <Card padding="none">
          <EmptyState
            icon={AlertCircle}
            title="No Alerts Yet"
            description="Create your first Shepherd Alert to start monitoring member attendance."
            actionLabel="Create Alert"
            onAction={() => router.push('/dashboard/attendance/shepherd-alerts/new')}
          />
        </Card>
      )}

      {/* Alerts List */}
      {!loading && alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map(alert => (
            <Card key={alert._id} padding="lg" className="hover:border-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-foreground">{alert.name}</h3>
                      <Badge variant={alert.isActive ? 'success' : 'muted'}>
                        {alert.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted mt-1 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      Notifying {(alert.shepherds || []).length} shepherd{(alert.shepherds || []).length !== 1 ? 's' : ''}
                      {' · '}Last check: {alert.lastCheckAt ? new Date(alert.lastCheckAt).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggle(alert._id)}
                    disabled={toggling === alert._id}
                    title={alert.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {toggling === alert._id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : alert.isActive ? (
                      <ToggleRight className="w-4 h-4 text-secondary" />
                    ) : (
                      <ToggleLeft className="w-4 h-4 text-muted" />
                    )}
                  </Button>
                  <Link href={`/dashboard/attendance/shepherd-alerts/${alert._id}`}>
                    <Button variant="ghost" size="sm" title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(alert._id)}
                    disabled={deleting === alert._id}
                    title="Delete"
                  >
                    {deleting === alert._id ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 text-red-500" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted mb-1">Threshold</p>
                  <p className="text-lg font-semibold text-foreground">{alert.absenceThreshold || 3}x</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Period</p>
                  <p className="text-lg font-semibold text-foreground">{alert.lookbackPeriodDays || 30}d</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Triggered</p>
                  <p className="text-lg font-semibold text-foreground">{alert.totalAlertsTriggered || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">SMS Sent</p>
                  <p className="text-lg font-semibold text-foreground">{alert.smsSentCount || 0}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
