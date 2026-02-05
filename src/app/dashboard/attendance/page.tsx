'use client';

import { useState } from 'react';
import { ClipboardCheck, Users, TrendingUp, Calendar, BarChart3, Info } from 'lucide-react';

import { PageHeader, StatsGrid, Badge } from '@/components/dashboard';
import { Card } from '@/components/ui';
import type { AttendanceRecord } from '@/types';

const mockAttendance: AttendanceRecord[] = [
  { _id: '1', eventTitle: 'Sunday Service', date: '2026-02-02', totalPresent: 245, totalAbsent: 30 },
  { _id: '2', eventTitle: 'Wednesday Bible Study', date: '2026-01-29', totalPresent: 85, totalAbsent: 15 },
  { _id: '3', eventTitle: 'Sunday Service', date: '2026-01-26', totalPresent: 230, totalAbsent: 35 },
  { _id: '4', eventTitle: 'Youth Night', date: '2026-01-24', totalPresent: 60, totalAbsent: 10 },
  { _id: '5', eventTitle: 'Sunday Service', date: '2026-01-19', totalPresent: 255, totalAbsent: 25 },
  { _id: '6', eventTitle: 'Prayer Meeting', date: '2026-01-17', totalPresent: 45, totalAbsent: 5 },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAttendanceRate(present: number, absent: number): number {
  const total = present + absent;
  if (total === 0) return 0;
  return Math.round((present / total) * 100);
}

function getRateBadgeVariant(rate: number): 'success' | 'warning' | 'error' {
  if (rate >= 80) return 'success';
  if (rate >= 60) return 'warning';
  return 'error';
}

export default function AttendancePage() {
  const [records] = useState<AttendanceRecord[]>(mockAttendance);

  const stats = [
    {
      label: 'Average Attendance',
      value: '78%',
      icon: ClipboardCheck,
    },
    {
      label: 'Last Sunday',
      value: 245,
      icon: Users,
    },
    {
      label: 'Total Services',
      value: 52,
      icon: Calendar,
    },
    {
      label: 'Attendance Growth',
      value: '+5%',
      icon: TrendingUp,
      change: '+5% from last quarter',
      changeType: 'positive' as const,
    },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track service and event attendance"
      />

      {/* Info Banner */}
      <Card className="bg-primary-light border-primary mb-6" padding="md">
        <div className="flex items-center gap-3">
          <Info className="w-5 h-5 text-primary flex-shrink-0" />
          <p className="text-sm text-primary">
            Attendance tracking backend is coming soon. The data shown below is for preview purposes.
          </p>
        </div>
      </Card>

      <StatsGrid stats={stats} />

      {/* Attendance Records Table */}
      <Card padding="md" className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Records</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-sm font-medium text-muted pb-3 pr-4">Date</th>
                <th className="text-left text-sm font-medium text-muted pb-3 pr-4">Event / Service</th>
                <th className="text-right text-sm font-medium text-muted pb-3 pr-4">Present</th>
                <th className="text-right text-sm font-medium text-muted pb-3 pr-4">Absent</th>
                <th className="text-right text-sm font-medium text-muted pb-3">Rate</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const rate = getAttendanceRate(record.totalPresent, record.totalAbsent);
                return (
                  <tr key={record._id} className="border-b border-border last:border-b-0">
                    <td className="py-3 pr-4 text-sm text-foreground whitespace-nowrap">
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3 pr-4 text-sm text-foreground">
                      {record.eventTitle}
                    </td>
                    <td className="py-3 pr-4 text-sm text-foreground text-right">
                      {record.totalPresent}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted text-right">
                      {record.totalAbsent}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant={getRateBadgeVariant(rate)}>
                        {rate}%
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Attendance Trends Placeholder */}
      <Card padding="md">
        <h2 className="text-lg font-semibold text-foreground mb-4">Attendance Trends</h2>
        <div className="h-48 bg-background rounded-lg flex items-center justify-center">
          <div className="text-center">
            <BarChart3 className="w-12 h-12 text-muted mx-auto" />
            <p className="text-sm text-muted mt-2">Chart integration coming soon</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
