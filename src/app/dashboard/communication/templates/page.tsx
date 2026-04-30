'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Button from '@/components/ui/button';
import { PageHeader, EmptyState } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Mail, Plus, Trash2, Edit2, Copy, Loader2 } from 'lucide-react';
import { smsApi } from '@/lib/api';
import toast from 'react-hot-toast';

interface Template {
  _id: string;
  name: string;
  message: string;
  description?: string;
  category: string;
  variables?: string[];
  usageCount?: number;
  createdAt?: string;
}

export default function TemplatesPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', message: '', description: '', category: 'general' });

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: async () => {
      console.log('Fetching templates from API...');
      const result = await smsApi.getTemplates();
      console.log('Templates fetched:', result);
      return result;
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      console.log('createMutation.mutationFn called with:', data);
      return smsApi.createTemplate(data);
    },
    onSuccess: () => {
      console.log('createMutation succeeded');
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('Template created successfully');
      handleCancel();
    },
    onError: (error: any) => {
      console.error('Create template error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create template';
      toast.error(errorMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => smsApi.updateTemplate(editingId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('Template updated successfully');
      handleCancel();
    },
    onError: (error: any) => {
      console.error('Update template error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to update template';
      toast.error(errorMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => smsApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error: any) => {
      console.error('Delete template error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to delete template';
      toast.error(errorMsg);
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => smsApi.duplicateTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-templates'] });
      toast.success('Template duplicated successfully');
    },
    onError: (error: any) => {
      console.error('Duplicate template error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to duplicate template';
      toast.error(errorMsg);
    },
  });

  const handleAddTemplate = () => {
    console.log('handleAddTemplate called with formData:', formData);
    
    if (!formData.name || !formData.message) {
      toast.error('Please fill in name and message');
      return;
    }

    if (formData.message.length > 160) {
      toast.error('Message cannot exceed 160 characters');
      return;
    }

    console.log('Validation passed, calling mutation...');
    if (editingId) {
      console.log('Updating template:', editingId);
      updateMutation.mutate(formData);
    } else {
      console.log('Creating new template with data:', formData);
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (template: Template) => {
    setFormData({
      name: template.name,
      message: template.message,
      description: template.description || '',
      category: template.category,
    });
    setEditingId(template._id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDuplicate = (id: string) => {
    duplicateMutation.mutate(id);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', message: '', description: '', category: 'general' });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="SMS Templates"
        description="Create and manage reusable message templates"
        actionLabel={!showForm ? 'New Template' : undefined}
        actionIcon={Plus}
        onAction={!showForm ? () => {
          setShowForm(true);
          setEditingId(null);
          setFormData({ name: '', message: '', description: '', category: 'general' });
        } : undefined}
      />

      {showForm && (
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              {editingId ? 'Edit Template' : 'Create New Template'}
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Welcome Message"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Message Content * ({formData.message.length}/160)
              </label>
              <textarea
                value={formData.message}
                onChange={(e) =>
                  setFormData({ ...formData, message: e.target.value.slice(0, 160) })
                }
                placeholder="Type your message template... Use {{firstName}}, {{lastName}}, {{churchName}} for variables"
                rows={4}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none font-mono text-sm"
              />
              <p className="text-xs text-muted mt-2">
                Variables: {'{{firstName}}, {{lastName}}, {{churchName}}'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Description
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description for this template"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="general">General</option>
                <option value="announcement">Announcement</option>
                <option value="event_reminder">Event Reminder</option>
                <option value="event_confirmation">Event Confirmation</option>
                <option value="birthday">Birthday</option>
                <option value="thank_you">Thank You</option>
                <option value="invitation">Invitation</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddTemplate}
                leftIcon={editingId ? undefined : <Mail className="w-4 h-4" />}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingId ? (
                  'Update Template'
                ) : (
                  'Create Template'
                )}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : templates.length === 0 && !showForm ? (
        <EmptyState
          icon={Mail}
          title="No Templates Yet"
          description="Create your first SMS template to get started"
        />
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template._id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground">{template.name}</h3>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                      {template.category}
                    </span>
                  </div>
                  {template.description && (
                    <p className="text-sm text-muted mt-1">{template.description}</p>
                  )}
                  <p className="text-sm text-muted mt-2 break-words font-mono bg-muted/20 p-2 rounded">
                    {template.message}
                  </p>
                  {template.variables && template.variables.length > 0 && (
                    <p className="text-xs text-muted mt-2">
                      Variables: {template.variables.join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-3">
                    Created: {new Date(template.createdAt!).toLocaleDateString()} • Used {template.usageCount} times
                  </p>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleDuplicate(template._id)}
                    disabled={duplicateMutation.isPending}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Duplicate template"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit template"
                  >
                    <Edit2 className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => handleDelete(template._id)}
                    disabled={deleteMutation.isPending}
                    className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete template"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
