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

  // Get member count per branch
  const getMemberCount = (branchId: string) => {
    return members.filter((m: Member) => m.branchId === branchId).length;
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
        <div className="space-y-4">
          {filteredBranches.map((branch: Branch) => {
            const memberCount = getMemberCount(branch._id);
            const fullAddress = [branch.address, branch.suburb, branch.city, branch.region, branch.zipCode]
              .filter(Boolean)
              .join(', ');
            
            return (
              <Card 
                key={branch._id} 
                padding="none"
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="flex flex-col md:flex-row">
                  {/* Left section - Icon and main info */}
                  <div className="flex-1 p-5">
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-7 h-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-lg font-semibold text-foreground">
                            {branch.name}
                          </h3>
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
                          <p className="text-sm text-muted mt-1 flex items-center gap-1">
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate">{fullAddress}</span>
                          </p>
                        )}

                        {/* Stats row */}
                        <div className="flex items-center gap-6 mt-4">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-foreground">{memberCount}</span>
                            <span className="text-sm text-muted">Members</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-4 h-4 text-green-500" />
                            <span className="text-sm font-medium text-foreground">{branch.geofenceRadius || 200}m</span>
                            <span className="text-sm text-muted">Radius</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right section - Actions */}
                  <div className="flex md:flex-col items-center justify-end gap-2 p-4 bg-background border-t md:border-t-0 md:border-l border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/branches/${branch._id}`)}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBranch(branch)}
                      className="flex items-center gap-2"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
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
