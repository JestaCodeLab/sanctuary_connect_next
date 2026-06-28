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
import { Loader2, CheckCircle, XCircle, Eye, AlertCircle, FileText, Lock, Trash2, Search, Filter, ChevronDown, X } from 'lucide-react';
import toast from 'react-hot-toast';

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
      setAccounts(data.accounts || []);
      setTotal(data.total || 0);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch accounts';
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
      setSelectedAccount(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch account details';
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

      toast.success(`${selectedAccount.businessName} approved successfully`);
      setIsApproveOpen(false);
      setApproveNotes('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve account';
      setError(msg);
      toast.error(msg);
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

      toast.success(`${selectedAccount.businessName} rejected`);
      setIsRejectOpen(false);
      setRejectionReason('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject account';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRevoke = async () => {
    if (!selectedAccount || !revokeReason.trim()) {
      setError('Revocation reason is required');
      return;
    }

    try {
      setIsProcessing(true);
      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/revoke`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ reason: revokeReason }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to revoke account');
      }

      toast.success(`${selectedAccount.businessName} revoked`);
      setIsRevokeOpen(false);
      setRevokeReason('');
      fetchAccounts(page, statusFilter);
      setIsDetailsOpen(false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke account';
      setError(msg);
      toast.error(msg);
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

      toast.success('Paystack setup completed');
      setIsSetupPaystackOpen(false);
      fetchAccountDetails(selectedAccount._id);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to setup Paystack';
      setError(msg);
      toast.error(msg);
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
      fetchAccounts(1, statusFilter, '');
    } else {
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
        return <Badge className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300">Rejected</Badge>;
      case 'revoked':
        return <Badge className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300">Revoked</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-l-4 border-l-amber-500';
      case 'approved':
        return 'border-l-4 border-l-green-500';
      case 'rejected':
        return 'border-l-4 border-l-red-500';
      case 'revoked':
        return 'border-l-4 border-l-purple-500';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Finance Account Approvals</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Review and manage merchant account applications</p>
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters Card */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Filter Applications</CardTitle>
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
              {total} {total === 1 ? 'result' : 'results'}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            {/* Search */}
            <div className="sm:col-span-2 relative group">
              <label className="block text-sm text-gray-600 dark:text-gray-400 font-medium mb-2">Search</label>
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-gray-600 dark:group-focus-within:text-gray-300 transition-colors" />
              <Input
                placeholder="Business, owner, or church name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-12 py-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-300 dark:focus:border-blue-600"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  title="Clear search"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <div className="relative">
              <label className="block text-sm text-gray-600 dark:text-gray-400 font-medium mb-2 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Status
              </label>
              <SelectRoot
                value={statusFilter}
                onValueChange={(status) => {
                  setStatusFilter(status);
                  setPage(1);
                }}
              >
                <SelectTrigger className="py-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:bg-white dark:focus:bg-gray-800 focus:border-blue-300 dark:focus:border-blue-600">
                  <span className={`text-sm font-medium ${
                    statusFilter === 'pending' ? 'text-amber-700 dark:text-amber-300' :
                    statusFilter === 'approved' ? 'text-green-700 dark:text-green-300' :
                    statusFilter === 'rejected' ? 'text-red-700 dark:text-red-300' :
                    statusFilter === 'revoked' ? 'text-purple-700 dark:text-purple-300' :
                    'text-gray-700 dark:text-gray-300'
                  }`}>
                    {statusFilter === 'pending' && '🟡 Pending'}
                    {statusFilter === 'approved' && '🟢 Approved'}
                    {statusFilter === 'rejected' && '🔴 Rejected'}
                    {statusFilter === 'revoked' && '🟣 Revoked'}
                    {statusFilter === 'all' && '⚪ All'}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">🟡 Pending Only</SelectItem>
                  <SelectItem value="approved">🟢 Approved Only</SelectItem>
                  <SelectItem value="rejected">🔴 Rejected Only</SelectItem>
                  <SelectItem value="revoked">🟣 Revoked Only</SelectItem>
                  <SelectItem value="all">⚪ All Applications</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(searchQuery || statusFilter !== 'pending') && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wide">Active Filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('pending');
                    setPage(1);
                  }}
                  className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                >
                  Reset All
                </button>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {searchQuery && (
                  <span className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-200 dark:border-blue-800">
                    <Search className="h-3 w-3" />
                    "{searchQuery}"
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setPage(1);
                      }}
                      className="ml-1 hover:bg-blue-100 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
                {statusFilter !== 'pending' && (
                  <span className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 px-3 py-1.5 rounded-full text-xs font-medium border border-purple-200 dark:border-purple-800">
                    <Filter className="h-3 w-3" />
                    {statusFilter === 'all' ? 'All' : statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
                    <button
                      onClick={() => {
                        setStatusFilter('pending');
                        setPage(1);
                      }}
                      className="ml-1 hover:bg-purple-100 dark:hover:bg-purple-800 rounded p-0.5 transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Applications</CardTitle>
              <CardDescription>
                {total} {total === 1 ? 'application' : 'applications'} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No applications found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => (
                <div
                  key={account._id}
                  className={`p-4 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 transition-colors ${getStatusColor(account.status)}`}
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {/* Church & Business */}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">CHURCH</p>
                      <p className="font-semibold text-sm truncate">{account.organizationId?.churchName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{account.businessName}</p>
                    </div>

                    {/* Owner Info */}
                    <div className="min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">OWNER</p>
                      <p className="font-semibold text-sm truncate">{account.ownerFullName}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{account.ownerEmail}</p>
                    </div>

                    {/* Status & Date */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">STATUS</p>
                      <div className="mt-1">{getStatusBadge(account.status)}</div>
                    </div>

                    {/* Submitted Date */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">SUBMITTED</p>
                      <p className="font-semibold text-sm">{formatDate(account.submittedAt)}</p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsDetailsOpen(true);
                        setSelectedAccount(null);
                        fetchAccountDetails(account._id);
                      }}
                      className="text-blue-600 dark:text-blue-400"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>

                    {account.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => {
                            setIsDetailsOpen(true);
                            setSelectedAccount(null);
                            fetchAccountDetails(account._id);
                            setTimeout(() => setIsApproveOpen(true), 100);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => {
                            setIsDetailsOpen(true);
                            setSelectedAccount(null);
                            fetchAccountDetails(account._id);
                            setTimeout(() => setIsRejectOpen(true), 100);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </>
                    )}

                    {account.status === 'approved' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 dark:text-red-400"
                        onClick={() => {
                          setIsDetailsOpen(true);
                          setSelectedAccount(null);
                          fetchAccountDetails(account._id);
                          setTimeout(() => setIsRevokeOpen(true), 100);
                        }}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Revoke
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * limit >= total}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      <Dialog open={isDetailsOpen} onOpenChange={(open) => {
        setIsDetailsOpen(open);
        if (!open) {
          setSelectedAccount(null);
          setIsApproveOpen(false);
          setIsRejectOpen(false);
          setIsRevokeOpen(false);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 flex flex-col">
          {selectedAccount && (
            <>
              {/* Header - Fixed */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{selectedAccount.businessName}</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedAccount.organizationId?.churchName}</p>
                  </div>
                  <div className="ml-4 flex items-center gap-3 flex-shrink-0">
                    {getStatusBadge(selectedAccount.status)}
                    <button
                      onClick={() => setIsDetailsOpen(false)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                      title="Close"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
                {/* Business Information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Business Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Business Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedAccount.businessType?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Registration Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.businessRegistration}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Address</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.businessAddress}</p>
                    </div>
                  </div>
                </section>

                {/* Owner Information */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Owner Information</h3>
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Full Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.ownerFullName}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Email</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{selectedAccount.ownerEmail}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Phone</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.ownerPhone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">ID Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedAccount.ownerIdType?.replace(/_/g, ' ')}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">ID Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedAccount.ownerIdNumber}</p>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Bank Account */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Bank Account</h3>
                  <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Bank Name</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{banks.find((b) => b.code === selectedAccount.bankCode)?.name || selectedAccount.bankCode}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Number</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedAccount.bankAccountNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Type</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedAccount.accountType}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Holder</p>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.bankAccountName}</p>
                    </div>
                  </div>
                </section>

                {/* Documents */}
                <section>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Documents</h3>
                  <div className="space-y-2">
                    {selectedAccount.businessRegistrationDoc ? (
                      <a
                        href={selectedAccount.businessRegistrationDoc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">Business Registration Document</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Business Registration Document - Not available</span>
                      </div>
                    )}
                    {selectedAccount.ownerIdDoc ? (
                      <a
                        href={selectedAccount.ownerIdDoc}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm font-medium">Owner ID Document</span>
                      </a>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Owner ID Document - Not available</span>
                      </div>
                    )}
                  </div>
                </section>

                {/* Status History */}
                {selectedAccount.statusHistory && selectedAccount.statusHistory.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Status History</h3>
                    <div className="space-y-2">
                      {selectedAccount.statusHistory.map((entry, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold text-sm text-gray-900 dark:text-white capitalize">{entry.status}</span>
                            <span className="text-xs text-gray-600 dark:text-gray-400">{formatDate(entry.changedAt)}</span>
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">By: {entry.changedBy?.firstName} {entry.changedBy?.lastName}</p>
                          {entry.notes && <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">{entry.notes}</p>}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Paystack Status */}
                {selectedAccount.status === 'approved' && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Paystack Setup</h3>
                    {selectedAccount.paystackMerchantId ? (
                      <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-green-900 dark:text-green-200">Setup Complete</p>
                          <p className="text-xs text-green-800 dark:text-green-300 mt-1 font-mono">{selectedAccount.paystackMerchantId}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-amber-900 dark:text-amber-200">Not Set Up</p>
                          <p className="text-xs text-amber-800 dark:text-amber-300">Paystack subaccount not created</p>
                        </div>
                        <Dialog open={isSetupPaystackOpen} onOpenChange={setIsSetupPaystackOpen}>
                          <DialogTrigger asChild>
                            <Button size="sm">Setup</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Setup Paystack Subaccount</DialogTitle>
                              <DialogDescription>Create Paystack merchant account</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Create a Paystack merchant subaccount using the submitted bank details.
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
                  </section>
                )}
              </div>

              {/* Action Buttons - Fixed Footer */}
              <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap gap-2 flex-shrink-0">
                {selectedAccount.status === 'pending' && (
                  <>
                    <Dialog open={isApproveOpen} onOpenChange={(open) => {
                      setIsApproveOpen(open);
                      if (!open) setApproveNotes('');
                    }}>
                      <DialogTrigger asChild>
                        <Button className="flex-1 bg-green-600 hover:bg-green-700" disabled={isProcessing}>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Approve
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Approve Account</DialogTitle>
                          <DialogDescription>
                            Approve {selectedAccount.businessName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Approval Notes (Optional)</Label>
                            <Textarea
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
                        <Button className="flex-1" variant="destructive" disabled={isProcessing}>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reject
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Reject Account</DialogTitle>
                          <DialogDescription>
                            Reject {selectedAccount.businessName}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label>Rejection Reason *</Label>
                            <Textarea
                              placeholder="Provide a detailed reason for rejection..."
                              value={rejectionReason}
                              onChange={(e) => setRejectionReason(e.target.value)}
                              required
                            />
                          </div>
                          <Button
                            onClick={handleReject}
                            disabled={isProcessing || !rejectionReason.trim()}
                            className="w-full"
                            variant="destructive"
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
                      <Button className="flex-1" variant="destructive" disabled={isProcessing}>
                        <Lock className="h-4 w-4 mr-2" />
                        Revoke Access
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Revoke Access</DialogTitle>
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
                          <Label>Revocation Reason *</Label>
                          <Textarea
                            placeholder="Provide reason for revoking access..."
                            value={revokeReason}
                            onChange={(e) => setRevokeReason(e.target.value)}
                            required
                          />
                        </div>
                        <Button
                          onClick={handleRevoke}
                          disabled={isProcessing || !revokeReason.trim()}
                          className="w-full"
                          variant="destructive"
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
    </div>
  );
}
