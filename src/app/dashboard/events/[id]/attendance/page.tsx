'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, QrCode, UserCheck, UserPlus, CheckCircle, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import { Badge, StatsGrid, EmptyState, Modal } from '@/components/dashboard';
import MemberSearch from '@/components/dashboard/MemberSearch';
import { attendanceApi, eventsApi, membersApi } from '@/lib/api';
import type { Member, EventOccurrence } from '@/types';

// Pinned to UTC (the fixed event timezone — see lib/eventOccurrences.ts) so
// this reads identically for every viewer regardless of their own browser's
// local timezone.
function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function Avatar({ initials }: { initials: string }) {
  return (
    <div className="w-10 h-10 md:w-8 md:h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
      <span className="text-sm md:text-xs font-medium text-white">{initials}</span>
    </div>
  );
}

export default function EventAttendancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkInType, setCheckInType] = useState<'member' | 'guest'>('member');
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'checked-in' | 'absent'>('checked-in');
  const [quickCheckInMemberId, setQuickCheckInMemberId] = useState<string | null>(null);

  const { data: event } = useQuery({
    queryKey: ['events', id],
    queryFn: () => eventsApi.getById(id),
  });

  const { data: occurrences = [] } = useQuery<EventOccurrence[]>({
    queryKey: ['events', id, 'occurrences'],
    queryFn: () => eventsApi.getOccurrences(id, 90),
    enabled: !!event?.isRecurring,
  });

  const { data: attendanceData, isLoading, refetch } = useQuery({
    queryKey: ['attendance', 'event', id, selectedOccurrence],
    queryFn: () => attendanceApi.getEventAttendanceRecords(id, selectedOccurrence || undefined),
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const checkInMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.manualCheckIn(data),
    onSuccess: () => {
      toast.success('Check-in successful!');
      setGuestInfo({ name: '', email: '', phone: '' });
      setQuickCheckInMemberId(null);
      refetch();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed';
      toast.error(message);
      setQuickCheckInMemberId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => attendanceApi.deleteRecord(id),
    onSuccess: () => {
      toast.success('Record deleted');
      refetch();
    },
    onError: () => {
      toast.error('Failed to delete record');
    },
  });

  const handleMemberCheckIn = (member: Member) => {
    setQuickCheckInMemberId(member._id);
    checkInMutation.mutate({
      eventId: id,
      memberId: member._id,
      ...(selectedOccurrence ? { occurrenceDate: selectedOccurrence } : {}),
    });
  };

  const handleExportAttendance = async () => {
    setIsExporting(true);
    try {
      const blob = await attendanceApi.exportEventAttendance(id, exportFormat as 'csv' | 'pdf', selectedOccurrence);

      const downloadUrl = window.URL.createObjectURL(blob);
      const downloadLink = document.createElement('a');
      downloadLink.href = downloadUrl;
      downloadLink.download = `attendance-${event?.title || id}-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadUrl);

      setShowExportModal(false);
      toast.success('Export successful');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export attendance report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleGuestCheckIn = () => {
    if (!guestInfo.name) {
      toast.error('Guest name is required');
      return;
    }
    checkInMutation.mutate({
      eventId: id,
      name: guestInfo.name,
      email: guestInfo.email,
      phone: guestInfo.phone,
      ...(selectedOccurrence ? { occurrenceDate: selectedOccurrence } : {}),
    });
  };

  const records = attendanceData?.records || [];
  const stats = attendanceData?.stats || {};

  // Compute absentees
  const checkedInMemberIds = new Set(
    records
      .filter((r: any) => r.memberId)
      .map((r: any) => r.memberId._id || r.memberId)
  );

  const absentees = members.filter(
    (member) => !checkedInMemberIds.has(member._id)
  );

  const statsData = [
    { label: 'Total Check-Ins', value: stats.total || 0, icon: Users },
    { label: 'QR Check-Ins', value: stats.qrCheckIns || 0, icon: QrCode },
    { label: 'Members', value: stats.members || 0, icon: UserCheck },
    { label: 'Absent', value: absentees.length, icon: Users },
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

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-foreground truncate">{event?.title || 'Event Attendance'}</h1>
          <p className="text-sm text-muted mt-1">Individual check-in records for this event</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Report
          </Button>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Manual Check-In
          </Button>
        </div>
      </div>

      {/* Occurrence selector for recurring events */}
      {event?.isRecurring && occurrences.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">Select Occurrence</label>
          <select
            value={selectedOccurrence}
            onChange={(e) => setSelectedOccurrence(e.target.value)}
            className="w-full sm:max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          >
            <option value="">All Occurrences</option>
            {occurrences.map((occ, i) => (
              <option key={i} value={occ.startDate}>
                {new Date(occ.startDate).toLocaleDateString('en-US', {
                  timeZone: 'UTC',
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })} ({occ.attendeeCount} attendee{occ.attendeeCount !== 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>
      )}

      <StatsGrid stats={statsData} />

      <Card padding="none">
        {/* Tab Navigation */}
        <div className="flex gap-2 px-4 sm:px-6 pt-4 sm:pt-6 border-b border-border overflow-x-auto">
          <button
            onClick={() => setViewTab('checked-in')}
            className={`flex-shrink-0 px-4 py-2 font-medium text-sm transition-colors ${
              viewTab === 'checked-in'
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Checked In ({records.length})
          </button>
          <button
            onClick={() => setViewTab('absent')}
            className={`flex-shrink-0 px-4 py-2 font-medium text-sm transition-colors ${
              viewTab === 'absent'
                ? 'text-primary border-b-2 border-primary -mb-[2px]'
                : 'text-muted hover:text-foreground'
            }`}
          >
            Absent ({absentees.length})
          </button>
        </div>

        {viewTab === 'checked-in' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : records.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No check-ins yet"
                description="Check-ins will show up here as members and guests scan the QR code or are checked in manually."
                actionLabel="Manual Check-In"
                onAction={() => setIsModalOpen(true)}
              />
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="md:hidden divide-y divide-border">
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

                    const [first, ...rest] = name.split(' ');
                    const last = rest.join(' ');

                    return (
                      <div key={record._id} className="p-4 flex items-start gap-3">
                        <Avatar initials={getInitials(first || '?', last || '')} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium text-foreground truncate">{name}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0 -mt-1 -mr-2 text-red-500 hover:text-red-700"
                              onClick={() => setDeleteTarget(record._id)}
                              aria-label={`Delete check-in for ${name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                            <Badge variant={type === 'Member' ? 'success' : type === 'User' ? 'info' : 'muted'}>
                              {type}
                            </Badge>
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
                          </div>
                          <p className="text-xs text-muted mt-1.5 truncate">
                            {formatDateTime(record.checkInTime)}
                            {contact ? ` · ${contact}` : ''}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Name</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Type</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Method</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Check-In Time</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Contact</th>
                        <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
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

                        const [first, ...rest] = name.split(' ');
                        const last = rest.join(' ');

                        return (
                          <tr key={record._id} className="hover:bg-background transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center gap-3">
                                <Avatar initials={getInitials(first || '?', last || '')} />
                                <span className="text-sm font-medium text-foreground">{name}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <Badge variant={type === 'Member' ? 'success' : type === 'User' ? 'info' : 'muted'}>
                                {type}
                              </Badge>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
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
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted">{formatDateTime(record.checkInTime)}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className="text-sm text-muted">{contact || '—'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteTarget(record._id)}
                                aria-label={`Delete check-in for ${name}`}
                              >
                                <Trash2 className="w-4 h-4 text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}

        {viewTab === 'absent' && (
          <>
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : absentees.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-1">All members checked in!</h3>
                <p className="text-muted text-sm text-center max-w-sm">No absent members for this event</p>
              </div>
            ) : (
              <>
                {/* Mobile: card list */}
                <div className="md:hidden divide-y divide-border">
                  {absentees.map((member: Member) => (
                    <div key={member._id} className="p-4 flex items-start gap-3">
                      <Avatar initials={getInitials(member.firstName, member.lastName)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-sm font-medium text-foreground truncate">
                            {member.firstName} {member.lastName}
                          </span>
                          <Badge
                            variant={
                              member.memberStatus === 'active'
                                ? 'success'
                                : member.memberStatus === 'inactive'
                                ? 'error'
                                : 'muted'
                            }
                            className="flex-shrink-0"
                          >
                            {member.memberStatus || 'Unknown'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted mt-0.5 truncate">
                          {member.phone}
                          {member.email ? ` · ${member.email}` : ''}
                        </p>
                        <Button
                          variant={quickCheckInMemberId === member._id ? 'primary' : 'outline'}
                          size="sm"
                          className="mt-2"
                          onClick={() => handleMemberCheckIn(member)}
                          isLoading={checkInMutation.isPending && quickCheckInMemberId === member._id}
                          leftIcon={<CheckCircle className="w-4 h-4" />}
                        >
                          {quickCheckInMemberId === member._id ? 'Checking In...' : 'Check In'}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop: table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Name</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Email</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Phone</th>
                        <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Member Status</th>
                        <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {absentees.map((member: Member) => (
                        <tr key={member._id} className="hover:bg-background transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <Avatar initials={getInitials(member.firstName, member.lastName)} />
                              <span className="text-sm font-medium text-foreground">
                                {member.firstName} {member.lastName}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-muted">{member.email || '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm text-muted">{member.phone || '—'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant={
                                member.memberStatus === 'active'
                                  ? 'success'
                                  : member.memberStatus === 'inactive'
                                  ? 'error'
                                  : 'muted'
                              }
                            >
                              {member.memberStatus || 'Unknown'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            <Button
                              variant={quickCheckInMemberId === member._id ? 'primary' : 'outline'}
                              size="sm"
                              onClick={() => handleMemberCheckIn(member)}
                              isLoading={checkInMutation.isPending && quickCheckInMemberId === member._id}
                              leftIcon={<CheckCircle className="w-4 h-4" />}
                            >
                              {quickCheckInMemberId === member._id ? 'Checking In...' : 'Check In'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </Card>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => {
          setShowExportModal(false);
          setSelectedOccurrence('');
        }}
        title="Export Attendance Report"
        size="sm"
      >
        <div className="space-y-4">
          {/* Occurrence Selector for Recurring Events */}
          {event?.isRecurring && occurrences.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Select Occurrence</label>
              <select
                value={selectedOccurrence}
                onChange={(e) => setSelectedOccurrence(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">All occurrences</option>
                {occurrences.map((occ) => (
                  <option key={occ.startDate} value={occ.startDate}>
                    {new Date(occ.startDate).toLocaleDateString('en-US', {
                      timeZone: 'UTC',
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  exportFormat === 'csv'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted hover:border-primary/50'
                }`}
              >
                CSV
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted hover:border-primary/50'
                }`}
              >
                PDF
              </button>
            </div>
          </div>

          <Button
            onClick={handleExportAttendance}
            isLoading={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
            className="w-full"
          >
            Export
          </Button>
        </div>
      </Modal>

      {/* Manual Check-In Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setCheckInType('member');
          setGuestInfo({ name: '', email: '', phone: '' });
        }}
        title="Manual Check-In"
      >
        <div>
          {/* Check-in Type Toggle */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={checkInType === 'member' ? 'primary' : 'outline'}
              onClick={() => setCheckInType('member')}
              className="flex-1"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              Member
            </Button>
            <Button
              variant={checkInType === 'guest' ? 'primary' : 'outline'}
              onClick={() => setCheckInType('guest')}
              className="flex-1"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Guest
            </Button>
          </div>

          {checkInType === 'member' ? (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Search Member</label>
              <MemberSearch
                onSelect={(member) => {
                  handleMemberCheckIn(member);
                  setIsModalOpen(false);
                  setCheckInType('member');
                  setGuestInfo({ name: '', email: '', phone: '' });
                }}
                excludeIds={records.map((r: any) => r.memberId?._id).filter(Boolean)}
                placeholder="Search by name, email, or phone..."
              />
              {records.filter((r: any) => r.memberId).length > 0 && (
                <p className="text-xs text-muted mt-2">
                  {records.filter((r: any) => r.memberId).length} member(s) already checked in
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Input
                label="Guest Name *"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                placeholder="Enter guest name"
              />
              <div className="grid grid-cols-1 gap-4">
                <Input
                  label="Email (optional)"
                  type="email"
                  value={guestInfo.email}
                  onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                  placeholder="guest@example.com"
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  value={guestInfo.phone}
                  onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                  placeholder="+1 234 567 8900"
                />
              </div>
              <Button
                onClick={() => {
                  handleGuestCheckIn();
                  if (!checkInMutation.isPending) {
                    setIsModalOpen(false);
                    setGuestInfo({ name: '', email: '', phone: '' });
                  }
                }}
                isLoading={checkInMutation.isPending}
                leftIcon={<CheckCircle className="w-4 h-4" />}
                className="w-full"
              >
                Check In Guest
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Record"
        description="This action cannot be undone."
        size="sm"
      >
        <div>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to delete this check-in record?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
