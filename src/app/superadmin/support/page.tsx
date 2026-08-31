'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LifeBuoy, Lightbulb, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';
import type { SupportTicket } from '@/types';

const STATUS_FILTERS = [
  { value: '', label: 'All statuses' },
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

const TYPE_FILTERS = [
  { value: '', label: 'All types' },
  { value: 'support', label: 'Support Ticket' },
  { value: 'feature_request', label: 'Feature Request' },
];

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-600',
  in_progress: 'bg-amber-500/10 text-amber-600',
  resolved: 'bg-success/10 text-success',
  closed: 'bg-muted/50 text-muted-foreground',
};

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

export default function SuperadminSupportPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');

  const fetchTickets = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (status) params.set('status', status);
    if (type) params.set('type', type);
    api
      .get(`/api/superadmin/support?${params.toString()}`)
      .then((r) => setTickets(r.data.tickets))
      .catch(() => setError('Failed to load support tickets'))
      .finally(() => setLoading(false));
  }, [status, type]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Support</h1>
        <p className="text-muted-foreground text-sm mt-1">{tickets.length} ticket{tickets.length === 1 ? '' : 's'} across all organizations</p>
      </div>

      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        >
          {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm"
        >
          {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
        </select>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-error p-4 bg-error/10 rounded-lg text-sm">{error}</div>
      )}

      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Organization</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Subject</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Type</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Status</th>
                <th className="text-left px-4 py-3 text-muted-foreground font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">Loading...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-muted-foreground">No tickets found</td></tr>
              ) : tickets.map((ticket) => {
                const org = typeof ticket.organizationId === 'object' ? ticket.organizationId : null;
                return (
                  <tr
                    key={ticket._id}
                    onClick={() => router.push(`/superadmin/support/${ticket._id}`)}
                    className="border-b border-border last:border-0 hover:bg-background/50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-foreground whitespace-nowrap">{org?.churchName ?? '—'}</td>
                    <td className="px-4 py-3 text-foreground">
                      <div className="flex items-center gap-2">
                        {ticket.type === 'feature_request' ? (
                          <Lightbulb className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        ) : (
                          <LifeBuoy className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                        )}
                        <span className="truncate max-w-xs">{ticket.subject}</span>
                        {ticket.replies.length > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <MessageCircle className="w-3 h-3" /> {ticket.replies.length}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {ticket.type === 'feature_request' ? 'Feature Request' : 'Support Ticket'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[ticket.status]}`}>
                        {STATUS_LABELS[ticket.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {new Date(ticket.updatedAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
