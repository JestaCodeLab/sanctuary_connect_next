'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/components/ui';
import { AlertCircle, Clock, XCircle, Loader2, Building2 } from 'lucide-react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useBranchStore } from '@/store/branchStore';

interface FinanceAccountStatus {
  status: 'not_started' | 'no_branch_account' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'no_branch_selected';
  message: string;
  rejectionReason?: string;
  revokedReason?: string;
  submittedAt?: string;
}

interface FinanceAccessGuardProps {
  children?: React.ReactNode;
  fallback?: React.ReactNode;
  setupPath?: string;
}

export function FinanceAccessGuard({
  children,
  fallback,
  setupPath = '/finance/setup'
}: FinanceAccessGuardProps) {
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);
  const [status, setStatus] = useState<FinanceAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBranchId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/api/finance/account/status');
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [selectedBranchId]);

  // No specific branch selected ("All Branches") — the finance module requires one
  if (!selectedBranchId) {
    return (
      <Card className="w-full border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-blue-600" />
            Select a Branch
          </CardTitle>
          <CardDescription>
            The finance module is branch-specific
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700">
            Select a specific branch from the branch switcher to access finance features. Each branch has its own finance account.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-600">Loading...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardContent className="pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Account not started — this branch can become the org's primary account
  if (status?.status === 'not_started') {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="mr-2 h-5 w-5 text-yellow-600" />
            Finance Account Setup Required
          </CardTitle>
          <CardDescription>
            You need to complete your merchant account setup before accessing the finance module
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            To use the finance module for payment processing, please complete your merchant account setup.
            This will require your business information, owner details, and bank account information.
          </p>
          <Link href={setupPath}>
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              Start Setup
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // This branch has no finance account, but the org already has a primary
  // elsewhere — hard cut, guide to Finance Settings instead of the KYC wizard.
  if (status?.status === 'no_branch_account') {
    return (
      <Card className="w-full border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Building2 className="mr-2 h-5 w-5 text-yellow-600" />
            Branch Not Set Up
          </CardTitle>
          <CardDescription>
            This branch doesn&apos;t have a finance account yet
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-700 mb-4">
            Your organization already has a primary finance account on another branch. Set up an
            account for this branch from Finance Settings to start collecting payments here.
          </p>
          <Link href="/dashboard/finance/settings">
            <Button className="bg-yellow-600 hover:bg-yellow-700">
              Go to Finance Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Account pending approval - show banner and block access
  if (status?.status === 'pending') {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-red-600" />
            KYC Verification In Progress
          </CardTitle>
          <CardDescription>
            Finance features are unavailable until your KYC is approved
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-red-100 border-red-300">
            <AlertTitle>Awaiting Approval</AlertTitle>
            <AlertDescription>
              Your merchant account application is under review.
              We typically complete reviews within 24-48 hours.
              You'll receive an email notification once your account is approved.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-gray-600 mt-4">
            You can access other modules while we review your application.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Account rejected
  if (status?.status === 'rejected') {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <XCircle className="mr-2 h-5 w-5 text-red-600" />
            Account Rejected
          </CardTitle>
          <CardDescription>
            Your merchant account setup was not approved
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Rejection Reason</AlertTitle>
            <AlertDescription>
              {status.rejectionReason || 'No reason provided'}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-700">
            Please review the rejection reason and correct any issues before resubmitting your application.
          </p>
          <Link href={setupPath}>
            <Button className="bg-red-600 hover:bg-red-700">
              Resubmit Application
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  // Account revoked
  if (status?.status === 'revoked') {
    return (
      <Card className="w-full border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <XCircle className="mr-2 h-5 w-5 text-red-600" />
            Account Revoked
          </CardTitle>
          <CardDescription>
            Your merchant account has been revoked
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Revocation Reason</AlertTitle>
            <AlertDescription>
              {status.revokedReason || 'No reason provided'}
            </AlertDescription>
          </Alert>
          <p className="text-sm text-gray-700">
            Your merchant account has been revoked. Please contact support for more information.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Account approved - render children
  if (status?.status === 'approved') {
    if (children) {
      return <>{children}</>;
    }
    return fallback ? <>{fallback}</> : null;
  }

  // Fallback for unknown status
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unknown Status</AlertTitle>
          <AlertDescription>
            Unable to determine your account status. Please try again later.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

// Hook to get finance account status
export function useFinanceAccountStatus() {
  const selectedBranchId = useBranchStore((s) => s.selectedBranchId);
  const [status, setStatus] = useState<FinanceAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedBranchId) {
      setStatus(null);
      setIsLoading(false);
      return;
    }

    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const { data } = await api.get('/api/finance/account/status');
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [selectedBranchId]);

  return { status, isLoading, error };
}
