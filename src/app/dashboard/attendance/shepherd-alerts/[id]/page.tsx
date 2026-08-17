'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  AlertCircle,
  Loader,
  Edit,
  Trash2,
  ToggleLeft,
  ToggleRight,
  PlayCircle,
  Bell,
  Users,
  CheckCircle,
  XCircle,
  MessageSquare,
} from 'lucide-react';
import { Button, Card } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface Shepherd {
  memberId: { _id: string; firstName: string; lastName: string; phone: string } | string;
  phoneNumber: string;
}

interface ShepherdAlertDetail {
  _id: string;
  name: string;
  isActive: boolean;
  branchId?: string | { _id: string; name: string } | null;
  absenceThreshold: number;
  lookbackPeriodDays: number;
  shepherds: Shepherd[];
  totalAlertsTriggered: number;
  smsSentCount: number;
  lastCheckAt?: string | null;
  createdAt: string;
}

interface AlertLog {
  _id: string;
  memberName: string;
  absenceCount: number;
  absenceThreshold: number;
  lookbackPeriodDays: number;
  triggerred: boolean;
  smsAttempted: boolean;
  smsSent: boolean;
  recipientsNotified: Array<{ memberId: string; phoneNumber: string; status: 'pending' | 'sent' | 'failed' }>;
  error?: string;
  createdAt: string;
}

function DetailField({ label, value }: { label: string; value?: string | number | null }) {
  const display = value !== undefined && value !== null && value !== '' ? String(value) : '—';
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{display}</dd>
    </div>
  );
}

