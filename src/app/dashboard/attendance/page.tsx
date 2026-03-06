'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ClipboardCheck, Users, TrendingUp, Calendar, BarChart3, QrCode, UserCheck, Search } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Card, Button, Input, Select } from '@/components/ui';
import { attendanceApi, eventsApi } from '@/lib/api';
import type { AttendanceRecord, ChurchEvent } from '@/types';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AttendancePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceApi.getAll,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: attendanceApi.getStats,
  });

  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['events', startDateFilter, endDateFilter],
    queryFn: () => eventsApi.getAll({
      startDate: startDateFilter || undefined,
      endDate: endDateFilter || undefined,
      status: 'ongoing,scheduled',
    }),
  });

  const stats = [
    {
      label: 'Total Check-Ins',
      value: attendanceStats?.totalCheckIns ?? 0,
      icon: ClipboardCheck,
    },
    {
      label: 'QR Check-Ins',
      value: attendanceStats?.qrCheckIns ?? 0,
      icon: QrCode,
    },
    {
      label: 'Events Tracked',
      value: attendanceStats?.eventsWithCheckIns ?? 0,
      icon: Calendar,
    },
    {
      label: 'Last 7 Days',
      value: attendanceStats?.recentCheckIns ?? 0,
      icon: TrendingUp,
    },
  ];



  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track service and event attendance"
      />

      <div className="mb-6 flex gap-3">
        <Button
          variant="outline"
          leftIcon={<QrCode className="w-4 h-4" />}
          onClick={() => router.push('/dashboard/attendance/check-in')}
        >
          QR Check-In
        </Button>
        <Button
          variant="outline"
          leftIcon={<UserCheck className="w-4 h-4" />}
          onClick={() => router.push('/dashboard/attendance/manual-check-in')}
        >
          Manual Check-In
        </Button>
      </div>

      <StatsGrid stats={stats} />

      {/* Live/Ongoing Events Section */}
      {events.filter((e: ChurchEvent) => e.status === 'ongoing').length > 0 && (
        <Card padding="md" className="mb-6 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
            </div>
            <h2 className="text-lg font-semibold text-foreground">Live Now</h2>
          </div>
          <div className="space-y-2">
            {events
              .filter((e: ChurchEvent) => e.status === 'ongoing')
              .sort((a: ChurchEvent, b: ChurchEvent) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map((event: ChurchEvent) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between p-4 rounded-lg bg-background border border-primary/30 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-foreground truncate">{event.title}</h3>
                      <p className="text-xs text-muted">Started {formatDate(event.startDate)}</p>
                    </div>
                    <div className="animate-pulse">
                      <Badge variant="success">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          LIVE
                        </span>
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => router.push(`/dashboard/events/${event._id}/attendance`)}
                  >
                    View Attendance
                  </Button>
                </div>
              ))}
          </div>
        </Card>
      )}

      {/* Ongoing/Scheduled Events */}
      <Card padding="md" className="mb-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Events - View Attendance</h2>
        <p className="text-sm text-muted mb-4">Click on an event to view individual check-in records</p>
        
        {/* Date Filter */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <Input
            label="Start Date"
            type="date"
            value={startDateFilter}
            onChange={(e) => setStartDateFilter(e.target.value)}
            placeholder="Filter from..."
          />
          <Input
            label="End Date"
            type="date"
            value={endDateFilter}
            onChange={(e) => setEndDateFilter(e.target.value)}
            placeholder="Filter to..."
          />
          <div className="flex items-end">
            <Button
              leftIcon={<Search className="w-4 h-4" />}
              onClick={() => refetchEvents()}
              className="w-full"
              isLoading={eventsLoading}
            >
              Search
            </Button>
          </div>
          <div className="flex items-end">
            <Button
              variant="outline"
              onClick={() => {
                setStartDateFilter('');
                setEndDateFilter('');
              }}
              className="w-full"
            >
              Clear
            </Button>
          </div>
        </div>

        {eventsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="w-10 h-10 text-muted mx-auto mb-3" />
            <p className="text-sm text-muted">No events found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {events
              .sort((a: ChurchEvent, b: ChurchEvent) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())
              .map((event: ChurchEvent) => (
                <div
                  key={event._id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground truncate">{event.title}</h3>
                      <p className="text-xs text-muted">{formatDate(event.startDate)}</p>
                    </div>
                    <Badge variant={event.status === 'ongoing' ? 'success' : 'info'}>
                      {event.status}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/events/${event._id}/attendance`)}
                  >
                    View Attendance
                  </Button>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Attendance Records Table */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : records.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={ClipboardCheck}
            title="No attendance records"
            description="Start tracking attendance by using QR Check-In or Manual Check-In."
            actionLabel="QR Check-In"
            onAction={() => router.push('/dashboard/attendance/check-in')}
          />
        </Card>
      ) : (
        <Card padding="md" className="mb-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Recent Check-Ins by Event</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-sm font-medium text-muted pb-3 pr-4">Event</th>
                  <th className="text-left text-sm font-medium text-muted pb-3 pr-4">Date</th>
                  <th className="text-right text-sm font-medium text-muted pb-3 pr-4">Total</th>
                  <th className="text-right text-sm font-medium text-muted pb-3 pr-4">Members</th>
                  <th className="text-right text-sm font-medium text-muted pb-3 pr-4">Guests</th>
                  <th className="text-right text-sm font-medium text-muted pb-3">QR</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record: any) => (
                  <tr 
                    key={record.eventId}
                    className="border-b border-border last:border-b-0 hover:bg-muted/20 cursor-pointer"
                    onClick={() => router.push(`/dashboard/events/${record.eventId}/attendance`)}
                  >
                    <td className="py-3 pr-4 text-sm text-foreground">
                      {record.eventTitle || '—'}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted whitespace-nowrap">
                      {formatDate(record.eventDate)}
                    </td>
                    <td className="py-3 pr-4 text-sm font-medium text-foreground text-right">
                      {record.totalCheckIns}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted text-right">
                      {record.members}
                    </td>
                    <td className="py-3 pr-4 text-sm text-muted text-right">
                      {record.guests}
                    </td>
                    <td className="py-3 text-right">
                      <Badge variant={record.qrCheckIns > 0 ? 'info' : 'muted'}>
                        {record.qrCheckIns}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
