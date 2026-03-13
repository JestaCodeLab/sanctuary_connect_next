'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Button from '@/components/ui/Button';
import { PageHeader } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Send, AlertCircle, User, Users, Zap, Building2, Check, Loader2, CreditCard } from 'lucide-react';
import { membersApi, departmentsApi, smsApi } from '@/lib/api';
import { useBranchStore } from '@/store/branchStore';
import type { Member, Department } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';

type SendOption = 'single' | 'all' | 'department' | 'branch';

interface SendOptionConfig {
  id: SendOption;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const sendOptions: SendOptionConfig[] = [
  {
    id: 'single',
    label: 'Single Member',
    description: 'Send to one member',
    icon: <User className="w-5 h-5" />,
  },
  {
    id: 'all',
    label: 'All Members',
    description: 'Send to all members',
    icon: <Users className="w-5 h-5" />,
  },
  {
    id: 'department',
    label: 'Department',
    description: 'Send to department members',
    icon: <Zap className="w-5 h-5" />,
  },
  {
    id: 'branch',
    label: 'Branch',
    description: 'Send to branch members',
    icon: <Building2 className="w-5 h-5" />,
  },
];

export default function SendSmsPage() {
  const [sendOption, setSendOption] = useState<SendOption>('single');
  const [recipientValue, setRecipientValue] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('general');

  const branches = useBranchStore((state) => state.branches);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });

  const { data: departments = [], isLoading: departmentsLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const { data: smsCredits } = useQuery({
    queryKey: ['sms-credits'],
    queryFn: smsApi.getCreditsBalance,
  });

  // Filter members based on search term
  const filteredMembers = members.filter((member: Member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const phone = member.phone?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  });

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsLoading(true);
    try {
      switch (sendOption) {
        case 'single':
          if (!recipientValue) {
            toast.error('Please select a member');
            return;
          }
          await smsApi.sendToMembers({
            memberIds: [recipientValue],
            message,
            category,
          });
          break;
        case 'all':
          await smsApi.sendToAll({ message, category });
          break;
        case 'department':
          if (!recipientValue) {
            toast.error('Please select a department');
            return;
          }
          await smsApi.sendToDepartment({ 
            departmentId: recipientValue, 
            message, 
            category 
          });
          break;
        case 'branch':
          if (!recipientValue) {
            toast.error('Please select a branch');
            return;
          }
          await smsApi.sendToBranch({
            branchId: recipientValue,
            message,
            category,
          });
          break;
      }
      toast.success('SMS sent successfully!');
      setMessage('');
      setRecipientValue('');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || 'Failed to send SMS';
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecipientField = () => {
    switch (sendOption) {
      case 'single':
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground mb-3">
              Select Member
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search member name or phone..."
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
            {membersLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-muted animate-spin" />
              </div>
            ) : (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg max-h-64 overflow-y-auto bg-white dark:bg-gray-800">
                {filteredMembers.length === 0 ? (
                  <div className="p-4 text-center text-muted text-sm">
                    No members found
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredMembers.map((member: Member) => (
                      <button
                        key={member._id}
                        onClick={() => {
                          setRecipientValue(member._id);
                          setSearchTerm('');
                        }}
                        className={`w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          recipientValue === member._id ? 'bg-primary-light/20' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-foreground">
                              {member.firstName} {member.lastName}
                            </p>
                            <p className="text-sm text-muted">{member.phone}</p>
                          </div>
                          {recipientValue === member._id && (
                            <Check className="w-5 h-5 text-primary" />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {recipientValue && (
              <p className="text-xs text-muted">
                Selected: {members.find((m: Member) => m._id === recipientValue)?.firstName} {members.find((m: Member) => m._id === recipientValue)?.lastName}
              </p>
            )}
          </div>
        );

      case 'all':
        return (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Recipients
            </label>
            <div className="px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-primary-light/30">
              <p className="text-sm text-foreground">All church members will receive this SMS</p>
            </div>
            <p className="text-xs text-muted mt-2">Total: {members.length} members</p>
          </div>
        );

      case 'department':
        return (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Department
            </label>
            {departmentsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 text-muted animate-spin" />
              </div>
            ) : (
              <select
                value={recipientValue}
                onChange={(e) => setRecipientValue(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Select department...</option>
                {departments.map((dept: Department) => {
                  const memberCount = dept.members?.length || 0;
                  return (
                    <option key={dept._id} value={dept._id}>
                      {dept.name} ({memberCount} members)
                    </option>
                  );
                })}
              </select>
            )}
            {recipientValue && (
              <p className="text-xs text-muted mt-2">
                Members: {departments.find((d: Department) => d._id === recipientValue)?.members?.length || 0}
              </p>
            )}
          </div>
        );

      case 'branch':
        return (
          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Branch
            </label>
            <select
              value={recipientValue}
              onChange={(e) => setRecipientValue(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            >
              <option value="">Select branch...</option>
              {branches.map((branch) => {
                const branchId = typeof branch._id === 'string' ? branch._id : branch._id;
                const branchMembers = members.filter((m: Member) => {
                  const mBranchId = typeof m.branchId === 'string' ? m.branchId : (m.branchId as any)?._id;
                  return mBranchId === branchId;
                });
                return (
                  <option key={branch._id} value={branch._id}>
                    {branch.name} ({branchMembers.length} members)
                  </option>
                );
              })}
            </select>
            {recipientValue && (
              <p className="text-xs text-muted mt-2">
                Members: {members.filter((m: Member) => {
                  const mBranchId = typeof m.branchId === 'string' ? m.branchId : (m.branchId as any)?._id;
                  return mBranchId === recipientValue;
                }).length}
              </p>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Send SMS"
        description="Send bulk SMS messages to members"
      />

      {/* SMS Credits Banner */}
      <div className={`rounded-lg border p-4 ${
        smsCredits && smsCredits.balance < 10 
          ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          : 'bg-card border-border'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
              smsCredits && smsCredits.balance < 10
                ? 'bg-yellow-100 dark:bg-yellow-900/40'
                : 'bg-primary-light'
            }`}>
              <CreditCard className={`w-5 h-5 ${
                smsCredits && smsCredits.balance < 10
                  ? 'text-yellow-600 dark:text-yellow-400'
                  : 'text-primary'
              }`} />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-foreground">
                SMS Credits Balance
              </h3>
              <p className={`text-2xl font-bold ${
                smsCredits && smsCredits.balance < 10
                  ? 'text-yellow-700 dark:text-yellow-300'
                  : 'text-foreground'
              }`}>
                {smsCredits?.balance || 0}
              </p>
            </div>
          </div>
          <Link href="/dashboard/communication">
            <Button variant="outline" size="sm">
              Add Credits
            </Button>
          </Link>
        </div>
        {smsCredits && smsCredits.balance < 10 && (
          <p className="mt-2 text-xs text-yellow-700 dark:text-yellow-300">
            ⚠️ Low balance! Add more credits to continue sending SMS.
          </p>
        )}
      </div>

      {/* Send Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {sendOptions.map((option) => (
          <button
            key={option.id}
            onClick={() => {
              setSendOption(option.id);
              setRecipientValue('');
            }}
            className={`p-4 rounded-lg border-2 transition-all text-left relative ${
              sendOption === option.id
                ? 'border-primary bg-primary-light/10'
                : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
            }`}
          >
            {sendOption === option.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check className="w-3 h-3 text-white" />
              </div>
            )}
            <div className={`mb-2 ${sendOption === option.id ? 'text-primary' : 'text-muted'}`}>
              {option.icon}
            </div>
            <h3 className="font-semibold text-sm text-foreground">{option.label}</h3>
            <p className="text-xs text-muted mt-1">{option.description}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      <Card>
        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSend(); }}>
          {renderRecipientField()}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              maxLength={160}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            />
            <div className="flex items-center justify-between mt-2">
              <p className="text-xs text-muted">
                {message.length}/160 characters
              </p>
              {message.length >= 150 && (
                <p className="text-xs text-warning">Approaching limit</p>
              )}
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isLoading || !message.trim()}
              leftIcon={<Send className="w-4 h-4" />}
            >
              {isLoading ? 'Sending...' : 'Send SMS'}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRecipientValue('');
                setMessage('');
              }}
              variant="outline"
            >
              Clear
            </Button>
          </div>
        </form>
      </Card>

      <div className="rounded-lg border border-warning-light bg-warning-light p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-foreground">
            Subscription Required
          </p>
          <p className="text-sm text-muted mt-1">
            SMS sending requires an active subscription plan with messaging features enabled.
          </p>
        </div>
      </div>
    </div>
  );
}
