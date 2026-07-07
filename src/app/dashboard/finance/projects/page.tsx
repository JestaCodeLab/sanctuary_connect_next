'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Target, Plus, TrendingUp, Wallet, Calendar, Pencil } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, ProgressBar } from '@/components/ui';
import { donationsApi, financeApi, membersApi } from '@/lib/api';
import { donationSchema, projectSchema, type DonationFormData, type ProjectFormData } from '@/lib/validations';
import { useCurrency } from '@/lib/hooks/useCurrency';
import { FinanceAccessGuard } from '@/components/finance/FinanceAccessGuard';
import type { Donation, Project } from '@/types';

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'online', label: 'Online' },
];

function formatDate(dateString?: string | null): string {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function NewProjectModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectFormData) => financeApi.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Project created successfully');
      reset();
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to create project');
    },
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Project">
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Project Name</label>
          <Input placeholder="e.g. Building Fund" {...register('name')} />
          {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
          <Input placeholder="What is this project for?" {...register('description')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Amount (Optional)</label>
          <Input type="number" placeholder="0.00" {...register('targetAmount')} />
          {errors.targetAmount && <span className="text-sm text-red-600">{errors.targetAmount.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Date (Optional)</label>
          <Input type="date" {...register('targetDate')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending} className="flex-1">
            Create Project
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditProjectModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProjectFormData>({
    resolver: zodResolver(projectSchema) as any,
    values: project ? {
      name: project.name,
      description: project.description || '',
      targetAmount: project.targetAmount || undefined,
      targetDate: project.targetDate ? new Date(project.targetDate).toISOString().split('T')[0] : '',
    } : undefined,
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectFormData) => financeApi.updateProject(project!._id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Project updated successfully');
      onClose();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to update project');
    },
  });

  return (
    <Modal isOpen={!!project} onClose={onClose} title="Edit Project">
      <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Project Name</label>
          <Input {...register('name')} />
          {errors.name && <span className="text-sm text-red-600">{errors.name.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
          <Input {...register('description')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Amount (Optional)</label>
          <Input type="number" {...register('targetAmount')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Target Date (Optional)</label>
          <Input type="date" {...register('targetDate')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={updateMutation.isPending} isLoading={updateMutation.isPending} className="flex-1">
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function RecordDonationModal({ project, onClose }: { project: Project | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({ queryKey: ['members'], queryFn: () => membersApi.getAll() });

  const donorOptions = [
    { value: '', label: 'Anonymous' },
    ...members.map((m: any) => ({ value: m._id, label: `${m.firstName} ${m.lastName}` })),
  ];

  const { register, handleSubmit, reset, formState: { errors } } = useForm<DonationFormData>({
    resolver: zodResolver(donationSchema) as any,
    defaultValues: {
      donorId: '',
      amount: undefined,
      donationType: 'project',
      donationDate: new Date().toISOString().split('T')[0],
      paymentMethod: '',
      notes: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: DonationFormData) => donationsApi.create({ ...data, fundBucketId: project!._id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['donations'] });
      queryClient.invalidateQueries({ queryKey: ['finance', 'projects'] });
      toast.success('Donation recorded successfully');
      reset();
      onClose();
    },
    onError: () => {
      toast.error('Failed to record donation');
    },
  });

  return (
    <Modal isOpen={!!project} onClose={onClose} title={`Record Donation — ${project?.name ?? ''}`}>
      <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Donor</label>
          <select
            {...register('donorId')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {donorOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Amount</label>
          <Input type="number" placeholder="0.00" {...register('amount', { valueAsNumber: true })} />
          {errors.amount && <span className="text-sm text-red-600">{errors.amount.message}</span>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Payment Method</label>
          <select
            {...register('paymentMethod')}
            className="w-full px-3 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Select method...</option>
            {paymentMethodOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Date</label>
          <Input type="date" {...register('donationDate')} />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-2">Notes (Optional)</label>
          <Input placeholder="Add any notes about this donation..." {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-4 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" disabled={createMutation.isPending} isLoading={createMutation.isPending} className="flex-1">
            Record Donation
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ProjectCard({ project, onRecordDonation, onEdit }: {
  project: Project;
  onRecordDonation: () => void;
  onEdit: () => void;
}) {
  const { formatCurrency } = useCurrency();
  const progress = project.targetAmount ? (project.raisedAmount / project.targetAmount) * 100 : 0;

  return (
    <Card padding="md" className="flex flex-col h-full">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
          {project.description && <p className="text-xs text-muted mt-0.5">{project.description}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {project.status === 'archived' && <Badge variant="muted">Archived</Badge>}
          {project.status === 'completed' && <Badge variant="success">Completed</Badge>}
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-muted">
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="mt-2 mb-3">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-lg font-bold text-foreground">{formatCurrency(project.raisedAmount)}</span>
          {project.targetAmount ? (
            <span className="text-xs text-muted">of {formatCurrency(project.targetAmount)}</span>
          ) : (
            <span className="text-xs text-muted">raised</span>
          )}
        </div>
        {project.targetAmount ? <ProgressBar progress={progress} size="sm" /> : null}
      </div>

      <div className="flex items-center justify-between text-xs text-muted mt-auto">
        <span>{project.donationCount} donation{project.donationCount !== 1 ? 's' : ''}</span>
        {project.targetDate && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {formatDate(project.targetDate)}
          </span>
        )}
      </div>

      <Button size="sm" className="w-full mt-3" onClick={onRecordDonation}>
        Record Donation
      </Button>
    </Card>
  );
}

function ProjectsPageContent() {
  const [isNewProjectOpen, setIsNewProjectOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Project | null>(null);
  const [donationTarget, setDonationTarget] = useState<Project | null>(null);
  const { formatCurrency } = useCurrency();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['finance', 'projects'],
    queryFn: financeApi.getProjects,
  });

  const activeProjects = projects.filter((p) => p.status !== 'archived');
  const totalRaised = projects.reduce((sum, p) => sum + p.raisedAmount, 0);
  const totalTarget = projects.reduce((sum, p) => sum + (p.targetAmount || 0), 0);

  const stats = [
    { label: 'Active Projects', value: activeProjects.length.toLocaleString(), icon: Target },
    { label: 'Total Raised', value: formatCurrency(totalRaised), icon: Wallet },
    { label: 'Combined Goal', value: formatCurrency(totalTarget), icon: TrendingUp },
  ];

  return (
    <div>
      <PageHeader
        title="Projects"
        description="Track mission, building, and other special-fund campaigns"
        actionLabel="New Project"
        actionIcon={Plus}
        onAction={() => setIsNewProjectOpen(true)}
      />

      <StatsGrid stats={stats} />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          title="No Projects Yet"
          description="Create a project to track mission trips, building funds, or other special campaigns."
          icon={Target}
          actionLabel="New Project"
          onAction={() => setIsNewProjectOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <ProjectCard
              key={project._id}
              project={project}
              onRecordDonation={() => setDonationTarget(project)}
              onEdit={() => setEditTarget(project)}
            />
          ))}
        </div>
      )}

      <NewProjectModal isOpen={isNewProjectOpen} onClose={() => setIsNewProjectOpen(false)} />
      <EditProjectModal project={editTarget} onClose={() => setEditTarget(null)} />
      <RecordDonationModal project={donationTarget} onClose={() => setDonationTarget(null)} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <FinanceAccessGuard>
      <ProjectsPageContent />
    </FinanceAccessGuard>
  );
}
