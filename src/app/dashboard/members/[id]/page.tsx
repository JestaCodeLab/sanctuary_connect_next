'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Edit2, Mail, Phone, MessageSquare, MapPin, Calendar, Cake, Heart, Users, Home } from 'lucide-react';
import { Card } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import SendSmsDialog from '@/components/dashboard/SendSmsDialog';
import { membersApi } from '@/lib/api';

const statusBadgeVariant: Record<string, 'success' | 'error' | 'info' | 'warning'> = {
  active: 'success',
  inactive: 'error',
  visiting: 'info',
  transferred: 'warning',
};

function formatDate(dateString?: string): string {
  if (!dateString) return '—';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function getAge(dateOfBirth?: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (isNaN(dob.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function capitalize(value?: string): string | undefined {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : undefined;
}

function InfoRow({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string | null;
  href?: string;
}) {
  const hasValue = !!value;
  const content = (
    <>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${hasValue ? 'bg-primary/10' : 'bg-muted/30 opacity-50'}`}>
        <Icon className={`w-4 h-4 ${hasValue ? 'text-primary' : 'text-muted'}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className={`text-sm font-medium mt-0.5 truncate ${href ? 'text-primary' : 'text-foreground'} ${!value ? '!text-muted !font-normal' : ''}`}>
          {value || '—'}
        </p>
      </div>
    </>
  );

  if (href && value) {
    return (
      <a href={href} className="flex items-center gap-3 py-2.5 hover:bg-muted/10 rounded-lg -mx-2 px-2 transition-colors">
        {content}
      </a>
    );
  }

  return <div className="flex items-center gap-3 py-2.5">{content}</div>;
}

export default function MemberDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [showSmsModal, setShowSmsModal] = useState(false);

  const { data: member, isLoading } = useQuery({
    queryKey: ['members', id],
    queryFn: () => membersApi.getById(id),
  });

  // Fetch family members if they exist
  const { data: familyMembers = [] } = useQuery({
    queryKey: ['members', 'family', member?.familyMembers],
    queryFn: async () => {
      if (!member?.familyMembers || member.familyMembers.length === 0) {
        return [];
      }
      const members = await Promise.all(
        member.familyMembers.map(async (fm: any) => {
          const memberData = await membersApi.getById(fm.memberId);
          return { ...memberData, relationship: fm.relationship };
        })
      );
      return members;
    },
    enabled: !!member?.familyMembers && member.familyMembers.length > 0,
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

  const age = getAge(member.dateOfBirth);
  const dobDisplay = member.dateOfBirth
    ? `${formatDate(member.dateOfBirth)}${age !== null ? ` (${age} yrs)` : ''}`
    : undefined;

  const addressParts = [member.address, member.suburb, member.city, member.region, member.zipCode, member.country].filter(Boolean);
  const addressDisplay = addressParts.length > 0 ? addressParts.join(', ') : undefined;

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

      {/* Profile Header */}
      <Card padding="lg" className="mb-6">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">
              {getInitials(member.firstName, member.lastName)}
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground truncate">
                {member.firstName} {member.lastName}
              </h1>
              <Badge variant={statusBadgeVariant[member.memberStatus] || 'muted'}>
                {capitalize(member.memberStatus)}
              </Badge>
            </div>
            <p className="text-sm mt-0 truncate">
              Joined {formatDate(member.membershipDate || member.createdAt)}
            </p>
          </div>
        </div>

        {/* Quick actions - Call/Text/Email/Edit, all on one row, front and center on mobile */}
        <div className="flex items-center gap-2 mt-5 pt-5 border-t border-border">
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border border-border hover:bg-muted/10 hover:border-primary/50 transition-colors"
            >
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">Call</span>
            </a>
          )}
          {member.phone && (
            <button
              type="button"
              onClick={() => setShowSmsModal(true)}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border border-border hover:bg-muted/10 hover:border-primary/50 transition-colors"
            >
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">SMS</span>
            </button>
          )}
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border border-border hover:bg-muted/10 hover:border-primary/50 transition-colors"
            >
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-foreground">Email</span>
            </a>
          )}
          <Link
            href={`/dashboard/members/${id}/edit`}
            className="flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border border-border hover:bg-muted/10 hover:border-primary/50 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-primary" />
            <span className="text-xs font-medium text-foreground">Edit</span>
          </Link>
        </div>
      </Card>

      <div className="space-y-6">
        {/* Contact & Personal */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-foreground mb-1">Personal Information</h2>
          <div className="divide-y divide-border -mt-1">
            <InfoRow icon={Phone} label="Phone" value={member.phone} href={member.phone ? `tel:${member.phone}` : undefined} />
            <InfoRow icon={Mail} label="Email" value={member.email} href={member.email ? `mailto:${member.email}` : undefined} />
            <InfoRow icon={Cake} label="Date of Birth" value={dobDisplay} />
            <InfoRow icon={Users} label="Gender" value={capitalize(member.gender)} />
            <InfoRow icon={Heart} label="Marital Status" value={capitalize(member.maritalStatus)} />
          </div>
        </Card>

        {/* Address */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-foreground mb-1">Address</h2>
          <div className="-mt-1">
            <InfoRow icon={Home} label="Home Address" value={addressDisplay} />
          </div>
        </Card>

        {/* Church Information */}
        <Card padding="lg">
          <h2 className="text-base font-semibold text-foreground mb-1">Church Information</h2>
          <div className="divide-y divide-border -mt-1">
            <InfoRow icon={Calendar} label="Membership Date" value={formatDate(member.membershipDate)} />
            <InfoRow icon={Calendar} label="Baptism Date" value={formatDate(member.baptismDate)} />
            <InfoRow icon={Calendar} label="Added to Directory" value={formatDate(member.createdAt)} />
          </div>
          <div className="pt-3">
            <p className="text-xs text-muted mb-2">Departments</p>
            {member.departments && member.departments.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {member.departments.map((dept: any) => {
                  const deptName = typeof dept === 'object' ? dept.name : dept;
                  return (
                    <span key={typeof dept === 'object' ? dept._id : dept} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs font-medium">
                      {deptName}
                    </span>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted italic">Not assigned to any departments</p>
            )}
          </div>
        </Card>

        {/* Family Information */}
        {familyMembers.length > 0 && (
          <Card padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-muted" />
              <h2 className="text-base font-semibold text-foreground">Family Links</h2>
            </div>
            <div className="space-y-2">
              {familyMembers.map((familyMember: any) => (
                <Link
                  key={familyMember._id}
                  href={`/dashboard/members/${familyMember._id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border hover:border-primary transition"
                >
                  <div className="w-9 h-9 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {getInitials(familyMember.firstName, familyMember.lastName)}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">
                      {familyMember.firstName} {familyMember.lastName}
                    </p>
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {familyMember.email || familyMember.phone || '—'}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded flex-shrink-0">
                    {familyMember.relationship}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>

      <SendSmsDialog
        open={showSmsModal}
        onOpenChange={setShowSmsModal}
        preselectedMemberIds={[id]}
        lockSendType
        recipientsLabel={`${member.firstName} ${member.lastName} — ${member.phone}`}
      />
    </div>
  );
}
