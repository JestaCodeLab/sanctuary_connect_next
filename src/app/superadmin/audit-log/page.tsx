'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '@/lib/api';

interface AuditEntry {
  _id: string;
  actorId?: { firstName: string; lastName: string; email: string };
  action: string;
  targetOrgId?: { _id: string; churchName: string };
  details: Record<string, unknown>;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  suspend_org: 'bg-error/10 text-error',
  reactivate_org: 'bg-success/10 text-success',
  update_subscription: 'bg-blue-500/10 text-blue-600',
  adjust_sms_credits: 'bg-amber-500/10 text-amber-600',
  create_superadmin: 'bg-purple-500/10 text-purple-600',
};

const ACTION_LABELS: Record<string, string> = {
  suspend_org: 'Suspend Org',
  reactivate_org: 'Reactivate Org',
  update_subscription: 'Update Subscription',
  adjust_sms_credits: 'Adjust SMS Credits',
  create_superadmin: 'Create Superadmin',
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 50;

  const fetchLog = useCallback(() => {
    setLoading(true);
    api
      .get(`/api/superadmin/audit-log?page=${page}&limit=${limit}`)
      .then((r) => { setEntries(r.data.entries); setTotal(r.data.total); })
      .catch(() => setError('Failed to load audit log'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => { fetchLog(); }, [fetchLog]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} superadmin actions recorded</p>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Timestamp</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Actor</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Action</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Target</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : entries.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No audit entries yet</td></tr>
              ) : entries.map((entry) => (
                <>
                  <tr
                    key={entry._id}
                    className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer"
                    onClick={() => setExpanded(expanded === entry._id ? null : entry._id)}
                  >
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      {entry.actorId ? (
                        <>
                          <p className="text-foreground">{entry.actorId.firstName} {entry.actorId.lastName}</p>
                          <p className="text-xs text-muted-foreground">{entry.actorId.email}</p>
                        </>
                      ) : <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-muted text-muted-foreground'}`}>
                        {ACTION_LABELS[entry.action] ?? entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground">
                      {entry.targetOrgId?.churchName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-primary">
                      {expanded === entry._id ? 'Hide' : 'Details'}
                    </td>
                  </tr>
                  {expanded === entry._id && (
                    <tr key={`${entry._id}-detail`} className="border-b border-border bg-background/30">
                      <td colSpan={5} className="px-6 py-3">
                        <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                          {JSON.stringify(entry.details, null, 2)}
                        </pre>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages} · {total} entries</p>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-1.5 rounded-lg border border-border hover:bg-background disabled:opacity-40">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
