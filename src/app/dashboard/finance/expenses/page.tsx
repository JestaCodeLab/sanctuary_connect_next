'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Receipt, Plus, Trash2 } from 'lucide-react';

import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { expensesApi } from '@/lib/api';
import { expenseSchema, type ExpenseFormData } from '@/lib/validations';
import BranchField from '@/components/dashboard/BranchField';
import type { Expense } from '@/types';

const categoryOptions = [
  { value: 'utilities', label: 'Utilities' },
  { value: 'salaries', label: 'Salaries' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'supplies', label: 'Supplies' },
  { value: 'transport', label: 'Transport' },
  { value: 'events', label: 'Events' },
  { value: 'other', label: 'Other' },
];

const paymentMethodOptions = [
  { value: 'cash', label: 'Cash' },
  { value: 'check', label: 'Check' },
  { value: 'card', label: 'Card' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'mobile_money', label: 'Mobile Money' },
];

const categoryBadgeVariant: Record<string, 'info' | 'success' | 'warning' | 'error' | 'muted'> = {
  utilities: 'info',
  salaries: 'success',
  maintenance: 'warning',
  supplies: 'muted',
  transport: 'info',
  events: 'success',
  other: 'muted',
};

function formatCurrency(amount: number): string {
  return `GHS ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function ExpensesPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewTarget, setViewTarget] = useState<Expense | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const queryClient = useQueryClient();

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses'],
    queryFn: expensesApi.getAll,
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(expenseSchema) as any,
    defaultValues: {
      amount: undefined,
      category: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      paymentMethod: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: ExpenseFormData) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense recorded successfully');
      reset();
      setIsModalOpen(false);
    },
    onError: () => toast.error('Failed to record expense'),
  });

  const editForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema) as any,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: ExpenseFormData }) => expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense updated successfully');
      setViewTarget(null);
      setIsEditMode(false);
      editForm.reset();
    },
    onError: () => toast.error('Failed to update expense'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => expensesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['finance'] });
      toast.success('Expense deleted');
      setViewTarget(null);
    },
    onError: () => toast.error('Failed to delete expense'),
  });

  const handleView = (expense: Expense) => {
    setViewTarget(expense);
    setIsEditMode(false);
  };

  const handleStartEdit = () => {
    if (!viewTarget) return;
    editForm.reset({
      amount: viewTarget.amount,
      category: viewTarget.category,
      description: viewTarget.description || '',
      date: new Date(viewTarget.date).toISOString().split('T')[0],
      vendor: viewTarget.vendor || '',
      paymentMethod: viewTarget.paymentMethod || '',
    });
    setIsEditMode(true);
  };

  const totalExpenses = expenses.reduce((sum: number, e: Expense) => sum + e.amount, 0);
  const totalCount = expenses.length;

  const now = new Date();
  const thisMonthTotal = expenses
    .filter((e: Expense) => {
      const date = new Date(e.date);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum: number, e: Expense) => sum + e.amount, 0);

  const categoryCounts: Record<string, number> = {};
  expenses.forEach((e: Expense) => {
    categoryCounts[e.category] = (categoryCounts[e.category] || 0) + 1;
  });
  const topCategory = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1])[0];

  const stats = [
    { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: Receipt },
    { label: 'Total Records', value: totalCount.toLocaleString(), icon: Receipt },
    { label: 'This Month', value: formatCurrency(thisMonthTotal), icon: Receipt },
    { label: 'Top Category', value: topCategory ? topCategory[0].charAt(0).toUpperCase() + topCategory[0].slice(1) : '—', icon: Receipt },
  ];

  return (
    <div>
      <PageHeader
        title="Expenses"
        description="Track and manage church expenses"
        actionLabel="Record Expense"
        actionIcon={Plus}
        onAction={() => setIsModalOpen(true)}
      />

      <StatsGrid stats={stats} />

      <Card padding="none">
        <div className="p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Expense Records</h2>
          <p className="text-sm text-muted mt-1">A record of all expenses</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses yet"
            description="Record your first expense to start tracking."
            actionLabel="Record Expense"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Date</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Description</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Amount</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Category</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Vendor</th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((expense: Expense) => (
                  <tr key={expense._id} className="hover:bg-background transition-colors">
                    <td className="px-6 py-4 text-sm text-foreground whitespace-nowrap">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4 text-sm text-foreground max-w-[200px] truncate">
                      {expense.description || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-foreground whitespace-nowrap">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={categoryBadgeVariant[expense.category] || 'muted'}>
                        {expense.category.charAt(0).toUpperCase() + expense.category.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted whitespace-nowrap">{expense.vendor || '—'}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Button variant="ghost" size="sm" onClick={() => handleView(expense)}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Record Expense Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); reset(); }}
        title="Record Expense"
        description="Enter the details of the expense."
        size="lg"
      >
        <form onSubmit={handleSubmit((data) => createMutation.mutate(data))} className="space-y-5">
          <BranchField value={watch('branchId')} onChange={(v) => setValue('branchId', v)} />
          <Input label="Amount" type="number" step="0.01" placeholder="0.00" error={errors.amount?.message} {...register('amount')} />
          <Select label="Category" options={categoryOptions} placeholder="Select category" error={errors.category?.message} {...register('category')} />
          <Input label="Date" type="date" error={errors.date?.message} {...register('date')} />
          <Input label="Vendor" placeholder="Vendor name" error={errors.vendor?.message} {...register('vendor')} />
          <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={errors.paymentMethod?.message} {...register('paymentMethod')} />
          <div className="w-full">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              id="description"
              rows={3}
              placeholder="Describe this expense..."
              className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              {...register('description')}
            />
            {errors.description?.message && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{errors.description.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => { setIsModalOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Record Expense</Button>
          </div>
        </form>
      </Modal>

      {/* View/Edit Expense Modal */}
      <Modal
        isOpen={viewTarget !== null}
        onClose={() => { setViewTarget(null); setIsEditMode(false); editForm.reset(); }}
        title={isEditMode ? 'Edit Expense' : 'Expense Details'}
        size="lg"
      >
        {viewTarget && !isEditMode && (
          <div>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <p className="text-sm text-muted">Date</p>
                <p className="text-foreground font-medium">{formatDate(viewTarget.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Amount</p>
                <p className="text-foreground font-medium">{formatCurrency(viewTarget.amount)}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Category</p>
                <p className="text-foreground capitalize">{viewTarget.category}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Vendor</p>
                <p className="text-foreground">{viewTarget.vendor || '—'}</p>
              </div>
              <div>
                <p className="text-sm text-muted">Payment Method</p>
                <p className="text-foreground capitalize">{viewTarget.paymentMethod?.replace('_', ' ') || '—'}</p>
              </div>
              {viewTarget.approvedBy && (
                <div>
                  <p className="text-sm text-muted">Approved By</p>
                  <p className="text-foreground">{viewTarget.approvedBy.firstName} {viewTarget.approvedBy.lastName}</p>
                </div>
              )}
              {viewTarget.description && (
                <div className="col-span-2">
                  <p className="text-sm text-muted">Description</p>
                  <p className="text-foreground">{viewTarget.description}</p>
                </div>
              )}
            </div>
            <div className="flex justify-between pt-4 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                className="text-red-500 hover:text-red-600 hover:border-red-300"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this expense?')) {
                    deleteMutation.mutate(viewTarget._id);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Delete
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => { setViewTarget(null); setIsEditMode(false); }}>Close</Button>
                <Button onClick={handleStartEdit}>Edit</Button>
              </div>
            </div>
          </div>
        )}
        {viewTarget && isEditMode && (
          <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate({ id: viewTarget._id, data }))} className="space-y-5">
            <Input label="Amount" type="number" step="0.01" error={editForm.formState.errors.amount?.message} {...editForm.register('amount')} />
            <Select label="Category" options={categoryOptions} placeholder="Select category" error={editForm.formState.errors.category?.message} {...editForm.register('category')} />
            <Input label="Date" type="date" error={editForm.formState.errors.date?.message} {...editForm.register('date')} />
            <Input label="Vendor" placeholder="Vendor name" error={editForm.formState.errors.vendor?.message} {...editForm.register('vendor')} />
            <Select label="Payment Method" options={paymentMethodOptions} placeholder="Select payment method" error={editForm.formState.errors.paymentMethod?.message} {...editForm.register('paymentMethod')} />
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
              <textarea rows={3} placeholder="Describe this expense..." className="w-full px-3 py-2 rounded-lg border border-input bg-input-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring" {...editForm.register('description')} />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsEditMode(false)}>Cancel</Button>
              <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
