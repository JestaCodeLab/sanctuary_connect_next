'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePaystackPayment } from 'react-paystack';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui';
import { Modal, PageHeader } from '@/components/dashboard';
import { Card } from '@/components/ui';
import { Send, AlertCircle, User, Users, Zap, Building2, Check, Loader2, CreditCard } from 'lucide-react';
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

  // Calculate payment quote
  const handleInitializePayment = async () => {
    const amount = parseInt(creditAmount);
    if (!amount || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      const quote = await smsApi.initializePayment(amount);
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
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCreditModal(true)}
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
