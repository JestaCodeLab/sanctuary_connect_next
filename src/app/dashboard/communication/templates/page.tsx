'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { PageHeader, EmptyState } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Mail, Plus, Trash2, Edit2 } from 'lucide-react';

interface Template {
  id: string;
  name: string;
  content: string;
  createdAt: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', content: '' });

  const handleAddTemplate = () => {
    if (!formData.name || !formData.content) {
      alert('Please fill in all fields');
      return;
    }

    if (editingId) {
      setTemplates(
        templates.map((t) =>
          t.id === editingId
            ? { ...t, name: formData.name, content: formData.content }
            : t
        )
      );
      setEditingId(null);
    } else {
      setTemplates([
        ...templates,
        {
          id: Date.now().toString(),
          name: formData.name,
          content: formData.content,
          createdAt: new Date().toLocaleDateString(),
        },
      ]);
    }

    setFormData({ name: '', content: '' });
    setShowForm(false);
  };

  const handleEdit = (template: Template) => {
    setFormData({ name: template.name, content: template.content });
    setEditingId(template.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      setTemplates(templates.filter((t) => t.id !== id));
    }
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
          setFormData({ name: '', content: '' });
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
                Template Name
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
                Message Content
              </label>
              <textarea
                value={formData.content}
                onChange={(e) =>
                  setFormData({ ...formData, content: e.target.value })
                }
                placeholder="Type your message template..."
                rows={5}
                maxLength={160}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
              />
              <p className="text-xs text-muted mt-2">
                {formData.content.length}/160 characters
              </p>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddTemplate}
                leftIcon={<Mail className="w-4 h-4" />}
              >
                {editingId ? 'Update' : 'Create'} Template
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setFormData({ name: '', content: '' });
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {templates.length === 0 && !showForm ? (
        <EmptyState
          icon={Mail}
          title="No Templates Yet"
          description="Create your first SMS template to get started"
        />
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{template.name}</h3>
                  <p className="text-sm text-muted mt-2 break-words">{template.content}</p>
                  <p className="text-xs text-muted mt-3">
                    Created: {template.createdAt}
                  </p>
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleEdit(template)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-muted" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-error" />
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
