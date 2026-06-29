'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MessageSquare, CheckCircle2, AlertCircle, Eye, Copy, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/dashboard';
import { Button, Card } from '@/components/ui';
import { smsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface SmsMessage {
  _id: string;
  createdAt: string;
  messageType: string;
  category: string;
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  overallStatus: string;
  creditsUsed: number;
  message: string;
  senderID: string;
  recipients?: Array<{ phoneNumber: string; status: string }>;
}

type Tab = 'all' | 'delivered' | 'failed';

export default function HistoryPage() {
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Map tab to status filter
  const getStatusFilterForTab = (tab: Tab): string => {
    switch (tab) {
      case 'delivered':
        // Include both 'delivered' and 'submitted' in the delivered tab
        return 'delivered,submitted';
      case 'failed':
        return 'failed';
      default:
        return '';
    }
  };

  const statusFilter = getStatusFilterForTab(activeTab);

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['sms-logs', { page, limit: 50, status: statusFilter }],
    queryFn: () => smsApi.getSmsLogs({
      page,
      limit: 50,
      ...(statusFilter && { status: statusFilter }),
    }),
  });

  const logs = logsData?.logs || [];
  const pagination = logsData?.pagination;

  const handleViewMessage = async (log: any) => {
    try {
      const details = await smsApi.getSmsLogDetails(log._id);
      setSelectedMessage(details);
      setShowDetailModal(true);
    } catch (error: any) {
      toast.error('Failed to load message details');
    }
  };

  const handleCopyMessage = () => {
    if (selectedMessage?.message) {
      navigator.clipboard.writeText(selectedMessage.message);
      toast.success('Message copied to clipboard');
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    const colors: Record<string, string> = {
      general: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
      birthday: 'bg-pink-100 dark:bg-pink-900/30 text-pink-800 dark:text-pink-300',
      announcement: 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300',
      event_reminder: 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300',
      invitation: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
      thank_you: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300',
      reminder: 'bg-cyan-100 dark:bg-cyan-900/30 text-cyan-800 dark:text-cyan-300',
      emergency: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300',
    };
    return colors[category] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border border-green-300 dark:border-green-700';
      case 'submitted':
        return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-300 dark:border-yellow-700';
      case 'failed':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border border-red-300 dark:border-red-700';
      case 'partial':
        return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 border border-orange-300 dark:border-orange-700';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
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

  const formatMessagePreview = (message: string, length: number = 50) => {
    return message.length > length ? message.substring(0, length) + '...' : message;
  };

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'all', label: 'All Messages', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'delivered', label: 'Delivered', icon: <CheckCircle2 className="w-4 h-4 text-green-600" /> },
    { id: 'failed', label: 'Failed', icon: <AlertCircle className="w-4 h-4 text-red-600" /> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS Message History"
        description="View all sent SMS messages with detailed delivery status"
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Messages Table */}
      <Card>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-muted">Loading messages...</p>
            </div>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center">
            <MessageSquare className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-foreground font-medium mb-1">No SMS messages found</p>
            <p className="text-muted text-sm">
              {activeTab === 'delivered' && 'No delivered messages yet'}
              {activeTab === 'failed' && 'No failed messages'}
              {activeTab === 'all' && 'Send your first message to see it here'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                    Message
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-muted uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">
                    Recipients
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">
                    Credits
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log: SmsMessage) => (
                  <tr key={log._id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-6 py-4 max-w-xs text-sm text-foreground">
                      <div className="truncate" title={log.message}>
                        {formatMessagePreview(log.message, 50)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-md ${getCategoryBadgeColor(log.category)}`}>
                        {log.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium text-foreground">
                      {log.totalRecipients}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusBadgeColor(log.overallStatus)}`}>
                        {log.overallStatus.charAt(0).toUpperCase() + log.overallStatus.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-primary">
                      {log.creditsUsed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewMessage(log)}
                        leftIcon={<Eye className="w-4 h-4" />}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.pages > 1 && (
          <div className="flex items-center justify-between py-4 px-6 border-t border-border bg-muted/20">
            <p className="text-sm text-muted">
              Page {pagination.page} of {pagination.pages} • Total: {pagination.total} messages
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.max(1, prev - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(prev => Math.min(pagination.pages, prev + 1))}
                disabled={page === pagination.pages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Message Detail Modal */}
      {showDetailModal && selectedMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
              <h2 className="text-xl font-bold text-foreground">Message Details</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-muted hover:text-foreground transition-colors text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Status and Metadata */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted mb-1">Status</p>
                  <div className={`inline-block px-3 py-1.5 rounded-full text-sm font-semibold ${getStatusBadgeColor(selectedMessage.overallStatus)}`}>
                    {selectedMessage.overallStatus.charAt(0).toUpperCase() + selectedMessage.overallStatus.slice(1)}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted mb-1">Category</p>
                  <div className={`inline-block px-3 py-1 rounded-md text-sm font-medium ${getCategoryBadgeColor(selectedMessage.category)}`}>
                    {selectedMessage.category.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted mb-1">Date & Time</p>
                  <p className="text-sm font-medium text-foreground">{formatDate(selectedMessage.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted mb-1">Sender ID</p>
                  <p className="text-sm font-medium text-foreground">{selectedMessage.senderID}</p>
                </div>
              </div>

              {/* Statistics */}
              <div className="bg-muted/30 rounded-lg p-4 grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-foreground">{selectedMessage.totalRecipients}</p>
                  <p className="text-xs text-muted">Total Recipients</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedMessage.successfulDeliveries}</p>
                  <p className="text-xs text-muted">Delivered</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">{selectedMessage.failedDeliveries}</p>
                  <p className="text-xs text-muted">Failed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-primary">{selectedMessage.creditsUsed}</p>
                  <p className="text-xs text-muted">Credits Used</p>
                </div>
              </div>
            </div>

            {/* Message Content */}
            <div className="mb-6">
              <p className="text-sm text-muted mb-2">Message Content</p>
              <div className="bg-muted/20 rounded-lg p-4 border border-border">
                <p className="text-foreground whitespace-pre-wrap text-sm leading-relaxed">
                  {selectedMessage.message}
                </p>
              </div>
            </div>

            {/* Recipients Preview */}
            {selectedMessage.recipients && selectedMessage.recipients.length > 0 && (
              <div className="mb-6">
                <p className="text-sm text-muted mb-2">First 5 Recipients</p>
                <div className="space-y-2">
                  {selectedMessage.recipients.slice(0, 5).map((recipient: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/10 rounded border border-border text-sm">
                      <span className="text-foreground font-mono">{recipient.phoneNumber}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        recipient.status === 'delivered'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                          : recipient.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {recipient.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t border-border">
              <Button
                variant="outline"
                onClick={handleCopyMessage}
                leftIcon={<Copy className="w-4 h-4" />}
                className="flex-1"
              >
                Copy Message
              </Button>
              <Button
                onClick={() => setShowDetailModal(false)}
                className="flex-1"
              >
                Close
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
