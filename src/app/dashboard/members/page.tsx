'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Users, UserPlus, Search, Trash2, Edit2, Eye, Users2, Calendar, Upload, Download, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader, StatsGrid, Badge, EmptyState, Modal } from '@/components/dashboard';
import { Button, Input, Card } from '@/components/ui';
import { membersApi } from '@/lib/api';
import type { Member } from '@/types';

const statusBadgeVariant: Record<string, 'success' | 'error' | 'info' | 'warning' | 'muted'> = {
  active: 'success',
  inactive: 'error',
  visiting: 'info',
  transferred: 'warning',
};

const statusFilters = ['All', 'Active', 'Inactive', 'Visiting'] as const;

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString();
}

export default function MembersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dateFilterApplied, setDateFilterApplied] = useState<{ startDate: string; endDate: string }>({ startDate: '', endDate: '' });
  
  // Import/Export state
  const [showImportModal, setShowImportModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<Record<string, unknown>[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');
  const [exportPeriod, setExportPeriod] = useState<'all' | 'monthly' | 'custom'>('all');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: members = [], isLoading, refetch } = useQuery({
    queryKey: ['members', dateFilterApplied],
    queryFn: () => {
      const params: { startDate?: string; endDate?: string } = {};
      if (dateFilterApplied.startDate) params.startDate = dateFilterApplied.startDate;
      if (dateFilterApplied.endDate) params.endDate = dateFilterApplied.endDate;
      return membersApi.getAll(Object.keys(params).length > 0 ? params : undefined);
    },
  });

  const handleDateSearch = () => {
    setDateFilterApplied({ startDate, endDate });
  };

  const handleClearDates = () => {
    setStartDate('');
    setEndDate('');
    setDateFilterApplied({ startDate: '', endDate: '' });
  };

  const deleteMutation = useMutation({
    mutationFn: membersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success('Member removed');
      setDeleteId(null);
    },
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: (data: { members: Record<string, unknown>[] }) => membersApi.importMembers(data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      toast.success(result.message);
      setShowImportModal(false);
      setImportFile(null);
      setImportData([]);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || 'Failed to import members');
    },
  });

  // Parse CSV file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImportFile(file);
    
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file must have headers and at least one data row');
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, unknown>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '').trim() || '';
        row[header] = value || null;
      });
      if (row.firstName && row.lastName && row.phone) {
        data.push(row);
      }
    }
    
    setImportData(data);
  };

  // Parse CSV from file
  const parseCSVFile = async (file: File) => {
    setImportFile(file);
    
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      toast.error('CSV file must have headers and at least one data row');
      return;
    }
    
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const data: Record<string, unknown>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g) || [];
      const row: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const value = values[index]?.replace(/"/g, '').trim() || '';
        row[header] = value || null;
      });
      if (row.firstName && row.lastName && row.phone) {
        data.push(row);
      }
    }
    
    setImportData(data);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }
    
    await parseCSVFile(file);
  };

  // Download template
  const handleDownloadTemplate = async () => {
    try {
      const blob = await membersApi.getImportTemplate();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'member-import-template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  // Export members
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const params: { format?: 'csv' | 'pdf'; startDate?: string; endDate?: string; period?: 'monthly' | 'custom' } = {};

      params.format = exportFormat === 'csv' ? 'csv' : 'pdf';

      if (exportPeriod === 'monthly') {
        params.period = 'monthly';
      } else if (exportPeriod === 'custom') {
        if (exportStartDate) params.startDate = exportStartDate;
        if (exportEndDate) params.endDate = exportEndDate;
      }

      const { downloadUrl } = await membersApi.exportMembers(params);

      // Trigger download from the backend-generated file URL
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `members-export-${new Date().toISOString().split('T')[0]}.${params.format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      setShowExportModal(false);
      toast.success('Export successful');
    } catch {
      toast.error('Failed to export members');
    } finally {
      setIsExporting(false);
    }
  };

  // Client-side search and filter
  const filteredMembers = members.filter((member: Member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'All' || member.memberStatus === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Compute stats
  const totalMembers = members.length;
  
  // Gender stats
  const maleCount = members.filter((m: Member) => m.gender === 'male').length;
  const femaleCount = members.filter((m: Member) => m.gender === 'female').length;

  // New this month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const newThisMonth = members.filter(
    (m: Member) => new Date(m.createdAt) >= startOfMonth
  ).length;

  // Age demographics helper
  const getAge = (dateOfBirth: string | undefined): number | null => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  // Age demographics (Children: 1-12, Teens: 13-19, Adults: 20-59, Seniors: 60+)
  const childrenCount = members.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 1 && age <= 12;
  }).length;

  const teensCount = members.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 13 && age <= 19;
  }).length;

  const adultsCount = members.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 20 && age <= 59;
  }).length;

  const seniorsCount = members.filter((m: Member) => {
    const age = getAge(m.dateOfBirth);
    return age !== null && age >= 60;
  }).length;

  const stats = [
    { label: 'Total Members', value: totalMembers, icon: Users },
    { label: 'Male', value: maleCount, icon: Users },
    { label: 'Female', value: femaleCount, icon: Users },
    { label: 'New This Month', value: newThisMonth, icon: UserPlus },
    { label: 'Children (1-12)', value: childrenCount, icon: Users2 },
    { label: 'Teens (13-19)', value: teensCount, icon: Users2 },
    { label: 'Adults (20-59)', value: adultsCount, icon: Users },
    { label: 'Seniors (60+)', value: seniorsCount, icon: Users },
  ];

  const memberToDelete = deleteId
    ? members.find((m: Member) => m._id === deleteId)
    : null;

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Member Directory</h1>
          <p className="text-muted mt-1">Manage your church members</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportModal(true)}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Import
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowExportModal(true)}
            leftIcon={<Download className="w-4 h-4" />}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push('/dashboard/members/new')}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Add Member
          </Button>
        </div>
      </div>

      <StatsGrid stats={stats} />

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <Input
              placeholder="Search members..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              leftIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-1">
              {statusFilters.map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusFilterChange(status)}
                  className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                    statusFilter === status
                      ? 'bg-primary text-white'
                      : 'text-muted hover:text-foreground hover:bg-card'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowDateFilter(!showDateFilter)}
              className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${
                showDateFilter || startDate || endDate
                  ? 'bg-primary text-white border-primary'
                  : 'border-border text-muted hover:text-foreground hover:bg-card'
              }`}
            >
              <Calendar className="w-4 h-4" />
              Date
              {(startDate || endDate) && (
                <span className="w-2 h-2 bg-white rounded-full" />
              )}
            </button>
          </div>
        </div>

        {/* Date Range Filter - Collapsible */}
        {showDateFilter && (
          <div className="flex flex-col sm:flex-row gap-4 items-end p-4 bg-background rounded-lg border border-border">
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                From
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                To
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              />
            </div>
            <Button
              onClick={handleDateSearch}
              disabled={!startDate && !endDate}
              className="px-6"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            {(startDate || endDate || dateFilterApplied.startDate || dateFilterApplied.endDate) && (
              <button
                onClick={handleClearDates}
                className="px-4 py-2 text-sm text-muted hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Members Table */}
      {isLoading ? (
        <Card padding="lg">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </Card>
      ) : filteredMembers.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Users}
            title="No members found"
            description={
              search || statusFilter !== 'All'
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by adding your first church member.'
            }
            actionLabel={!search && statusFilter === 'All' ? 'Add Member' : undefined}
            onAction={
              !search && statusFilter === 'All'
                ? () => router.push('/dashboard/members/new')
                : undefined
            }
          />
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Name
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Email
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Status
                  </th>
                  <th className="text-left text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Joined Date
                  </th>
                  <th className="text-right text-xs font-medium text-muted uppercase tracking-wider px-6 py-3">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedMembers.map((member: Member) => (
                  <tr
                    key={member._id}
                    className="hover:bg-background transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-white">
                            {getInitials(
                              member.firstName,
                              member.lastName
                            )}
                          </span>
                        </div>
                        <div>
                          <Link
                            href={`/dashboard/members/${member._id}`}
                            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {member.firstName} {member.lastName}
                          </Link>
                          <p className="text-xs text-muted">
                            {member.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {member.email || '\u2014'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge
                        variant={
                          statusBadgeVariant[member.memberStatus] || 'muted'
                        }
                      >
                        {member.memberStatus.charAt(0).toUpperCase() +
                          member.memberStatus.slice(1)}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-foreground">
                        {member.membershipDate
                          ? formatDate(member.membershipDate)
                          : formatDate(member.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/members/${member._id}`)}
                          aria-label={`View ${member.firstName} ${member.lastName}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/members/${member._id}/edit`)}
                          aria-label={`Edit ${member.firstName} ${member.lastName}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(member._id)}
                          aria-label={`Delete ${member.firstName} ${member.lastName}`}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t border-border">
              <div className="text-sm text-muted">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredMembers.length)} of {filteredMembers.length} members
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 text-sm rounded-md font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary text-white'
                            : 'text-muted hover:text-foreground hover:bg-card'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Import Modal */}
      <Modal
        isOpen={showImportModal}
        onClose={() => { setShowImportModal(false); setImportFile(null); setImportData([]); }}
        title="Import Members"
        description="Upload a CSV file with member data"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg border border-border">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-muted" />
              <div>
                <p className="text-sm font-medium text-foreground">Download Template</p>
                <p className="text-xs text-muted">Get the CSV template with required columns</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <Download className="w-4 h-4 mr-2" />
              Template
            </Button>
          </div>
          
          <div 
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              isDragging 
                ? 'border-primary bg-primary/5' 
                : 'border-border hover:border-primary/50'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            {importFile ? (
              <div>
                <FileText className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">{importFile.name}</p>
                <p className="text-xs text-muted mt-1">{importData.length} valid records found</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setImportFile(null); setImportData([]); }}
                  className="mt-2"
                >
                  Remove
                </Button>
              </div>
            ) : (
              <div>
                <Upload className="w-8 h-8 text-muted mx-auto mb-2" />
                <p className="text-sm text-muted mb-2">Drag and drop your CSV file, or</p>
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  Browse Files
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => { setShowImportModal(false); setImportFile(null); setImportData([]); }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={importData.length === 0}
              isLoading={importMutation.isPending}
              onClick={() => importMutation.mutate({ members: importData })}
            >
              Import {importData.length} Members
            </Button>
          </div>
        </div>
      </Modal>

      {/* Export Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Members"
        description="Choose export format and date range"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Export Format</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex-1 px-4 py-3 text-sm rounded-lg border transition-colors ${
                  exportFormat === 'csv'
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                CSV
              </button>
              <button
                onClick={() => setExportFormat('pdf')}
                className={`flex-1 px-4 py-3 text-sm rounded-lg border transition-colors ${
                  exportFormat === 'pdf'
                    ? 'bg-primary text-white border-primary'
                    : 'border-border text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-1" />
                PDF
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Date Range</label>
            <div className="space-y-2">
              <button
                onClick={() => setExportPeriod('all')}
                className={`w-full px-4 py-2 text-sm rounded-lg border text-left transition-colors ${
                  exportPeriod === 'all'
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'border-border text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                All Members
              </button>
              <button
                onClick={() => setExportPeriod('monthly')}
                className={`w-full px-4 py-2 text-sm rounded-lg border text-left transition-colors ${
                  exportPeriod === 'monthly'
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'border-border text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                This Month Only
              </button>
              <button
                onClick={() => setExportPeriod('custom')}
                className={`w-full px-4 py-2 text-sm rounded-lg border text-left transition-colors ${
                  exportPeriod === 'custom'
                    ? 'bg-primary/10 text-primary border-primary'
                    : 'border-border text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                Custom Date Range
              </button>
            </div>
          </div>

          {exportPeriod === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">From</label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">To</label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button variant="outline" onClick={() => setShowExportModal(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExport} isLoading={isExporting}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteId !== null}
        onClose={() => setDeleteId(null)}
        title="Remove Member"
        description="This action cannot be undone."
        size="sm"
      >
        <div>
          <p className="text-sm text-muted mb-6">
            Are you sure you want to remove{' '}
            <span className="font-semibold text-foreground">
              {memberToDelete
                ? `${memberToDelete.firstName} ${memberToDelete.lastName}`
                : 'this member'}
            </span>{' '}
            from the directory?
          </p>
          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              className="!bg-red-600 hover:!bg-red-700 focus:!ring-red-500"
              isLoading={deleteMutation.isPending}
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                }
              }}
            >
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
