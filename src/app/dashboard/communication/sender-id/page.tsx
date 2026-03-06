'use client';

import { useState } from 'react';
import Button from '@/components/ui/Button';
import { PageHeader, EmptyState, Badge } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Phone, Plus, Trash2, Check, X, AlertCircle } from 'lucide-react';

interface SenderId {
  id: string;
  name: string;
  phoneNumber: string;
  status: 'verified' | 'pending' | 'rejected';
  createdAt: string;
}

export default function SenderIdPage() {
  const [senderIds, setSenderIds] = useState<SenderId[]>([
    {
      id: '1',
      name: 'Main Church Line',
      phoneNumber: '+1 (555) 123-4567',
      status: 'verified',
      createdAt: '2025-01-15',
    },
  ]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', phoneNumber: '' });

  const handleAddSenderId = () => {
    if (!formData.name || !formData.phoneNumber) {
      alert('Please fill in all fields');
      return;
    }

    setSenderIds([
      ...senderIds,
      {
        id: Date.now().toString(),
        name: formData.name,
        phoneNumber: formData.phoneNumber,
        status: 'pending',
        createdAt: new Date().toLocaleDateString(),
      },
    ]);

    setFormData({ name: '', phoneNumber: '' });
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this sender ID?')) {
      setSenderIds(senderIds.filter((s) => s.id !== id));
    }
  };

  const getStatusVariant = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'verified':
        return 'success';
      case 'rejected':
        return 'error';
      case 'pending':
        return 'warning';
      default:
        return 'info';
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sender IDs"
        description="Manage phone numbers for sending SMS"
        actionLabel={!showForm ? 'Add Sender ID' : undefined}
        actionIcon={Plus}
        onAction={!showForm ? () => {
          setShowForm(true);
          setFormData({ name: '', phoneNumber: '' });
        } : undefined}
      />

      {showForm && (
        <Card>
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">
              Add New Sender ID
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Main Church Line"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleAddSenderId}
                leftIcon={<Phone className="w-4 h-4" />}
              >
                Add Sender ID
              </Button>
              <Button
                onClick={() => {
                  setShowForm(false);
                  setFormData({ name: '', phoneNumber: '' });
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {senderIds.length === 0 && !showForm ? (
        <EmptyState
          icon={Phone}
          title="No Sender IDs Yet"
          description="Add your first phone number for sending SMS"
        />
      ) : (
        <div className="grid gap-4">
          {senderIds.map((senderId) => (
            <Card key={senderId.id} padding="md">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-light flex items-center justify-center flex-shrink-0">
                      <Phone className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">
                        {senderId.name}
                      </h3>
                      <p className="text-sm text-muted">{senderId.phoneNumber}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <Badge variant={getStatusVariant(senderId.status)}>
                      {senderId.status === 'verified' && <Check className="w-3 h-3 mr-1" />}
                      {senderId.status === 'rejected' && <X className="w-3 h-3 mr-1" />}
                      {senderId.status === 'pending' && <AlertCircle className="w-3 h-3 mr-1" />}
                      {senderId.status.charAt(0).toUpperCase() + senderId.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-muted">
                      Added: {senderId.createdAt}
                    </span>
                  </div>
                </div>
                {senderId.status !== 'verified' && (
                  <button
                    onClick={() => handleDelete(senderId.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-error" />
                  </button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="rounded-lg border border-warning-light bg-warning-light p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Verification Required
          </p>
          <p className="text-sm text-muted mt-1">
            New sender IDs require verification before they can be used to send SMS messages. Check your phone for a verification code.
          </p>
        </div>
      </div>
    </div>
  );
}
