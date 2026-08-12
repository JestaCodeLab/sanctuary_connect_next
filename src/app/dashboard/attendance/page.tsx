'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  ClipboardCheck,
  TrendingUp,
  Calendar,
  QrCode,
  UserCheck,
  Search,
  Users,
  UserPlus,
} from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Card, Button, Input, Select } from '@/components/ui';
import { attendanceApi } from '@/lib/api';
import type { AttendanceEventSummary } from '@/lib/api';

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const statusBadgeVariant: Record<AttendanceEventSummary['eventStatus'], 'info' | 'success' | 'muted' | 'error'> = {
  scheduled: 'info',
  ongoing: 'success',
  completed: 'muted',
  cancelled: 'error',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AttendancePage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: attendanceApi.getStats,
  });

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['attendance', 'events', statusFilter, startDateFilter, endDateFilter],
    queryFn: () =>
      attendanceApi.getAll({
        status: statusFilter || undefined,
        startDate: startDateFilter || undefined,
        endDate: endDateFilter || undefined,
      }),
  });

  // Independent of the table's own filters, so live events always show here
  // regardless of what the user has the table filtered to.
  const { data: liveEvents = [] } = useQuery({
    queryKey: ['attendance', 'events', 'live'],
    queryFn: () => attendanceApi.getAll({ status: 'ongoing' }),
    refetchInterval: 60 * 1000,
  });

  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = term
      ? events.filter((e) => e.eventTitle.toLowerCase().includes(term))
      : events;
    return [...list].sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime());
  }, [events, search]);

  const hasActiveFilters = !!(search || statusFilter || startDateFilter || endDateFilter);
  const clearFilters = () => {
    setSearch('');
    setStatusFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const stats = [
    { label: 'Total Check-Ins', value: attendanceStats?.totalCheckIns ?? 0, icon: ClipboardCheck },
    { label: 'QR Check-Ins', value: attendanceStats?.qrCheckIns ?? 0, icon: QrCode },
    { label: 'Events Tracked', value: attendanceStats?.eventsWithCheckIns ?? 0, icon: Calendar },
    { label: 'Last 7 Days', value: attendanceStats?.recentCheckIns ?? 0, icon: TrendingUp },
  ];

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track service and event attendance"
        actionLabel="Manual Check-In"
        actionIcon={UserCheck}
        onAction={() => router.push('/dashboard/attendance/manual-check-in')}
      />

      <StatsGrid stats={stats} />

      {/* Live Now */}
      {liveEvents.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide">
              Live Now
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {liveEvents.map((event) => (
              <Card
                key={event.eventId}
                className="border-green-500/30 bg-green-50/50 dark:bg-green-950/20"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{event.eventTitle}</p>
                      <p className="text-xs text-muted mt-0.5">Started {formatDate(event.eventDate)}</p>
                    </div>
                  </div>
                  <Badge variant="success" className="flex-shrink-0">Live</Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted mb-3">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {event.totalCheckIns} total
                  </span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> {event.guests} guests
                  </span>
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> {event.qrCheckIns} QR
                  </span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={() => router.push(`/dashboard/events/${event.eventId}/attendance`)}
                >
                  View Attendance
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <Card padding="md" className="mb-6">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1">
            <Input
              label="Search"
              placeholder="Search events..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-44">
            <Select
              label="Status"
              options={statusOptions.filter((o) => o.value !== '')}
              placeholder="All Statuses"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-40">
            <Input
              label="From"
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
            />
          </div>
          <div className="w-full lg:w-40">
            <Input
              label="To"
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" onClick={clearFilters}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {/* Events + Attendance */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={ClipboardCheck}
            title={hasActiveFilters ? 'No events match your filters' : 'No attendance records yet'}
            description={
              hasActiveFilters
                ? 'Try adjusting your search or filter criteria.'
                : 'Start tracking attendance by using QR Check-In or Manual Check-In.'
            }
            actionLabel={hasActiveFilters ? undefined : 'QR Check-In'}
            onAction={hasActiveFilters ? undefined : () => router.push('/dashboard/attendance/check-in')}
          />
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          {/* Mobile: card list */}
          <div className="md:hidden divide-y divide-border">
            {filteredEvents.map((event) => (
              <button
                key={event.eventId}
                onClick={() => router.push(`/dashboard/events/${event.eventId}/attendance`)}
                className="w-full text-left p-4 hover:bg-muted/20 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {event.eventStatus === 'ongoing' && (
                      <span className="relative flex h-2 w-2 flex-shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                      </span>
                    )}
                    <h3 className="text-sm font-medium text-foreground truncate">{event.eventTitle}</h3>
                  </div>
                  <Badge variant={statusBadgeVariant[event.eventStatus]} className="flex-shrink-0">
                    {event.eventStatus.charAt(0).toUpperCase() + event.eventStatus.slice(1)}
                  </Badge>
                </div>
                <p className="text-xs text-muted mt-0.5">{formatDate(event.eventDate)}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Users className="w-3 h-3" /> {event.totalCheckIns} total
                  </span>
                  <span className="flex items-center gap-1">
                    <UserPlus className="w-3 h-3" /> {event.guests} guests
                  </span>
                  <span className="flex items-center gap-1">
                    <QrCode className="w-3 h-3" /> {event.qrCheckIns} QR
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Event</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Date</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Status</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">Total</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">Members</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">Guests</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">QR</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredEvents.map((event) => (
                  <tr
                    key={event.eventId}
                    className={`hover:bg-muted/20 transition-colors cursor-pointer ${
                      event.eventStatus === 'ongoing' ? 'bg-green-50/50 dark:bg-green-950/10' : ''
                    }`}
                    onClick={() => router.push(`/dashboard/events/${event.eventId}/attendance`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {event.eventStatus === 'ongoing' && (
                          <span className="relative flex h-2 w-2 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                          </span>
                        )}
                        <span className="text-sm font-medium text-foreground">{event.eventTitle}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted whitespace-nowrap">{formatDate(event.eventDate)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusBadgeVariant[event.eventStatus]}>
                        {event.eventStatus.charAt(0).toUpperCase() + event.eventStatus.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-foreground text-right">{event.totalCheckIns}</td>
                    <td className="px-4 py-3 text-sm text-muted text-right">{event.members}</td>
                    <td className="px-4 py-3 text-sm text-muted text-right">{event.guests}</td>
                    <td className="px-4 py-3 text-right">
                      <Badge variant={event.qrCheckIns > 0 ? 'info' : 'muted'}>{event.qrCheckIns}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/events/${event.eventId}/attendance`);
                        }}
                      >
                        View
                      </Button>
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
