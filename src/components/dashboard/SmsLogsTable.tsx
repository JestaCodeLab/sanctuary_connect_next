'use client';

import { useState, useEffect } from 'react';
import { smsApi } from '@/lib/api';
import { SmsLog } from '@/types';
import Button from '@/components/ui/Button';
import { Loader2, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SmsLogsTable() {
  const [logs, setLogs] = useState<SmsLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingStatus, setRefreshingStatus] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadLogs();
  }, [page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await smsApi.getSmsLogs({ page, limit: 10 });
      setLogs(data.logs);
      setTotalPages(data.pagination.pages);
    } catch (error: any) {
      console.error('Failed to load SMS logs:', error);
      toast.error('Failed to load SMS logs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = async (logId: string) => {
    setRefreshingStatus(logId);
    try {
      const result = await smsApi.updateDeliveryStatus(logId);
      toast.success(`Updated ${result.updatedCount} delivery statuses`);
      await loadLogs(); // Reload to show updated data
    } catch (error: any) {
      console.error('Failed to refresh status:', error);
      toast.error('Failed to refresh delivery status');
    } finally {
      setRefreshingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      delivered: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      submitted: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      pending: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300',
      failed: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
      partial: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300'}`}>
        {status}
      </span>
    );
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && logs.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold text-foreground">SMS Message History</h3>
        <p className="text-sm text-muted mt-1">All sent messages with delivery status</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Recipients
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Delivered/Failed
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Credits
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-muted">
                  No SMS logs found. Send your first message to see it here.
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const deliveredCount = log.recipients?.filter((r: any) => r.status === 'delivered').length || 0;
                const failedCount = log.recipients?.filter((r: any) => ['failed', 'undelivered'].includes(r.status)).length || 0;
                
                return (
                  <tr key={log._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 rounded">
                        {log.messageType}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded">
                        {log.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {log.totalRecipients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(log.overallStatus)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className="text-green-600 dark:text-green-400">{deliveredCount}</span>
                      {' / '}
                      <span className="text-red-600 dark:text-red-400">{failedCount}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {log.creditsUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRefreshStatus(log._id)}
                          disabled={refreshingStatus === log._id}
                          className="text-primary hover:text-primary-hover disabled:opacity-50 transition-colors"
                          title="Refresh delivery status from Hubtel"
                        >
                          <RefreshCw className={`h-4 w-4 ${refreshingStatus === log._id ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-border flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
