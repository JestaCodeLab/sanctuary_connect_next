'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, Input, Textarea } from '@/components/ui';
import { PageHeader, Modal } from '@/components/dashboard';
import { Send, CheckCircle, AlertCircle, Clock, Lock, RefreshCw } from 'lucide-react';
import { smsApi } from '@/lib/api';
import { useOrganizationStore } from '@/store/organizationStore';
import toast from 'react-hot-toast';

export default function SenderIdPage() {
  const queryClient = useQueryClient();
  const { organization } = useOrganizationStore();
  const [senderName, setSenderName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const currentSenderId = organization?.smsConfig?.senderId;
  const currentStatus = organization?.smsConfig?.senderIdStatus;

  // Fetch system default sender ID
  const { data: systemConfig } = useQuery({
    queryKey: ['sms-system-config'],
    queryFn: () => smsApi.getSystemConfig(),
    staleTime: Infinity, // System config doesn't change
  });

  const defaultSenderId = systemConfig?.defaultSenderId || 'Sanctuary';

  // Check status mutation
  const checkStatusMutation = useMutation({
    mutationFn: () => smsApi.checkSenderIdStatus(currentSenderId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success(`Sender ID status: ${data.status}`);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to check status');
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: () => smsApi.registerSenderId({ senderName, purpose }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      toast.success('Sender ID registered successfully! Status: Pending');
      setSenderName('');
      setPurpose('');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to register sender ID');
    },
  });

  const handleRegister = async () => {
    if (!senderName.trim() || !purpose.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    if (senderName.length > 11) {
      toast.error('Sender ID must be 11 characters or less');
      return;
    }

    registerMutation.mutate();
  };

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return 'text-green-600 dark:text-green-400';
      case 'rejected':
        return 'text-red-600 dark:text-red-400';
      case 'pending':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'rejected':
        return <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Sender ID Management" description="Register and manage your custom SMS sender ID" />

      {/* Active Sender ID Banner */}
      <Card padding="lg" className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
        <div className="flex items-center gap-3 mb-3">
          <Send className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-semibold text-foreground">Currently Active Sender ID</h3>
        </div>
        <p className="text-sm text-muted mb-3">
          All outgoing SMS messages will appear to come from this sender ID on recipient phones.
        </p>
        <div className="bg-white dark:bg-slate-900 rounded-lg p-4">
          <p className="text-2xl font-bold text-foreground">
            {currentStatus?.toLowerCase() === 'approved' && currentSenderId ? currentSenderId : defaultSenderId}
          </p>
          <p className="text-xs text-muted mt-1">
            {currentStatus?.toLowerCase() === 'approved' && currentSenderId
              ? 'Your custom approved sender ID'
              : 'Platform default (until you register and get approval for a custom ID)'}
          </p>
        </div>
      </Card>

      {/* Current Status Card */}
      {currentSenderId && (
        <Card padding="lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-foreground">Registration Status</h3>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={() => checkStatusMutation.mutate()}
              disabled={checkStatusMutation.isPending}
            >
              Refresh Status
            </Button>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
              <div className="flex items-center gap-3">
                {getStatusIcon(currentStatus)}
                <div>
                  <p className="font-medium text-foreground">{currentSenderId}</p>
                  <p className="text-sm text-muted">Registered sender ID</p>
                </div>
              </div>
              <span className={`font-semibold ${getStatusColor(currentStatus)}`}>
                {currentStatus?.charAt(0).toUpperCase()}{currentStatus?.slice(1).toLowerCase()}
              </span>
            </div>

            {currentStatus?.toLowerCase() === 'pending' && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  ⏳ Your sender ID is under review. This typically takes 1-3 business days. Until approved, all SMS will appear from "Sanctuary".
                </p>
              </div>
            )}

            {currentStatus?.toLowerCase() === 'approved' && (
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  ✓ Your sender ID is approved! All SMS messages will now appear from "{currentSenderId}".
                </p>
              </div>
            )}

            {currentStatus?.toLowerCase() === 'rejected' && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-800 dark:text-red-200">
                  ✗ Your sender ID registration was rejected. You can register a new one below.
                </p>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Registration Form */}
      {!currentSenderId || currentStatus?.toLowerCase() === 'rejected' ? (
        <Card padding="lg">
          <h3 className="font-semibold text-foreground mb-4">Register a New Sender ID</h3>

          <div className="space-y-4">
            <div>
              <Input
                label="Sender ID"
                placeholder="Your church name (max 11 characters)"
                maxLength={11}
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                hint={`${senderName.length}/11 characters`}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Purpose</label>
              <Textarea
                placeholder="Why do you need this sender ID? (e.g., 'For sending SMS notifications to church members')"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={handleRegister}
              isLoading={registerMutation.isPending}
            >
              Register Sender ID
            </Button>
          </div>

          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Info:</strong> After registration, BMS Africa will review your request. During this time, all SMS will appear from "Sanctuary". Once approved, they'll appear from your custom sender ID.
            </p>
          </div>
        </Card>
      ) : null}

      {/* Info Section */}
      <Card padding="lg" className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <h3 className="font-semibold text-foreground mb-3">How Sender IDs Work</h3>
        <ul className="space-y-2 text-sm text-muted">
          <li className="flex gap-2">
            <span>•</span>
            <span>Your sender ID is what appears on recipients' phones when they receive SMS from your church</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Each sender ID must be registered and approved by BMS Africa before use</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Approval typically takes 1-3 business days</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>While your custom ID is pending, all SMS will appear from "Sanctuary" (the platform default)</span>
          </li>
          <li className="flex gap-2">
            <span>•</span>
            <span>Once approved, your church's name will appear as the sender on all SMS</span>
          </li>
        </ul>
      </Card>
    </div>
  );
}
