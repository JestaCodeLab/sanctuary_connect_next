'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePaystackPayment } from 'react-paystack';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Modal, PageHeader } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Send, AlertCircle, User, Users, Zap, Building2, Check, Loader2, CreditCard, Calendar, Clock } from 'lucide-react';
import { membersApi, departmentsApi, smsApi } from '@/lib/api';
import { useBranchStore } from '@/store/branchStore';
import type { Member, Department } from '@/types';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || 'pk_test_xxxxxxxxxxxxxxxxxxxxxxxxxx';
const PRICE_PER_CREDIT = 0.035;

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
  const router = useRouter();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const user = useAuthStore((state) => state.user);

  const [sendOption, setSendOption] = useState<SendOption>('single');
  const [recipientValue, setRecipientValue] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('general');
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('');
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'input' | 'confirm' | 'payment'>('input');
  const [paymentQuote, setPaymentQuote] = useState<{
    credits: number;
    pricePerCredit: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    reference: string;
  } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'mobile_money'>('card');
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');

  const branches = useBranchStore((state) => state.branches);

  // Open credit modal if query param is set
  useEffect(() => {
    if (searchParams.get('addCredits') === 'true') {
      setShowCreditModal(true);
    }
  }, [searchParams]);

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

  const { data: templates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ['sms-templates'],
    queryFn: smsApi.getTemplates,
  });

  // Calculate payment quote
  const handleInitializePayment = async () => {
    const amount = parseInt(creditAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const totalPrice = amount * PRICE_PER_CREDIT;
      const quote = await smsApi.initializePayment(amount, totalPrice);
      setPaymentQuote(quote);
      setPaymentStep('confirm');
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to initialize payment');
    }
  };

  // Setup Paystack payment
  const paystackConfig = {
    reference: paymentQuote?.reference || `sms_${Date.now()}`,
    email: user?.email || '',
    amount: paymentQuote ? Math.round(paymentQuote.total * 100) : 0, // Convert to pesewas
    publicKey: PAYSTACK_PUBLIC_KEY,
    currency: 'GHS',
    channels: paymentMethod === 'mobile_money' ? ['mobile_money'] : ['card'],
  };

  const initializePayment = usePaystackPayment(paystackConfig);

  const handlePaystackSuccess = async (response: { reference: string }) => {
    setIsPurchasing(true);
    try {
      await smsApi.verifyPayment(response.reference);
      toast.success(`Successfully purchased ${paymentQuote?.credits} SMS credits!`);
      queryClient.invalidateQueries({ queryKey: ['sms-credits'] });
      resetPaymentModal();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Payment verified but credit failed. Contact support.');
    } finally {
      setIsPurchasing(false);
    }
  };

  const resetPaymentModal = () => {
    setShowCreditModal(false);
    setCreditAmount('');
    setPaymentStep('input');
    setPaymentQuote(null);
    setPaymentMethod('card');
  };

  const proceedToPaystack = () => {
    setPaymentStep('payment');
    if (paymentQuote) {
      initializePayment({
        onSuccess: handlePaystackSuccess,
        onClose: () => {
          setPaymentStep('confirm');
        },
      });
    }
  };

  // Filter members based on search term
  const filteredMembers = members.filter((member: Member) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase();
    const phone = member.phone?.toLowerCase() || '';
    return fullName.includes(searchTerm.toLowerCase()) || phone.includes(searchTerm.toLowerCase());
  });

  // Get selected member for template preview
  const selectedMember = recipientValue ? members.find((m: Member) => m._id === recipientValue) : null;

  // Process template variables for preview
  const getProcessedMessage = (msg: string, member: Member | null): string => {
    if (!member) return msg;
    let processed = msg;
    processed = processed.replace(/{{firstName}}/g, member.firstName || '');
    processed = processed.replace(/{{lastName}}/g, member.lastName || '');
    processed = processed.replace(/{{fullName}}/g, `${member.firstName} ${member.lastName}`.trim());
    processed = processed.replace(/{{phone}}/g, member.phone || '');
    if (member.dateOfBirth) {
      const birthDate = new Date(member.dateOfBirth);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      processed = processed.replace(/{{age}}/g, age.toString());
    }
    return processed;
  };

  const previewMessage = selectedTemplate && selectedMember ? getProcessedMessage(message, selectedMember) : message;

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find((t: any) => t._id === templateId);
    if (template) {
      setMessage(template.message);
      setCategory(template.category);
      setSelectedTemplate(templateId);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    if (isScheduled) {
      if (!scheduleDate || !scheduleTime) {
        toast.error('Please set both date and time for scheduled SMS');
        return;
      }
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}`);
      if (scheduledDateTime < new Date()) {
        toast.error('Scheduled time must be in the future');
        return;
      }
    }

    setIsLoading(true);
    try {
      const sendData = {
        message,
        category,
        ...(isScheduled && {
          isScheduled: true,
          scheduleDate: `${scheduleDate}T${scheduleTime}`,
        }),
      };

      switch (sendOption) {
        case 'single':
          if (!recipientValue) {
            toast.error('Please select a member');
            return;
          }
          await smsApi.sendToMembers({
            memberIds: [recipientValue],
            ...sendData,
          });
          break;
        case 'all':
          await smsApi.sendToAll(sendData);
          break;
        case 'department':
          if (!recipientValue) {
            toast.error('Please select a department');
            return;
          }
          await smsApi.sendToDepartment({
            departmentId: recipientValue,
            ...sendData,
          });
          break;
        case 'branch':
          if (!recipientValue) {
            toast.error('Please select a branch');
            return;
          }
          await smsApi.sendToBranch({
            branchId: recipientValue,
            ...sendData,
          });
          break;
      }
      toast.success(isScheduled ? 'SMS scheduled successfully!' : 'SMS sent successfully!');
      setMessage('');
      setRecipientValue('');
      setIsScheduled(false);
      setScheduleDate('');
      setScheduleTime('');
    } catch (error: any) {
      const errorMsg = error?.response?.data?.error || (isScheduled ? 'Failed to schedule SMS' : 'Failed to send SMS');
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderRecipientField = () => {
    switch (sendOption) {
      case 'single': {
        const selectedMemberObj = recipientValue ? members.find((m: Member) => m._id === recipientValue) : null;
        return (
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-foreground">
              Select Member
            </label>

            {selectedMemberObj ? (
              <div className="flex items-center justify-between px-4 py-3 rounded-lg border border-primary/40 bg-primary/5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm flex-shrink-0">
                    {selectedMemberObj.firstName?.[0]}{selectedMemberObj.lastName?.[0]}
                  </div>
                  <div>
                    <p className="font-medium text-foreground text-sm">
                      {selectedMemberObj.firstName} {selectedMemberObj.lastName}
                    </p>
                    <p className="text-xs text-muted">{selectedMemberObj.phone}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setRecipientValue(''); setSearchTerm(''); }}
                  className="text-xs text-red-500 hover:text-red-600 font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
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
                            type="button"
                            onClick={() => {
                              setRecipientValue(member._id);
                              setSearchTerm('');
                            }}
                            className="w-full text-left p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 font-medium text-xs flex-shrink-0">
                                {member.firstName?.[0]}{member.lastName?.[0]}
                              </div>
                              <div>
                                <p className="font-medium text-foreground text-sm">
                                  {member.firstName} {member.lastName}
                                </p>
                                <p className="text-xs text-muted">{member.phone}</p>
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      }

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
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/communication/credits')}
          >
            Add Credits
          </Button>
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

          {/* Template Selector */}
          {templates.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Use Template (Optional)
              </label>
              <select
                value={selectedTemplate || ''}
                onChange={(e) => {
                  if (e.target.value) {
                    handleTemplateSelect(e.target.value);
                  } else {
                    setSelectedTemplate(null);
                  }
                }}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              >
                <option value="">Select a template...</option>
                {templates.map((template: any) => (
                  <option key={template._id} value={template._id}>
                    {template.name} ({template.message.length} chars)
                  </option>
                ))}
              </select>
              {selectedTemplate && (
                <div className="mt-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-xs text-muted mb-1">
                    {selectedMember ? 'Preview for ' + selectedMember.firstName + ':' : 'Template preview (select a member to see personalized preview):'}
                  </p>
                  <p className="text-sm text-foreground font-mono">{previewMessage}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-foreground mb-3">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              rows={6}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground placeholder-muted focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            />
            {(() => {
              const isUnicode = /[^ -ÿ€ŠšŽžŒœŸ]/.test(message);
              const charsPerSegment = isUnicode ? 70 : 160;
              const segments = message.length > 0 ? (Math.ceil(message.length / charsPerSegment) || 1) : 1;
              const charsLeft = segments * charsPerSegment - message.length;
              return (
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-muted">
                    {message.length} chars
                    {isUnicode && <span className="text-amber-500"> · Unicode (emoji/special chars)</span>}
                    {message.length > 0 && (
                      <> · <span className={segments > 1 ? 'text-amber-500 font-medium' : ''}>{segments} credit{segments > 1 ? 's' : ''} per recipient</span></>
                    )}
                  </p>
                  {message.length > 0 && (
                    <p className="text-xs text-muted">{charsLeft} left in segment</p>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Schedule SMS Section */}
          <div className="border-2 border-dashed border-primary/30 rounded-lg p-4 bg-primary/5">
            <div className="flex items-center gap-3 mb-4">
              <input
                type="checkbox"
                id="schedule-sms"
                checked={isScheduled}
                onChange={(e) => setIsScheduled(e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
              />
              <label htmlFor="schedule-sms" className="flex items-center gap-2 cursor-pointer font-medium text-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                Schedule SMS for later
              </label>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-8">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleDate}
                    onChange={(e) => setScheduleDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-foreground"
                  />
                </div>
              </div>
            )}

            {isScheduled && (scheduleDate || scheduleTime) && (
              <p className="text-xs text-muted mt-3 pl-8">
                <Clock className="w-3 h-3 inline mr-1" />
                This SMS will be sent on {scheduleDate && new Date(scheduleDate).toLocaleDateString()} {scheduleTime && `at ${scheduleTime}`}
              </p>
            )}
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              disabled={isLoading || !message.trim() || (isScheduled && (!scheduleDate || !scheduleTime))}
              leftIcon={isScheduled ? <Calendar className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            >
              {isLoading ? (isScheduled ? 'Scheduling...' : 'Sending...') : (isScheduled ? 'Schedule SMS' : 'Send SMS')}
            </Button>
            <Button
              type="button"
              onClick={() => {
                setRecipientValue('');
                setMessage('');
                setIsScheduled(false);
                setScheduleDate('');
                setScheduleTime('');
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

      {/* Purchase Credits Modal */}
      <Modal
        isOpen={showCreditModal}
        onClose={resetPaymentModal}
        title={paymentStep === 'input' ? 'Purchase SMS Credits' : paymentStep === 'confirm' ? 'Confirm Purchase' : 'Processing Payment'}
      >
        {paymentStep === 'input' && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Current balance: <span className="font-semibold">{smsCredits?.balance || 0}</span> credits
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-2">
                Number of Credits
              </label>
              <Input
                type="number"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                placeholder="Enter number of credits (e.g., 100)"
                min="1"
              />
              <p className="text-xs text-muted mt-1">
                Price: GHS {PRICE_PER_CREDIT.toFixed(4)} per credit
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={resetPaymentModal}>
                Cancel
              </Button>
              <Button
                onClick={handleInitializePayment}
                disabled={!creditAmount || parseInt(creditAmount) <= 0}
                isLoading={isPurchasing}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {paymentStep === 'confirm' && paymentQuote && (
          <div className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted">Credits</span>
                <span className="font-semibold text-foreground">{paymentQuote.credits}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted">Price per credit</span>
                <span className="text-foreground">GHS {paymentQuote.pricePerCredit.toFixed(4)}</span>
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-foreground">Total Amount</span>
                  <span className="text-lg font-bold text-primary">
                    GHS {paymentQuote.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-3">
                Payment Method
              </label>
              <div className="space-y-2">
                <button
                  onClick={() => setPaymentMethod('card')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'card' ? 'border-primary bg-primary' : 'border-gray-400'
                    }`} />
                    <div>
                      <p className="font-semibold text-sm">Credit/Debit Card</p>
                      <p className="text-xs text-muted">Visa, Mastercard, etc.</p>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setPaymentMethod('mobile_money')}
                  className={`w-full p-3 rounded-lg border-2 transition-all text-left ${
                    paymentMethod === 'mobile_money'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      paymentMethod === 'mobile_money' ? 'border-primary bg-primary' : 'border-gray-400'
                    }`} />
                    <div>
                      <p className="font-semibold text-sm">Mobile Money</p>
                      <p className="text-xs text-muted">MTN, Vodafone, AirtelTigo</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setPaymentStep('input')}>
                Back
              </Button>
              <Button onClick={proceedToPaystack} isLoading={isPurchasing}>
                Pay Now
              </Button>
            </div>
          </div>
        )}

        {paymentStep === 'payment' && (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted">Processing payment...</p>
          </div>
        )}
      </Modal>
    </div>
  );
}
