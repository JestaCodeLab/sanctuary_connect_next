'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
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

import { PageHeader, Modal, StatsGrid, Badge, EmptyState } from '@/components/dashboard';
import { Button, Input, Card, Checkbox } from '@/components/ui';
import { organizationApi, membersApi } from '@/lib/api';
import { branchSchema, type BranchFormData } from '@/lib/validations';
import type { Branch, Member } from '@/types';

export default function BranchesPage() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

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

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      suburb: '',
      region: '',
      zipCode: '',
      radius: 200,
      isHeadOffice: false,
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (!organization?._id) throw new Error('Organization not found');
      return organizationApi.createBranch(organization._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Branch created successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to create branch';
      toast.error(message);
    },
  });

  const updateBranchMutation = useMutation({
    mutationFn: (data: BranchFormData) => {
      if (!organization?._id || !editingBranch?._id) throw new Error('Organization or branch not found');
      return organizationApi.updateBranch(organization._id, editingBranch._id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Branch updated successfully');
      handleCloseModal();
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        'Failed to update branch';
      toast.error(message);
    },
  });

  const onSubmit = (data: BranchFormData) => {
    if (editingBranch) {
      updateBranchMutation.mutate(data);
    } else {
      createBranchMutation.mutate(data);
    }
  };

  const handleOpenModal = () => {
    setEditingBranch(null);
    reset({
      name: '',
      address: '',
      city: '',
      suburb: '',
      region: '',
      zipCode: '',
      radius: 200,
      isHeadOffice: false,
    });
    setIsModalOpen(true);
  };

  const handleEditBranch = (branch: Branch) => {
    setEditingBranch(branch);
    reset({
      name: branch.name,
      address: branch.address || '',
      city: branch.city || '',
      suburb: branch.suburb || '',
      region: branch.region || '',
      zipCode: branch.zipCode || '',
      radius: branch.geofenceRadius || 200,
      isHeadOffice: branch.isHeadOffice || false,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingBranch(null);
    reset();
  };

  const headOffice = branches.find((b: Branch) => b.isHeadOffice);
  const totalMembers = members.length;

  const isEditing = !!editingBranch;
  const isMutating = createBranchMutation.isPending || updateBranchMutation.isPending || isSubmitting;

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
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={isEditing ? 'Edit Branch' : 'Add Branch'}
        description={isEditing ? 'Update branch details' : 'Create a new church branch location'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Branch Name"
            placeholder="e.g. Main Campus"
            error={errors.name?.message}
            {...register('name')}
          />

          <Input
            label="Address"
            placeholder="Street address"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="City"
              error={errors.city?.message}
              {...register('city')}
            />
            <Input
              label="Suburb"
              placeholder="Suburb"
              error={errors.suburb?.message}
              {...register('suburb')}
            />
          </div>

          <Input
            label="Region"
            placeholder="Region"
            error={errors.region?.message}
            {...register('region')}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Zip Code"
              placeholder="Zip code"
              error={errors.zipCode?.message}
              {...register('zipCode')}
            />
            <Input
              label="Geofence Radius (m)"
              type="number"
              placeholder="50 - 500"
              error={errors.radius?.message}
              {...register('radius', { valueAsNumber: true })}
            />
          </div>

          <Checkbox
            label="Set as Head Office"
            {...register('isHeadOffice')}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseModal}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isMutating}
            >
              {isEditing ? 'Save Changes' : 'Create Branch'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
