'use client';

import { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Users, 
  Globe, 
  Star,
  Edit2,
  Loader2
} from 'lucide-react';
import { Card, Button } from '@/components/ui';
import { Badge } from '@/components/dashboard';
import { organizationApi, membersApi } from '@/lib/api';
import type { Branch, Member } from '@/types';

function DetailField({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium text-foreground mt-0.5">{value || '\u2014'}</dd>
    </div>
  );
}

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

export default function BranchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: branchId } = use(params);
  const router = useRouter();

  // Fetch organization with branches
  const { data: orgData, isLoading: orgLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  // Fetch all members
  const { data: allMembers = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const branches = orgData?.branches ?? [];
  const branch = branches.find((b: Branch) => b._id === branchId);

  // Filter members by branch - handle both string and populated object branchId
  const branchMembers = allMembers.filter((m: Member) => {
    if (!m.branchId) return false;
    const memberBranchId = typeof m.branchId === 'string' ? m.branchId : m.branchId._id;
    return memberBranchId === branchId;
  });

  const isLoading = orgLoading || membersLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!branch) {
    return (
      <div className="w-full">
        <Card padding="lg">
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-muted">Branch not found.</p>
            <Link href="/dashboard/branches" className="text-primary hover:underline mt-2 inline-block">
              Back to Branches
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const fullAddress = [branch.address, branch.suburb, branch.city, branch.region, branch.zipCode]
    .filter(Boolean)
    .join(', ');

  return (
    <div className="w-full">
      {/* Back link */}
      <Link
        href="/dashboard/branches"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Branches
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {branch.name}
              </h1>
              {branch.isHeadOffice && (
                <Badge variant="warning">
                  <span className="flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Head Office
                  </span>
                </Badge>
              )}
            </div>
            {fullAddress && (
              <p className="text-muted mt-1 flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {fullAddress}
              </p>
            )}
          </div>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          leftIcon={<Edit2 className="w-4 h-4" />}
          onClick={() => router.push('/dashboard/branches')}
        >
          Edit Branch
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Branch Details */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Building2 className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Branch Details</h2>
          </div>
          <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
            <DetailField label="Branch Name" value={branch.name} />
            <DetailField label="Type" value={branch.isHeadOffice ? 'Head Office' : 'Branch'} />
            <DetailField label="Address" value={branch.address} />
            <DetailField label="Suburb" value={branch.suburb} />
            <DetailField label="City" value={branch.city} />
            <DetailField label="Region" value={branch.region} />
            <DetailField label="Zip Code" value={branch.zipCode} />
            <DetailField label="Geofence Radius" value={`${branch.geofenceRadius || 200}m`} />
            <DetailField label="Created" value={formatDate(branch.createdAt)} />
          </dl>
        </Card>

        {/* Location Map placeholder */}
        <Card padding="lg">
          <div className="flex items-center gap-2 mb-6">
            <Globe className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Location</h2>
          </div>
          <div className="aspect-video bg-muted/30 rounded-lg flex items-center justify-center border border-border">
            <div className="text-center">
              <MapPin className="w-12 h-12 text-muted mx-auto mb-2 opacity-50" />
              <p className="text-sm text-muted">Map integration coming soon</p>
              {branch.latitude && branch.longitude && (
                <p className="text-xs text-muted mt-1">
                  Coordinates: {branch.latitude}, {branch.longitude}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Members List */}
      <Card padding="lg" className="mt-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-muted" />
            <h2 className="text-lg font-semibold text-foreground">Recent Members</h2>
          </div>
          <Link href="/dashboard/members">
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </div>

        {branchMembers.length === 0 ? (
          <div className="text-center py-8">
            <Users className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted">No members in this branch yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {branchMembers.slice(0, 5).map((member: Member) => (
              <Link
                key={member._id}
                href={`/dashboard/members/${member._id}`}
                className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border hover:border-primary transition"
              >
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">
                    {member.firstName.charAt(0)}{member.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-muted truncate">
                    {member.email || member.phone || '—'}
                  </p>
                </div>
                <Badge variant={member.memberStatus === 'active' ? 'success' : 'muted'}>
                  {member.memberStatus}
                </Badge>
              </Link>
            ))}
            {branchMembers.length > 5 && (
              <p className="text-sm text-muted text-center mt-4">
                And {branchMembers.length - 5} more members...
              </p>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}