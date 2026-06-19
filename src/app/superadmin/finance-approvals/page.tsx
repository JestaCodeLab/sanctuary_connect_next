'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Textarea,
  Alert,
  AlertDescription,
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui';
import { Loader2, CheckCircle, XCircle, Eye, AlertCircle, FileText, Lock, Trash2 } from 'lucide-react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Helper function to get auth headers
const getAuthHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

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
  businessRegistrationDoc?: string;
  businessAddress: string;
  ownerPhone: string;
  ownerIdType: string;
  ownerIdNumber: string;
  ownerIdDoc?: string;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeReason, setRevokeReason] = useState('');
  const [isSetupPaystackOpen, setIsSetupPaystackOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const limit = 10;

  const fetchAccounts = async (pageNum = 1, status = 'pending', search = '') => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();

      // Only add status if it's not 'all'
      if (status && status !== 'all') {
        params.append('status', status);
      }

      params.append('page', String(pageNum));
      params.append('limit', String(limit));

      if (search.trim()) {
        params.append('search', search.trim());
      }

      const url = `${API_BASE_URL}/api/superadmin/finance-accounts?${params.toString()}`;
      const response = await fetch(url, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('Accounts fetched:', {
        count: data.accounts?.length || 0,
        total: data.total,
        status: status,
        search: search,
        accounts: data.accounts
      });
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch accounts';
      console.error('Error fetching accounts:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAccountDetails = async (accountId: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/superadmin/finance-accounts/${accountId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch account details`);
      }

      const data = await response.json();
      console.log('Account details fetched:', {
        id: data._id,
        status: data.status,
        businessName: data.businessName,
        businessRegistrationDoc: data.businessRegistrationDoc,
        ownerIdDoc: data.ownerIdDoc,
        fullData: data
      });

      setSelectedAccount(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account details';
      console.error('Error fetching account details:', err);
      setError(errorMessage);
    }
  };

  const handleApprove = async () => {
    if (!selectedAccount) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/approve`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
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
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/reject`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
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

  const handleRevoke = async () => {
    if (!selectedAccount || !revokeReason.trim()) {
      setError('Revoke reason is required');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/revoke`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ revokedReason: revokeReason }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke account');
      }

      setIsRevokeOpen(false);
      setRevokeReason('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke account');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSetupPaystack = async () => {
    if (!selectedAccount) return;

    try {
      setIsProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/setup-paystack`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to setup Paystack');
      }

      setIsSetupPaystackOpen(false);
      fetchAccountDetails(selectedAccount._id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup Paystack');
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch on status filter change
  useEffect(() => {
    fetchAccounts(1, statusFilter, searchQuery);
  }, [statusFilter]);

  // Debounced fetch on search query change
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (searchQuery === '') {
      // If search is cleared, fetch immediately
      fetchAccounts(1, statusFilter, '');
    } else {
      // If search has content, debounce
      searchDebounceRef.current = setTimeout(() => {
        fetchAccounts(1, statusFilter, searchQuery);
      }, 500);
    }

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  // Initial fetch on mount
  useEffect(() => {
    fetchAccounts(1, statusFilter, '');
  }, []);

  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/finance/banks`, {
          method: 'GET',
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: Failed to fetch banks`);
        }

        const data = await response.json();
        setBanks(data.banks || []);
      } catch (err) {
        console.error('Failed to fetch banks:', err);
      }
    };
    fetchBanks();
  }, []);

  useEffect(() => {
    if (error) {
      if (errorTimeout) clearTimeout(errorTimeout);
      const timeout = setTimeout(() => setError(null), 5000);
      setErrorTimeout(timeout);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-yellow-50 dark:bg-yellow-950/30 text-yellow-800 dark:text-yellow-300">Pending</Badge>;
      case 'approved':
        return <Badge variant="outline" className="bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300">Rejected</Badge>;
      case 'revoked':
        return <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-300">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Finance Account Approvals</h1>
        <p className="text-gray-600 dark:text-gray-400 dark:text-gray-400 mt-1">Review and approve merchant account setups</p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              Review merchant account setup requests
            </CardDescription>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <Input
              placeholder="Search by business name, email, or church..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="flex-1"
            />
            <SelectRoot value={statusFilter} onValueChange={(status) => {
              setStatusFilter(status);
              setPage(1);
            }}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="revoked">Revoked</SelectItem>
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
              <p className="text-gray-500 dark:text-gray-500">No accounts found</p>
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
                        <TableCell className="text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-9 h-9 p-0 hover:bg-blue-100 dark:hover:bg-blue-900"
                            title="View details"
                            onClick={() => {
                              console.log('Eye button clicked for account:', account._id);
                              setIsDetailsOpen(true);
                              setSelectedAccount(null); // Reset to force re-fetch
                              fetchAccountDetails(account._id);
                            }}
                          >
                            <Eye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="sr-only">View</span>
                          </Button>

                          <Dialog open={isDetailsOpen && selectedAccount?._id === account._id} onOpenChange={(open) => {
                            setIsDetailsOpen(open);
                            if (!open) {
                              setSelectedAccount(null);
                            }
                          }}>
                            <DialogContent className="max-w-2xl flex flex-col max-h-[90vh] p-0">
                              {selectedAccount && (
                                <>
                                  {/* Header */}
                                  <div className="border-b px-6 py-4">
                                    <h2 className="text-lg font-bold text-gray-900 dark:text-white">{selectedAccount.businessName}</h2>
                                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                      {selectedAccount.organizationId?.churchName}
                                    </p>
                                    <div className="mt-3 flex items-center gap-2">
                                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                                        selectedAccount.status === 'pending' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' :
                                        selectedAccount.status === 'approved' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                        selectedAccount.status === 'rejected' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                        'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                                      }`}>
                                        {selectedAccount.status.charAt(0).toUpperCase() + selectedAccount.status.slice(1)}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Scrollable Content */}
                                  <div className="overflow-y-auto flex-1 space-y-6 px-6 py-4">
                                    {/* Business Details */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Business Details</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Business Type</p>
                                          <p className="font-semibold capitalize">{selectedAccount.businessType}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Registration</p>
                                          <p className="font-semibold">{selectedAccount.businessRegistration}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Address</p>
                                          <p className="font-semibold">{selectedAccount.businessAddress}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Owner Details */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Owner Information</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="col-span-2">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Name</p>
                                          <p className="font-semibold">{selectedAccount.ownerFullName}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Email</p>
                                          <p className="font-semibold text-sm">{selectedAccount.ownerEmail}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Phone</p>
                                          <p className="font-semibold">{selectedAccount.ownerPhone}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">ID Type</p>
                                          <p className="font-semibold capitalize">{selectedAccount.ownerIdType?.replace(/_/g, ' ')}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">ID Number</p>
                                          <p className="font-semibold">{selectedAccount.ownerIdNumber}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Bank Details */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Bank Account</h4>
                                      <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="col-span-2">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Bank</p>
                                          <p className="font-semibold">{banks.find((b) => b.code === selectedAccount.bankCode)?.name || selectedAccount.bankCode}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Account Number</p>
                                          <p className="font-semibold">{selectedAccount.bankAccountNumber}</p>
                                        </div>
                                        <div className="col-span-2">
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Account Holder</p>
                                          <p className="font-semibold">{selectedAccount.bankAccountName}</p>
                                        </div>
                                        <div>
                                          <p className="text-xs text-gray-600 dark:text-gray-400">Account Type</p>
                                          <p className="font-semibold capitalize">{selectedAccount.accountType}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Documents */}
                                    <div>
                                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Documents</h4>
                                      {(!selectedAccount.businessRegistrationDoc?.trim() || !selectedAccount.ownerIdDoc?.trim()) && (
                                        <div className="p-3 mb-3 bg-yellow-50 dark:bg-yellow-950/30 rounded text-yellow-700 dark:text-yellow-300 text-xs">
                                          <p className="font-semibold">Debug Info:</p>
                                          <p>Registration Doc URL: {selectedAccount.businessRegistrationDoc ? '✓ Present' : '✗ Missing'}</p>
                                          <p>ID Doc URL: {selectedAccount.ownerIdDoc ? '✓ Present' : '✗ Missing'}</p>
                                        </div>
                                      )}
                                      <div className="space-y-2">
                                        {selectedAccount.businessRegistrationDoc && selectedAccount.businessRegistrationDoc.trim() ? (
                                          <a
                                            href={selectedAccount.businessRegistrationDoc}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => {
                                              if (!selectedAccount.businessRegistrationDoc?.startsWith('http')) {
                                                e.preventDefault();
                                                alert('Invalid document URL');
                                              }
                                            }}
                                            className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm cursor-pointer transition-colors"
                                          >
                                            <FileText className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">Business Registration Document</span>
                                          </a>
                                        ) : (
                                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded text-gray-500 dark:text-gray-400 text-sm">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Business Registration Document - Not uploaded</span>
                                          </div>
                                        )}
                                        {selectedAccount.ownerIdDoc && selectedAccount.ownerIdDoc.trim() ? (
                                          <a
                                            href={selectedAccount.ownerIdDoc}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => {
                                              if (!selectedAccount.ownerIdDoc?.startsWith('http')) {
                                                e.preventDefault();
                                                alert('Invalid document URL');
                                              }
                                            }}
                                            className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/30 rounded hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-sm cursor-pointer transition-colors"
                                          >
                                            <FileText className="w-4 h-4 flex-shrink-0" />
                                            <span className="truncate">Owner ID Document</span>
                                          </a>
                                        ) : (
                                          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-900/30 rounded text-gray-500 dark:text-gray-400 text-sm">
                                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                                            <span>Owner ID Document - Not uploaded</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Status History */}
                                    {selectedAccount.statusHistory && selectedAccount.statusHistory.length > 0 && (
                                      <div>
                                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Status History</h4>
                                        <div className="space-y-2 text-sm">
                                          {selectedAccount.statusHistory.map((entry, idx) => (
                                            <div key={idx} className="flex items-start gap-3 py-2">
                                              <div className="flex items-center justify-between">
                                                <p className="font-medium text-sm capitalize">{entry.status}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-500">
                                                  {new Date(entry.changedAt).toLocaleDateString()}
                                                </p>
                                              </div>
                                              <p className="text-xs text-gray-600 dark:text-gray-400">{entry.changedBy?.firstName} {entry.changedBy?.lastName}</p>
                                              {entry.notes && <p className="text-xs text-gray-600 dark:text-gray-400 italic mt-1">{entry.notes}</p>}
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}

                                    {/* Paystack Status */}
                                    {selectedAccount.status === 'approved' && (
                                      <div>
                                        <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-3">Paystack Setup</h3>
                                        {selectedAccount.paystackMerchantId ? (
                                          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/30 rounded border border-green-200 dark:border-green-800">
                                            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                            <div>
                                              <p className="font-medium text-sm text-green-900 dark:text-green-300">Setup Complete</p>
                                              <p className="text-xs text-green-700 dark:text-green-400">{selectedAccount.paystackMerchantId}</p>
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 rounded border border-amber-200 dark:border-amber-800">
                                            <div>
                                              <p className="font-medium text-sm text-amber-900 dark:text-amber-300">Not Set Up</p>
                                              <p className="text-xs text-amber-700 dark:text-amber-400">Paystack subaccount not yet created</p>
                                            </div>
                                            <Dialog open={isSetupPaystackOpen} onOpenChange={setIsSetupPaystackOpen}>
                                              <DialogTrigger asChild>
                                                <Button size="sm" className="ml-2">
                                                  Setup Now
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent>
                                                <DialogHeader>
                                                  <DialogTitle>Setup Paystack Subaccount</DialogTitle>
                                                  <DialogDescription>
                                                    Create a Paystack subaccount for {selectedAccount.businessName}
                                                  </DialogDescription>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                  <Alert>
                                                    <AlertCircle className="h-4 w-4" />
                                                    <AlertDescription>
                                                      This will create a Paystack merchant subaccount using the submitted bank details.
                                                    </AlertDescription>
                                                  </Alert>
                                                  <Button
                                                    onClick={handleSetupPaystack}
                                                    disabled={isProcessing}
                                                    className="w-full"
                                                  >
                                                    {isProcessing ? (
                                                      <>
                                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                        Setting up...
                                                      </>
                                                    ) : (
                                                      'Confirm Setup'
                                                    )}
                                                  </Button>
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action Buttons Footer */}
                                  <div className="border-t px-6 py-4 flex gap-2 flex-wrap">
                                    {selectedAccount.status === 'pending' && (
                                      <>
                                        <Dialog open={isApproveOpen} onOpenChange={(open) => {
                                          setIsApproveOpen(open);
                                          if (!open) setApproveNotes('');
                                        }}>
                                          <DialogTrigger asChild>
                                            <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
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

                                        <Dialog open={isRejectOpen} onOpenChange={(open) => {
                                          setIsRejectOpen(open);
                                          if (!open) setRejectionReason('');
                                        }}>
                                          <DialogTrigger asChild>
                                            <Button variant="destructive" className="flex-1 min-w-[120px]">
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
                                      </>
                                    )}

                                    {selectedAccount.status === 'approved' && (
                                      <Dialog open={isRevokeOpen} onOpenChange={(open) => {
                                        setIsRevokeOpen(open);
                                        if (!open) setRevokeReason('');
                                      }}>
                                        <DialogTrigger asChild>
                                          <Button variant="destructive" className="w-full">
                                            <Lock className="h-4 w-4 mr-2" />
                                            Revoke Access
                                          </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                          <DialogHeader>
                                            <DialogTitle>Revoke Finance Access</DialogTitle>
                                            <DialogDescription>
                                              Remove access for {selectedAccount.businessName}
                                            </DialogDescription>
                                          </DialogHeader>
                                          <div className="space-y-4">
                                            <Alert variant="destructive">
                                              <AlertCircle className="h-4 w-4" />
                                              <AlertDescription>
                                                This will revoke finance access and disable their Paystack account.
                                              </AlertDescription>
                                            </Alert>
                                            <div>
                                              <Label htmlFor="revokeReason">Reason for Revocation *</Label>
                                              <Textarea
                                                id="revokeReason"
                                                placeholder="Provide reason for revoking access..."
                                                value={revokeReason}
                                                onChange={(e) => setRevokeReason(e.target.value)}
                                                required
                                              />
                                            </div>
                                            <Button
                                              onClick={handleRevoke}
                                              disabled={isProcessing || !revokeReason.trim()}
                                              variant="destructive"
                                              className="w-full"
                                            >
                                              {isProcessing ? (
                                                <>
                                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                  Revoking...
                                                </>
                                              ) : (
                                                'Confirm Revocation'
                                              )}
                                            </Button>
                                          </div>
                                        </DialogContent>
                                      </Dialog>
                                    )}
                                  </div>
                                </>
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
                <p className="text-sm text-gray-600 dark:text-gray-400">
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
