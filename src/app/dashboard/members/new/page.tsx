'use client';

import { useRouter } from 'next/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { MemberForm } from '@/components/dashboard';
import { membersApi } from '@/lib/api';
import type { MemberFormData } from '@/lib/validations';

export default function AddMemberPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: MemberFormData) => membersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member added successfully');
      router.push('/dashboard/members');
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error || 'Failed to add member';
      toast.error(message);
    },
  });

  return (
    <div className="w-full">
      <div className="mb-8">
        <Link
          href="/dashboard/members"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Members
        </Link>
        <h1 className="text-2xl font-bold text-foreground">Add New Member</h1>
        <p className="text-muted mt-1">Fill in the details below to add a new church member.</p>
      </div>

      <MemberForm
        onSubmit={(data) => createMutation.mutate(data)}
        isLoading={createMutation.isPending}
        submitLabel="Add Member"
        onCancel={() => router.push('/dashboard/members')}
      />
    </div>
  );
}
