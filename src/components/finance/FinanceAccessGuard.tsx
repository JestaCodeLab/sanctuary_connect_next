'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Link from 'next/link';

interface FinanceAccountStatus {
  status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'revoked';
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
  const [status, setStatus] = useState<FinanceAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/finance/account/status');
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

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

  // Account not started
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
          <p className="text-sm text-gray-700 mb-4">
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

  // Account pending approval
  if (status?.status === 'pending') {
    const submittedDate = status.submittedAt ? new Date(status.submittedAt).toLocaleDateString() : 'Unknown';
    return (
      <Card className="w-full border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5 text-blue-600" />
            Pending Approval
          </CardTitle>
          <CardDescription>
            Your finance account is awaiting superadmin review
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="bg-blue-100 border-blue-300">
            <Clock className="h-4 w-4" />
            <AlertTitle>Under Review</AlertTitle>
            <AlertDescription>
              Your submission was received on {submittedDate}. 
              We typically review submissions within 24-48 hours. 
              You'll receive an email notification once your account is approved or if we need additional information.
            </AlertDescription>
          </Alert>
          <p className="text-xs text-gray-600 mt-4">
            Estimated review time: 24-48 hours
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
  const [status, setStatus] = useState<FinanceAccountStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        setIsLoading(true);
        const response = await fetch('/api/finance/account/status');
        const data = await response.json();
        setStatus(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch status');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, []);

  return { status, isLoading, error };
}
