'use client';

import { use } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Mail, Phone, MapPin, Calendar, User } from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import { membersApi } from '@/lib/api';

const statusBadgeVariant: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  active: 'success',
  inactive: 'error',
  visiting: 'info',
  transferred: 'warning',
};

function formatDate(dateString?: string): string {
  if (!dateString) return '\u2014';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '\u2014';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{value || '\u2014'}</dd>
    </div>
  );
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const { data: member, isLoading } = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.getById(id),
  });

  if (isLoading) {
    return (
      <div className="w-full">
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
      <div className="w-full">
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
    <div className="w-full">
      {/* Back link */}
      <Link
        href="/dashboard/members"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Members
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">
              {getInitials(member.firstName, member.lastName)}
            </span>
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {member.firstName} {member.lastName}
              </h1>
              <Badge variant={statusBadgeVariant[member.memberStatus] || 'muted'}>
                {member.memberStatus.charAt(0).toUpperCase() + member.memberStatus.slice(1)}
              </Badge>
            </div>
            {member.email && (
              <p className="text-muted mt-1">{member.email}</p>
            )}
          </div>
        </div>
        <Link href={`/dashboard/members/${id}/edit`}>
          <Button variant="outline" size="sm" leftIcon={<Edit2 className="w-4 h-4" />}>
            Edit
          </Button>
        </Link>
      </div>

      <div className="space-y-6">
        {/* Personal Information */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <User className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Personal Information</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="First Name" value={member.firstName} />
            <DetailField label="Last Name" value={member.lastName} />
            <DetailField label="Email" value={member.email} />
            <DetailField label="Phone" value={member.phone} />
            <DetailField label="Date of Birth" value={formatDate(member.dateOfBirth)} />
            <DetailField label="Gender" value={member.gender ? member.gender.charAt(0).toUpperCase() + member.gender.slice(1) : undefined} />
            <DetailField label="Marital Status" value={member.maritalStatus ? member.maritalStatus.charAt(0).toUpperCase() + member.maritalStatus.slice(1) : undefined} />
          </dl>
        </Card>

        {/* Address */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Address</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Street Address" value={member.address} />
            <DetailField label="City" value={member.city} />
            <DetailField label="Suburb" value={member.suburb} />
            <DetailField label="Region" value={member.region} />
            <DetailField label="Zip / Postal Code" value={member.zipCode} />
            <DetailField label="Country" value={member.country} />
          </dl>
        </Card>

        {/* Church Information */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Church Information</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Baptism Date" value={formatDate(member.baptismDate)} />
            <DetailField label="Membership Date" value={formatDate(member.membershipDate)} />
            <DetailField label="Member Status" value={member.memberStatus.charAt(0).toUpperCase() + member.memberStatus.slice(1)} />
            <DetailField label="Member Since" value={formatDate(member.createdAt)} />
          </dl>
        </Card>
      </div>
    </div>
  );
}
