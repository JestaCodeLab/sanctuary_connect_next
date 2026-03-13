'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Users, QrCode, UserCheck, UserPlus, CheckCircle, X, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import { Badge, PageHeader, StatsGrid } from '@/components/dashboard';
import MemberSearch from '@/components/dashboard/MemberSearch';
import { attendanceApi, eventsApi, membersApi } from '@/lib/api';
import type { Member, EventOccurrence } from '@/types';

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
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [checkInType, setCheckInType] = useState<'member' | 'guest'>('member');
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '', phone: '' });
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  const [selectedOccurrence, setSelectedOccurrence] = useState<string>('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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
      refetch();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed';
      toast.error(message);
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
    checkInMutation.mutate({
      eventId: id,
      memberId: member._id,
      ...(selectedOccurrence ? { occurrenceDate: selectedOccurrence } : {}),
    });
  };

  const handleExportAttendance = async () => {
    setIsExporting(true);
    try {
      const { downloadUrl } = await attendanceApi.exportEventAttendance(id, exportFormat, selectedOccurrence || undefined);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `attendance-${event?.title || id}-${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setShowExportModal(false);
      toast.success('Export successful');
    } catch {
      toast.error('Failed to export attendance report');
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

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{event?.title || 'Event Attendance'}</h1>
          <p className="text-sm text-muted mt-1">Individual check-in records for this event</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExportModal(true)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export Report
          </Button>
          <Button
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
            className="w-full max-w-xs px-3 py-2 rounded-lg border border-border bg-background text-foreground text-sm"
          >
            <option value="">All Occurrences</option>
            {occurrences.map((occ, i) => (
              <option key={i} value={occ.startDate}>
                {new Date(occ.startDate).toLocaleDateString('en-US', {
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
                  <th className="text-right text-sm font-medium text-muted py-3 px-4">Actions</th>
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
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-red-500 hover:text-red-700"
                          onClick={() => setDeleteTarget(record._id)}
                          title="Delete record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Export Attendance Report</h2>
              <button onClick={() => setShowExportModal(false)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-6">
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
          </Card>
        </div>
      )}

      {/* Manual Check-In Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Manual Check-In</h2>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setCheckInType('member');
                  setGuestInfo({ name: '', email: '', phone: '' });
                }}
                className="text-muted hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

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
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card padding="lg" className="w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-foreground">Delete Record</h2>
              <button onClick={() => setDeleteTarget(null)} className="text-muted hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-muted mb-6">
              Are you sure you want to delete this check-in record? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600 focus:ring-red-500"
                isLoading={deleteMutation.isPending}
                onClick={() => {
                  deleteMutation.mutate(deleteTarget, {
                    onSuccess: () => setDeleteTarget(null),
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
