'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Users, QrCode, UserCheck, UserPlus, Info } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { Badge, PageHeader, StatsGrid } from '@/components/dashboard';
import { attendanceApi, eventsApi } from '@/lib/api';

function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function EventAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: event } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getById(id),
  });

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', 'event', id],
    queryFn: () => attendanceApi.getEventAttendanceRecords(id),
  });

  const records = attendanceData?.records || [];
  const stats = attendanceData?.stats || {};

  const statsData = [
    {
      label: 'Total Check-Ins',
      value: stats.total || 0,
      icon: Users,
    },
    {
      label: 'QR Check-Ins',
      value: stats.qrCheckIns || 0,
      icon: QrCode,
    },
    {
      label: 'Members',
      value: stats.members || 0,
      icon: UserCheck,
    },
    {
      label: 'Guests',
      value: stats.guests || 0,
      icon: UserPlus,
    },
  ];

  return (
    <div>
      <Link
        href="/dashboard/attendance"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Attendance
      </Link>

      <PageHeader
        title={event?.title || 'Event Attendance'}
        description="Individual check-in records for this event"
      />

      <StatsGrid stats={statsData} />

      {/* Info Card about Automatic Attendance */}
      <Card padding="lg" className="mb-6 bg-primary/5 border-primary/20">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-foreground mb-2">How Automatic Attendance Works</h3>
            <ul className="text-sm text-muted space-y-1">
              <li>• <strong>QR Check-In:</strong> People scan the event QR code to automatically check in</li>
              <li>• <strong>Manual Check-In:</strong> Staff can manually check in members or guests from the attendance page</li>
              <li>• <strong>Real-time Tracking:</strong> All check-ins are recorded instantly with timestamps</li>
              <li>• <strong>Duplicate Prevention:</strong> Each person can only check in once per event</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-4">Check-In Records</h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-muted mx-auto mb-3" />
            <p className="text-muted">No check-ins yet for this event</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-medium text-muted py-3 px-4">Name</th>
                  <th className="text-left text-sm font-medium text-muted py-3 px-4">Type</th>
                  <th className="text-left text-sm font-medium text-muted py-3 px-4">Method</th>
                  <th className="text-left text-sm font-medium text-muted py-3 px-4">Check-In Time</th>
                  <th className="text-left text-sm font-medium text-muted py-3 px-4">Contact</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record: any) => {
                  let name = 'Unknown';
                  let type = 'Guest';
                  let contact = '';

                  if (record.memberId) {
                    name = `${record.memberId.firstName} ${record.memberId.lastName}`;
                    type = 'Member';
                    contact = record.memberId.email || record.memberId.phone || '';
                  } else if (record.userId) {
                    name = `${record.userId.firstName} ${record.userId.lastName}`;
                    type = 'User';
                    contact = record.userId.email || '';
                  } else if (record.name) {
                    name = record.name;
                    type = 'Guest';
                    contact = record.email || record.phone || '';
                  }

                  return (
                    <tr key={record._id} className="border-b border-border hover:bg-muted/20">
                      <td className="py-3 px-4">
                        <span className="text-sm font-medium text-foreground">{name}</span>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={type === 'Member' ? 'success' : type === 'User' ? 'info' : 'muted'}>
                          {type}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={record.checkInMethod === 'qr' ? 'info' : 'muted'}>
                          {record.checkInMethod === 'qr' ? (
                            <span className="flex items-center gap-1">
                              <QrCode className="w-3 h-3" />
                              QR
                            </span>
                          ) : (
                            'Manual'
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted">{formatDateTime(record.checkInTime)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted">{contact || '—'}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
