'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Dialog,
  DialogContent,
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
import { Loader2, CheckCircle, XCircle, AlertCircle, FileText, Lock, Search, Filter, ChevronDown, X, Eye, Check, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

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
  bankAccountType: string;
  tier: 'primary' | 'subaccount';
  paystackKeysAddedAt?: string;
  statusHistory: Array<{
    status: string;
    changedAt: string;
    changedBy: { firstName: string; lastName: string; email: string };
    notes: string;
  }>;
}

// Dropdown Menu Component
function ActionDropdown({ account, onAction }: { account: FinanceAccount; onAction: (action: string) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.right - 192, // w-48 = 192px, align right
      });
    }
  }, [isOpen]);

  return (
    <>
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="w-9 h-9 p-0 flex items-center justify-center"
      >
        <ChevronDown className="h-4 w-4" />
      </Button>

      {isOpen && createPortal(
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div
            className="fixed w-48 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50"
            style={{ top: `${position.top}px`, left: `${position.left}px` }}
          >
            <button
              onClick={() => {
                onAction('details');
                setIsOpen(false);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-2 text-gray-700 dark:text-gray-300 rounded-t-lg"
            >
              <Eye className="h-4 w-4" />
              View Details
            </button>

            {account.status === 'pending' && (
              <>
                <button
                  onClick={() => {
                    onAction('approve');
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-green-50 dark:hover:bg-green-900/20 flex items-center gap-2 text-green-600 dark:text-green-400 border-t border-gray-200 dark:border-gray-700"
                >
                  <Check className="h-4 w-4" />
                  Approve
                </button>
                <button
                  onClick={() => {
                    onAction('reject');
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
                >
                  <Ban className="h-4 w-4" />
                  Reject
                </button>
              </>
            )}

            {account.status === 'approved' && (
              <button
                onClick={() => {
                  onAction('revoke');
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400 border-t border-gray-200 dark:border-gray-700 rounded-b-lg"
              >
                <Lock className="h-4 w-4" />
                Revoke Access
              </button>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

export default function FinanceApprovalsPage() {
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<AccountDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalView, setModalView] = useState<'details' | 'approve' | 'reject' | 'revoke'>('details');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveNotes, setApproveNotes] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const limit = 15;

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
      const payload = { notes: approveNotes };
      console.log('📤 Sending approve request:', {
        accountId: selectedAccount._id,
        payload,
        headers: getAuthHeaders(),
      });

      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/approve`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      console.log('📥 Approve response:', { status: response.status, data: result });

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to approve account');
      }

      toast.success(`${selectedAccount.businessName} approved successfully`);
      setModalView('details');
      setApproveNotes('');
      setIsModalOpen(false);
      fetchAccounts(page, statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to approve account';
      console.error('❌ Approve error:', msg);
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
      const payload = { rejectionReason };
      console.log('📤 Sending reject request:', {
        accountId: selectedAccount._id,
        payload,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/reject`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      console.log('📥 Reject response:', { status: response.status, data: result });

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to reject account');
      }

      toast.success(`${selectedAccount.businessName} rejected`);
      setModalView('details');
      setRejectionReason('');
      setIsModalOpen(false);
      fetchAccounts(page, statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to reject account';
      console.error('❌ Reject error:', msg);
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
      const payload = { revokedReason: revokeReason };
      console.log('📤 Sending revoke request:', {
        accountId: selectedAccount._id,
        payload,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/superadmin/finance-accounts/${selectedAccount._id}/revoke`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();
      console.log('📥 Revoke response:', { status: response.status, data: result });

      if (!response.ok) {
        throw new Error(result.details || result.error || 'Failed to revoke account');
      }

      toast.success(`${selectedAccount.businessName} revoked`);
      setModalView('details');
      setRevokeReason('');
      setIsModalOpen(false);
      fetchAccounts(page, statusFilter);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to revoke account';
      console.error('❌ Revoke error:', msg);
      setError(msg);
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    fetchAccounts(1, statusFilter, searchQuery);
  }, [statusFilter]);

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleActionClick = (account: FinanceAccount, action: string) => {
    setSelectedAccount(null);
    setModalView(action as any);
    setIsModalOpen(true);
    fetchAccountDetails(account._id);
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
                placeholder="Business, director, or church name..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-12 py-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPage(1);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
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
              <SelectRoot value={statusFilter} onValueChange={(s) => { setStatusFilter(s); setPage(1); }}>
                <SelectTrigger className="py-2.5 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">🟡 Pending</SelectItem>
                  <SelectItem value="approved">🟢 Approved</SelectItem>
                  <SelectItem value="rejected">🔴 Rejected</SelectItem>
                  <SelectItem value="revoked">🟣 Revoked</SelectItem>
                  <SelectItem value="all">⚪ All</SelectItem>
                </SelectContent>
              </SelectRoot>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50 dark:bg-gray-900/50">
                  <TableHead className="font-semibold">Business Name</TableHead>
                  <TableHead className="font-semibold">Director</TableHead>
                  <TableHead className="font-semibold">Church</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Submitted</TableHead>
                  <TableHead className="font-semibold text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                        <span className="text-gray-600 dark:text-gray-400">Loading applications...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : accounts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No applications found
                    </TableCell>
                  </TableRow>
                ) : (
                  accounts.map((account) => (
                    <TableRow key={account._id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 border-b border-gray-200 dark:border-gray-800">
                      <TableCell className="font-medium text-gray-900 dark:text-white">{account.businessName}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{account.ownerFullName}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{account.organizationId.churchName}</TableCell>
                      <TableCell>{getStatusBadge(account.status)}</TableCell>
                      <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatDate(account.submittedAt)}</TableCell>
                      <TableCell className="text-right">
                        <ActionDropdown account={account} onAction={(action) => handleActionClick(account, action)} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {total > limit && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled={page * limit >= total} onClick={() => setPage(p => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal - Reuse from before */}
      <Dialog open={isModalOpen} onOpenChange={(open) => {
        setIsModalOpen(open);
        if (!open) {
          setSelectedAccount(null);
          setModalView('details');
          setApproveNotes('');
          setRejectionReason('');
          setRevokeReason('');
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 flex flex-col">
          {selectedAccount && (
            <>
              {/* Header */}
              <div className="sticky top-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex-shrink-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      {modalView !== 'details' && (
                        <button onClick={() => setModalView('details')} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white" title="Back to details">
                          ←
                        </button>
                      )}
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                          {modalView === 'details' && selectedAccount.businessName}
                          {modalView === 'approve' && 'Approve Account'}
                          {modalView === 'reject' && 'Reject Application'}
                          {modalView === 'revoke' && 'Revoke Access'}
                        </h2>
                        {modalView === 'details' && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedAccount.organizationId?.churchName}</p>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {modalView === 'details' && (
                  <div className="space-y-6">
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

                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Director Information</h3>
                      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                        <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Full Name</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.ownerFullName}</p></div>
                        <div className="grid grid-cols-2 gap-6"><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Email</p><p className="text-sm font-semibold text-gray-900 dark:text-white break-all">{selectedAccount.ownerEmail}</p></div><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Phone</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.ownerPhone}</p></div></div>
                        <div className="grid grid-cols-2 gap-6"><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">ID Type</p><p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedAccount.ownerIdType?.replace(/_/g, ' ')}</p></div><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">ID Number</p><p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedAccount.ownerIdNumber}</p></div></div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Bank Account</h3>
                      <div className="bg-gray-50 dark:bg-gray-900/30 rounded-lg p-4 space-y-4">
                        <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Bank Name</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{banks.find((b) => b.code === selectedAccount.bankCode)?.name || selectedAccount.bankCode}</p></div>
                        <div className="grid grid-cols-2 gap-6"><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Number</p><p className="text-sm font-semibold text-gray-900 dark:text-white font-mono">{selectedAccount.bankAccountNumber}</p></div><div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Type</p><p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">{selectedAccount.bankAccountType}</p></div></div>
                        <div><p className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">Account Holder</p><p className="text-sm font-semibold text-gray-900 dark:text-white">{selectedAccount.bankAccountName}</p></div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wide mb-4">Documents</h3>
                      <div className="space-y-2">
                        {selectedAccount.businessRegistrationDoc ? (
                          <a href={selectedAccount.businessRegistrationDoc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">Business Registration Document</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="text-sm">Not available</span></div>
                        )}
                        {selectedAccount.ownerIdDoc ? (
                          <a href={selectedAccount.ownerIdDoc} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 transition-colors">
                            <FileText className="w-4 h-4 flex-shrink-0" />
                            <span className="text-sm font-medium">Director ID Document</span>
                          </a>
                        ) : (
                          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-900/30 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-500 dark:text-gray-400"><AlertCircle className="w-4 h-4 flex-shrink-0" /><span className="text-sm">Not available</span></div>
                        )}
                      </div>
                    </section>
                  </div>
                )}

                {modalView === 'approve' && (
                  <div className="space-y-4">
                    <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800 dark:text-green-300 ml-2">This will grant immediate access to the finance module and payment processing</AlertDescription>
                    </Alert>
                    <div><Label>Approval Notes (Optional)</Label><Textarea placeholder="Add any notes..." value={approveNotes} onChange={(e) => setApproveNotes(e.target.value)} className="mt-2" /></div>
                  </div>
                )}

                {modalView === 'reject' && (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>The merchant will be notified and can resubmit</AlertDescription>
                    </Alert>
                    <div><Label>Rejection Reason *</Label><Textarea placeholder="Provide detailed reason..." value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="mt-2" required /></div>
                  </div>
                )}

                {modalView === 'revoke' && (
                  <div className="space-y-4">
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>This will disable finance access and return the submission to pending status for resubmission</AlertDescription>
                    </Alert>
                    <div><Label>Revocation Reason *</Label><Textarea placeholder="Explain why approval is being revoked..." value={revokeReason} onChange={(e) => setRevokeReason(e.target.value)} className="mt-2" required /></div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 z-10 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex flex-wrap gap-2 flex-shrink-0">
                {modalView === 'details' && selectedAccount.status === 'pending' && (
                  <>
                    <Button onClick={() => setModalView('approve')} className="flex-1 bg-green-600 hover:bg-green-700"><CheckCircle className="h-4 w-4 mr-2" />Approve</Button>
                    <Button onClick={() => setModalView('reject')} className="flex-1" variant="destructive"><Ban className="h-4 w-4 mr-2" />Reject</Button>
                  </>
                )}
                {modalView === 'details' && selectedAccount.status === 'approved' && (
                  <Button onClick={() => setModalView('revoke')} className="flex-1" variant="destructive"><Lock className="h-4 w-4 mr-2" />Revoke</Button>
                )}
                {modalView === 'approve' && (
                  <>
                    <Button variant="outline" onClick={() => setModalView('details')} className="flex-1">Back</Button>
                    <Button onClick={handleApprove} disabled={isProcessing} className="flex-1 bg-green-600 hover:bg-green-700">{isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Approving...</> : 'Confirm Approval'}</Button>
                  </>
                )}
                {modalView === 'reject' && (
                  <>
                    <Button variant="outline" onClick={() => setModalView('details')} className="flex-1">Back</Button>
                    <Button onClick={handleReject} disabled={isProcessing || !rejectionReason.trim()} className="flex-1" variant="destructive">{isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Rejecting...</> : 'Confirm Rejection'}</Button>
                  </>
                )}
                {modalView === 'revoke' && (
                  <>
                    <Button variant="outline" onClick={() => setModalView('details')} className="flex-1">Back</Button>
                    <Button onClick={handleRevoke} disabled={isProcessing || !revokeReason.trim()} className="flex-1" variant="destructive">{isProcessing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Revoking...</> : 'Confirm Revocation'}</Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
