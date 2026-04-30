'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, CheckCircle, XCircle, Eye, AlertCircle } from 'lucide-react';

interface FinanceAccount {
  _id: string;
  status: string;
  businessName: string;
  ownerFullName: string;
  ownerEmail: string;
  submittedAt: string;
  organizationId: {
    _id: string;
    churchName: string;
  };
  submittedBy: {
    firstName: string;
    lastName: string;
    email: string;
  };
}

interface AccountDetails extends FinanceAccount {
  businessType: string;
  businessRegistration: string;
  businessAddress: string;
  taxId: string;
  ownerPhone: string;
  ownerIdType: string;
  ownerIdNumber: string;
  bankCode: string;
  bankAccountName: string;
  bankAccountNumber: string;
  accountType: string;
  paystackMerchantId?: string;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy: { firstName: string; lastName: string; email: string };
    notes: string;
  }>;
}

export default function FinanceApprovalsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetails | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const fetchAccounts = async (pageNum = 1, status = 'pending') => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/superadmin/finance-accounts?status=${status}&page=${pageNum}&limit=${limit}`
      );
      const data = await response.json();
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch accounts');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountDetails = async (accountId: string) => {
    try {
      const response = await fetch(`/api/superadmin/finance-accounts/${accountId}`);
      const data = await response.json();
      setSelectedAccount(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch account details');
    }
  };

  const handleApprove = async () => {
    if (!selectedAccount) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/superadmin/finance-accounts/${selectedAccount._id}/approve`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ notes: approveNotes }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve account');
      }

      setIsApproveOpen(false);
      setApproveNotes('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve account');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedAccount || !rejectionReason.trim()) {
      setError('Rejection reason is required');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(
        `/api/superadmin/finance-accounts/${selectedAccount._id}/reject`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rejectionReason }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to reject account');
      }

      setIsRejectOpen(false);
      setRejectionReason('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject account');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchAccounts(1, statusFilter);
  }, [statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 text-red-800">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Account Approvals</h1>
        <p className="text-gray-600 mt-1">Review and approve merchant account setups</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Submissions</CardTitle>
              <CardDescription>
                Review merchant account setup requests
              </CardDescription>
            </div>
            <SelectRoot value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </SelectRoot>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No accounts found</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Owner</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((account) => (
                      <TableRow key={account._id}>
                        <TableCell className="font-semibold">
                          {account.organizationId?.churchName}
                        </TableCell>
                        <TableCell>{account.businessName}</TableCell>
                        <TableCell>{account.ownerFullName}</TableCell>
                        <TableCell className="text-sm">{account.ownerEmail}</TableCell>
                        <TableCell>{getStatusBadge(account.status)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(account.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Dialog open={isDetailsOpen && selectedAccount?._id === account._id} onOpenChange={setIsDetailsOpen}>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchAccountDetails(account._id)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                              {selectedAccount && (
                                <div>
                                  <DialogHeader>
                                    <DialogTitle>{selectedAccount.businessName}</DialogTitle>
                                    <DialogDescription>
                                      From: {selectedAccount.organizationId?.churchName}
                                    </DialogDescription>
                                  </DialogHeader>

                                  <div className="grid grid-cols-2 gap-4 mt-6">
                                    <div>
                                      <p className="text-sm text-gray-600">Business Type</p>
                                      <p className="font-semibold capitalize">{selectedAccount.businessType}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Business Registration</p>
                                      <p className="font-semibold">{selectedAccount.businessRegistration}</p>
                                    </div>
                                    <div className="col-span-2">
                                      <p className="text-sm text-gray-600">Business Address</p>
                                      <p className="font-semibold">{selectedAccount.businessAddress}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Tax ID</p>
                                      <p className="font-semibold">{selectedAccount.taxId}</p>
                                    </div>

                                    <div>
                                      <p className="text-sm text-gray-600">Owner Phone</p>
                                      <p className="font-semibold">{selectedAccount.ownerPhone}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Owner ID Type</p>
                                      <p className="font-semibold capitalize">{selectedAccount.ownerIdType}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Owner ID Number</p>
                                      <p className="font-semibold">{selectedAccount.ownerIdNumber}</p>
                                    </div>

                                    <div>
                                      <p className="text-sm text-gray-600">Bank Account Number</p>
                                      <p className="font-semibold">{selectedAccount.bankAccountNumber}</p>
                                    </div>
                                    <div>
                                      <p className="text-sm text-gray-600">Account Holder Name</p>
                                      <p className="font-semibold">{selectedAccount.bankAccountName}</p>
                                    </div>
                                  </div>

                                  {selectedAccount.status === 'pending' && (
                                    <div className="flex gap-2 mt-6 pt-6 border-t">
                                      <Dialog open={isApproveOpen} onOpenChange={setIsApproveOpen}>
                                        <DialogTrigger asChild>
                                          <Button className="flex-1 bg-green-600 hover:bg-green-700">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Approve
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Approve Finance Account</DialogTitle>
                                            <DialogDescription>
                                              Approve {selectedAccount.businessName} for {selectedAccount.organizationId?.churchName}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="approveNotes">Approval Notes (Optional)</Label>
                                              <Textarea
                                                id="approveNotes"
                                                placeholder="Add any notes about this approval..."
                                                value={approveNotes}
                                                onChange={(e) => setApproveNotes(e.target.value)}
                                              />
                                            </div>
                                            <Button
                                              onClick={handleApprove}
                                              disabled={isProcessing}
                                              className="w-full bg-green-600 hover:bg-green-700"
                                            >
                                              {isProcessing ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                  Approving...
                                                </>
                                              ) : (
                                                'Confirm Approval'
                                              )}
                                            </Button>
                                          </div>
                                        </DialogContent>
                                      </Dialog>

                                      <Dialog open={isRejectOpen} onOpenChange={setIsRejectOpen}>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive" className="flex-1">
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Reject
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Reject Finance Account</DialogTitle>
                                            <DialogDescription>
                                              Reject {selectedAccount.businessName} for {selectedAccount.organizationId?.churchName}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <div>
                                              <Label htmlFor="rejectionReason">Rejection Reason *</Label>
                                              <Textarea
                                                id="rejectionReason"
                                                placeholder="Provide a detailed reason for rejection..."
                                                value={rejectionReason}
                                                onChange={(e) => setRejectionReason(e.target.value)}
                                                required
                                              />
                                            </div>
                                            <Button
                                              onClick={handleReject}
                                              disabled={isProcessing || !rejectionReason.trim()}
                                              variant="destructive"
                                              className="w-full"
                                            >
                                              {isProcessing ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                  Rejecting...
                                                </>
                                              ) : (
                                                'Confirm Rejection'
                                              )}
                                            </Button>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-gray-600">
                  Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => (p * limit < total ? p + 1 : p))}
                    disabled={page * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