// Pinned to UTC (the fixed event/alert timezone) so this reads identically
// for every viewer regardless of their own browser's local timezone.
function formatDateTime(date?: string | null): string {
  if (!date) return 'Never';
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ShepherdAlertDetailPage() {
  const router = useRouter();
  const params = useParams();
  const alertId = params?.id as string;

  const [alert, setAlert] = useState<ShepherdAlertDetail | null>(null);
  const [logs, setLogs] = useState<AlertLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [running, setRunning] = useState(false);

  const fetchAlert = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/shepherd-alerts/${alertId}`);
      setAlert(res.data.alert || res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to load alert');
    } finally {
      setLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await api.get('/api/shepherd-alerts/logs/list', {
        params: { shepherdAlertId: alertId },
      });
      setLogs(res.data.logs || []);
    } catch (err) {
      console.error('Error fetching alert logs:', err);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (!alertId) return;
    fetchAlert();
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alertId]);

  const handleToggle = async () => {
    if (!alert) return;
    try {
      setToggling(true);
      const res = await api.patch(`/api/shepherd-alerts/${alertId}/toggle`);
      setAlert(res.data.alert);
      toast.success(res.data.alert.isActive ? 'Alert activated' : 'Alert deactivated');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to toggle alert');
    } finally {
      setToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this alert?')) return;
    try {
      setDeleting(true);
      await api.delete(`/api/shepherd-alerts/${alertId}`);
      toast.success('Alert deleted');
      router.push('/dashboard/attendance/shepherd-alerts');
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to delete alert');
      setDeleting(false);
    }
  };

  const handleRunCheck = async () => {
    try {
      setRunning(true);
      const res = await api.post(`/api/shepherd-alerts/${alertId}/run`);
      const { summary } = res.data;
      let message = `Check complete: ${summary.triggered} alert${summary.triggered !== 1 ? 's' : ''} triggered, ${summary.smsSent} SMS sent`;
      if (summary.smsFailed > 0) message += `, ${summary.smsFailed} failed to send`;
      if (summary.suppressed > 0) message += `, ${summary.suppressed} already alerted this period`;
      if (summary.smsFailed > 0) {
        toast.error(message);
      } else {
        toast.success(message);
      }
      await Promise.all([fetchAlert(), fetchLogs()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to run alert check');
    } finally {
      setRunning(false);
    }
  };

  if (loading || !alertId) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/attendance/shepherd-alerts">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <h1 className="text-3xl font-bold">Shepherd Alert</h1>
        </div>

        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-2">{error || 'Alert not found'}</p>
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

  const branchName = alert.branchId && typeof alert.branchId === 'object' ? alert.branchId.name : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/dashboard/attendance/shepherd-alerts">
            <button className="p-2 hover:bg-accent rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl md:text-3xl font-bold truncate">{alert.name}</h1>
              <Badge variant={alert.isActive ? 'success' : 'muted'}>
                {alert.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1">Configuration, recipients, and alert history</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCheck}
            disabled={running || !alert.isActive}
            title={alert.isActive ? 'Run check now' : 'Alert is inactive'}
            leftIcon={running ? <Loader className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />}
          >
            Run Check
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggle}
            disabled={toggling}
            leftIcon={
              toggling ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : alert.isActive ? (
                <ToggleRight className="w-4 h-4" />
              ) : (
                <ToggleLeft className="w-4 h-4" />
              )
            }
          >
            {alert.isActive ? 'Deactivate' : 'Activate'}
          </Button>
          <Link href={`/dashboard/attendance/shepherd-alerts/${alertId}/edit`}>
            <Button variant="outline" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
            className="text-red-500 hover:text-red-600"
            leftIcon={deleting ? <Loader className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          >
            Delete
          </Button>
        </div>
      </div>

      {/* Configuration */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-4">Configuration</h2>
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <DetailField label="Absence Threshold" value={`${alert.absenceThreshold} absences`} />
          <DetailField label="Lookback Period" value={`${alert.lookbackPeriodDays} days`} />
          <DetailField label="Branch" value={branchName || 'All branches'} />
          <DetailField label="Last Check" value={formatDateTime(alert.lastCheckAt)} />
          <DetailField label="Total Alerts Triggered" value={alert.totalAlertsTriggered} />
          <DetailField label="SMS Sent" value={alert.smsSentCount} />
          <DetailField label="Created" value={formatDateTime(alert.createdAt)} />
        </dl>
      </Card>

      {/* Shepherds */}
      <Card padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Shepherds Notified ({alert.shepherds.length})</h2>
        </div>
        {alert.shepherds.length === 0 ? (
          <p className="text-sm text-muted">No shepherds configured.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {alert.shepherds.map((s, i) => {
              const member = typeof s.memberId === 'object' ? s.memberId : null;
              return (
                <div key={i} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border">
                  <div className="text-sm">
                    <div className="font-medium text-foreground">
                      {member ? `${member.firstName} ${member.lastName}` : 'Unknown member'}
                    </div>
                    <div className="text-xs text-muted">{s.phoneNumber}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Alert History */}
      <Card padding="none">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Alert History</h2>
          </div>
          <p className="text-sm text-muted mt-1">
            Every member checked, whether the threshold was met, and SMS delivery status
          </p>
        </div>

        {logsLoading ? (
          <div className="p-8 text-center text-sm text-muted">Loading history...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted">No checks have run for this alert yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <div key={log._id} className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{log.memberName}</span>
                      {log.triggerred ? (
                        <Badge variant="warning">Triggered</Badge>
                      ) : (
                        <Badge variant="muted">Below threshold</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted mt-0.5">
                      {log.absenceCount} absence{log.absenceCount !== 1 ? 's' : ''} of {log.absenceThreshold} threshold, over last{' '}
                      {log.lookbackPeriodDays} days
                    </p>
                  </div>
                  <span className="text-xs text-muted whitespace-nowrap">{formatDateTime(log.createdAt)}</span>
                </div>

                {log.triggerred && (
                  <div className="mt-2 flex items-center gap-2 text-xs">
                    {log.smsSent ? (
                      <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" /> SMS sent
                      </span>
                    ) : log.smsAttempted ? (
                      <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                        <XCircle className="w-3.5 h-3.5" /> SMS failed
                      </span>
                    ) : (
                      <span className="text-muted">Not sent{log.error ? ` — ${log.error}` : ''}</span>
                    )}
                  </div>
                )}

                {log.recipientsNotified.length > 0 && (
                  <div className="mt-2 pl-4 border-l-2 border-border space-y-1">
                    <p className="text-xs text-muted flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" /> Sent to:
                    </p>
                    {log.recipientsNotified.map((r, i) => (
                      <p key={i} className="text-xs text-muted">
                        {r.phoneNumber} —{' '}
                        <span
                          className={
                            r.status === 'sent'
                              ? 'text-green-600 dark:text-green-400'
                              : r.status === 'failed'
                              ? 'text-red-600 dark:text-red-400'
                              : ''
                          }
                        >
                          {r.status}
                        </span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
