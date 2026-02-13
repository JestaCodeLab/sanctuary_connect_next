'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui';
import { MemberForm } from '@/components/dashboard';
import { membersApi } from '@/lib/api';
import type { MemberFormData } from '@/lib/validations';
import type { Member } from '@/types';

function toDateInputValue(dateString?: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  return date.toISOString().split('T')[0];
}

function memberToFormData(member: Member): Partial<MemberFormData> {
  return {
    firstName: member.firstName,
    lastName: member.lastName,
    email: member.email,
    phone: member.phone || '',
    dateOfBirth: toDateInputValue(member.dateOfBirth),
    gender: member.gender || '',
    maritalStatus: member.maritalStatus || '',
    address: member.address || '',
    city: member.city || '',
    suburb: member.suburb || '',
    region: member.region || '',
    zipCode: member.zipCode || '',
    country: member.country || '',
    baptismDate: toDateInputValue(member.baptismDate),
    membershipDate: toDateInputValue(member.membershipDate),
    memberStatus: member.memberStatus || 'active',
  };
}

export default function EditMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: member, isLoading: isFetching } = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.getById(id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: MemberFormData) => membersApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member updated successfully');
      router.push('/dashboard/members');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || 'Failed to update member';
      toast.error(message);
    },
  });

  if (isFetching) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card padding="lg">
          <div className="text-center py-12">
            <p className="text-muted">Member not found.</p>
            <Link href="/dashboard/members" className="text-primary hover:underline mt-2 inline-block">
              Back to Members
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members
        </Link>
        <h1 className="text-2xl font-bold text-foreground">
          Edit Member
        </h1>
        <p className="text-muted mt-1">
          Update details for {member.firstName} {member.lastName}.
        </p>
      </div>

      <MemberForm
        defaultValues={memberToFormData(member)}
        onSubmit={(data) => updateMutation.mutate(data)}
        isLoading={updateMutation.isPending}
        submitLabel="Save Changes"
        onCancel={() => router.push('/dashboard/members')}
      />
    </div>
  );
}
