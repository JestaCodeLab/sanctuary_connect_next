'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Building2,
  MapPin,
  Plus,
  Edit2,
  Search,
  Users,
  Globe,
  Loader2,
  Star,
  Eye
} from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import BranchFormModal from '@/components/dashboard/BranchFormModal';
import { Button, Input, Card } from '@/components/ui';
import { organizationApi, membersApi } from '@/lib/api';
import type { Branch, Member } from '@/types';

export default function BranchesPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [search, setSearch] = useState('');

  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });

  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const branches = orgData?.branches ?? [];
  const organization = orgData?.organization;

  // Filter branches by search
  const filteredBranches = branches.filter((branch: Branch) => {
    const searchLower = search.toLowerCase();
    return (
      branch.name.toLowerCase().includes(searchLower) ||
      branch.city?.toLowerCase().includes(searchLower) ||
      branch.address?.toLowerCase().includes(searchLower)
    );
  });

  // Get member count per branch - handle both string and populated object branchId
  const getMemberCount = (branchId: string) => {
    return members.filter((m: Member) => {
      if (!m.branchId) return false;
      const memberBranchId = typeof m.branchId === 'string' ? m.branchId : m.branchId._id;
      return memberBranchId === branchId;
    }).length;
  };

  const handleOpenModal = () => {
    setEditingBranch(null);
    setIsModalOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
  };

  const headOffice = branches.find((b: Branch) => b.isHeadOffice);
  const totalMembers = members.length;

  const stats = [
    {
      label: 'Total Branches',
      value: branches.length,
      icon: Building2,
    },
    {
      label: 'Head Office',
      value: headOffice?.name ?? 'Not set',
      icon: Star,
    },
    {
      label: 'Total Members',
      value: totalMembers,
      icon: Users,
    },
    {
      label: 'Structure',
      value: organization?.structure === 'multi' ? 'Multi-Branch' : 'Single',
      icon: Globe,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Branches"
        description="Manage your church locations and campuses"
        actionLabel="Add Branch"
        actionIcon={Plus}
        onAction={handleOpenModal}
      />

      <StatsGrid stats={stats} />

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Search branches by name, city, or address..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {branches.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No branches yet"
          description="Add your first church branch to get started with managing your locations."
          actionLabel="Add Branch"
          onAction={handleOpenModal}
        />
      ) : filteredBranches.length === 0 ? (
        <Card padding="lg">
          <div className="text-center py-8">
            <Search className="w-12 h-12 text-muted mx-auto mb-3 opacity-50" />
            <p className="text-sm text-muted">No branches found matching &quot;{search}&quot;</p>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSearch('')}
              className="mt-4"
            >
              Clear Search
            </Button>
          </div>
        </Card>
      ) : (
        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Branch Name</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Location</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Members</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Radius</th>
                  <th className="text-left text-sm font-medium text-muted px-4 py-3">Type</th>
                  <th className="text-right text-sm font-medium text-muted px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredBranches.map((branch: Branch) => {
                  const memberCount = getMemberCount(branch._id);
                  const location = [branch.city, branch.region].filter(Boolean).join(', ');
                  
                  return (
                    <tr key={branch._id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Building2 className="w-4 h-4 text-primary" />
                          </div>
                          <span className="text-sm font-medium text-foreground">{branch.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm text-muted">
                          <MapPin className="w-3 h-3" />
                          <span>{location || '—'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-sm">
                          <Users className="w-3 h-3 text-blue-500" />
                          <span className="font-medium text-foreground">{memberCount}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted">{branch.geofenceRadius || 200}m</span>
                      </td>
                      <td className="px-4 py-3">
                        {branch.isHeadOffice ? (
                          <Badge variant="warning">
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              Head Office
                            </span>
                          </Badge>
                        ) : (
                          <Badge variant="muted">Branch</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditBranch(branch)}
                            title="Edit branch"
                            className="px-2"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/dashboard/branches/${branch._id}`)}
                            className="flex items-center gap-1"
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add / Edit Branch Modal */}
      {organization?._id && (
        <BranchFormModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          organizationId={organization._id}
          editingBranch={editingBranch}
        />
      )}
    </div>
  );
}
