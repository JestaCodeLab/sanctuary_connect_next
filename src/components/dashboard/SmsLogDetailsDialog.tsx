'use client';

import { SmsLog } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui';


interface SmsLogDetailsDialogProps {
  log: SmsLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SmsLogDetailsDialog({ log, open, onOpenChange }: SmsLogDetailsDialogProps) {
  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      delivered: 'bg-green-500',
      submitted: 'bg-blue-500',
      pending: 'bg-yellow-500',
      failed: 'bg-red-500',
      partial: 'bg-orange-500',
    };

    return (
      <span className={`${colors[status] || 'bg-gray-500'} text-white px-2 py-1 rounded text-xs`}>
        {status}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SMS Campaign Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Status</p>
              <p className="font-medium">{getStatusBadge(log.overallStatus)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Type</p>
              <p className="font-medium capitalize">{log.messageType}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Category</p>
              <p className="font-medium capitalize">{log.category.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Credits Used</p>
              <p className="font-medium">{log.creditsUsed}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Recipients</p>
              <p className="font-medium">{log.totalRecipients}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Delivery Rate</p>
              <p className="font-medium">{log.stats?.deliveryRate || '0'}%</p>
            </div>
          </div>

          {/* Message */}
          <div>
            <p className="text-sm text-gray-500 mb-2">Message</p>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap">{log.message}</p>
            </div>
          </div>

          {/* Recipients */}
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Recipients ({log.recipients.length})
            </p>
            <div className="border rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Sent At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {log.recipients.slice(0, 50).map((recipient, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 text-sm">{recipient.phoneNumber}</td>
                      <td className="px-4 py-3 text-sm">{recipient.name || '-'}</td>
                      <td className="px-4 py-3 text-sm">{getStatusBadge(recipient.status)}</td>
                      <td className="px-4 py-3 text-sm">
                        {recipient.sentAt
                          ? new Date(recipient.sentAt).toLocaleString()
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {log.recipients.length > 50 && (
                <div className="bg-gray-50 px-4 py-3 text-sm text-gray-500">
                  Showing 50 of {log.recipients.length} recipients
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          {log.stats && (
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Delivered</p>
                <p className="text-2xl font-bold text-green-600">{log.stats.delivered}</p>
              </div>
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{log.stats.pending}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Failed</p>
                <p className="text-2xl font-bold text-red-600">{log.stats.failed}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Total</p>
                <p className="text-2xl font-bold text-blue-600">{log.stats.total}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
