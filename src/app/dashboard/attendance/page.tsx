'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { ClipboardCheck, Users, TrendingUp, Calendar, BarChart3, Plus } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, Modal, EmptyState } from '@/components/dashboard';
import { Card, Button, Input, Select } from '@/components/ui';
import { attendanceApi, eventsApi } from '@/lib/api';
import { attendanceSchema } from '@/lib/validations';
import type { AttendanceFormData } from '@/lib/validations';
import BranchField from '@/components/dashboard/BranchField';
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
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance'],
    queryFn: attendanceApi.getAll,
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ['attendance', 'stats'],
    queryFn: attendanceApi.getStats,
  });

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AttendanceFormData>({
    resolver: zodResolver(attendanceSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: attendanceApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance record created');
      setIsModalOpen(false);
      reset();
    },
    onError: (error: any) => {
      const message = error?.response?.data?.error || 'Failed to create attendance record';
      toast.error(message);
    },
  });

  const onSubmit = (data: AttendanceFormData) => {
    createMutation.mutate({
      eventId: data.eventId,
      date: data.date,
      totalPresent: data.totalPresent,
      totalAbsent: data.totalAbsent,
      notes: data.notes,
    });
  };

  const stats = [
    {
      label: 'Average Attendance',
      value: attendanceStats ? `${attendanceStats.averageRate}%` : '—',
      icon: ClipboardCheck,
    },
    {
      label: 'Last Service',
      value: attendanceStats?.lastAttendance ?? '—',
      icon: Users,
    },
    {
      label: 'Total Services',
      value: attendanceStats?.totalRecords ?? 0,
      icon: Calendar,
    },
    {
      label: 'Total Present',
      value: attendanceStats?.totalPresent ?? 0,
      icon: TrendingUp,
    },
  ];

  const eventOptions = events.map((e: ChurchEvent) => ({
    value: e._id,
    label: e.title,
  }));

  return (
    <div>
      <PageHeader
        title="Attendance"
        description="Track service and event attendance"
        actionLabel="Record Attendance"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

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
            description="Start by recording attendance for a service or event."
            actionLabel="Record Attendance"
            onAction={() => setIsModalOpen(true)}
          />
        </Card>
      ) : (
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
                {records.map((record: AttendanceRecord) => {
                  const rate = getAttendanceRate(record.totalPresent, record.totalAbsent);
                  return (
                    <tr key={record._id} className="border-b border-border last:border-b-0">
                      <td className="py-3 pr-4 text-sm text-foreground whitespace-nowrap">
                        {formatDate(record.date)}
                      </td>
                      <td className="py-3 pr-4 text-sm text-foreground">
                        {record.eventId?.title || '—'}
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
      )}

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

      {/* Create Attendance Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          reset();
        }}
        title="Record Attendance"
        description="Log attendance for a service or event."
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <BranchField value={watch('branchId')} onChange={(v) => setValue('branchId', v)} />
          <Select
            label="Event / Service"
            options={eventOptions}
            placeholder="Select an event"
            error={errors.eventId?.message}
            {...register('eventId')}
          />

          <Input
            label="Date"
            type="date"
            error={errors.date?.message}
            {...register('date')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Present"
              type="number"
              min={0}
              error={errors.totalPresent?.message}
              {...register('totalPresent')}
            />
            <Input
              label="Absent"
              type="number"
              min={0}
              error={errors.totalAbsent?.message}
              {...register('totalAbsent')}
            />
          </div>

          <Input
            label="Notes (optional)"
            error={errors.notes?.message}
            {...register('notes')}
          />

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsModalOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={createMutation.isPending}
            >
              Save Record
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
