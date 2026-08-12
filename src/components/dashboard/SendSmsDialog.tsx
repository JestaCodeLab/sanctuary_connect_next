'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { smsApi, departmentsApi } from '@/lib/api';
import { Member, Department, SmsCostCalculation } from '@/types';
import { Button, Input } from '@/components/ui';
import Modal from '@/components/dashboard/Modal';
import { useOrganizationStore } from '@/store/organizationStore';
import { Loader2, AlertCircle, AlertTriangle, Send } from 'lucide-react';

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  /** Pre-select "Department" and this department id, e.g. from a department's detail page */
  initialDepartmentId?: string;
  /** Pre-select "Selected Members" with these exact member ids, e.g. from the AI digest's "message them" prompt */
  preselectedMemberIds?: string[];
  /** Hide the "Send To" picker so the caller's initial selection can't be changed */
  lockSendType?: boolean;
  /** Pre-fill the message body, e.g. a canned rehearsal reminder or welcome text */
  initialMessage?: string;
  /** Override the locked "Sending to" text, e.g. "Jane Doe — 0241234567", when the caller already has the recipient's details on hand */
  recipientsLabel?: string;
}

// `departments` is a populated array (each entry either an id string or a { _id, name } object)
function isInDepartment(member: any, departmentId: string): boolean {
  return (member.departments || []).some((d: any) => (d?._id || d) === departmentId);
}

export default function SendSmsDialog({
  open,
  onOpenChange,
  onSuccess,
  initialDepartmentId,
  preselectedMemberIds,
  lockSendType = false,
  initialMessage,
  recipientsLabel,
}: SendSmsDialogProps) {
  const { organization } = useOrganizationStore();
  const { data: systemConfig } = useQuery({
    queryKey: ['sms-system-config'],
    queryFn: () => smsApi.getSystemConfig(),
    staleTime: Infinity,
    enabled: open,
  });
  const { data: creditBalance } = useQuery({
    queryKey: ['sms-credits-balance'],
    queryFn: () => smsApi.getCreditsBalance(),
    enabled: open,
  });
  const currentSenderId = organization?.smsConfig?.senderId;
  const currentSenderStatus = organization?.smsConfig?.senderIdStatus;
  const activeSenderId = currentSenderStatus?.toLowerCase() === 'approved' && currentSenderId
    ? currentSenderId
    : systemConfig?.defaultSenderId || 'Sanctuary';

  const [sendType, setSendType] = useState<'single' | 'members' | 'department' | 'all'>('single');
  const [recipientType, setRecipientType] = useState<'manual' | 'member'>('manual'); // For single SMS
  const [phone, setPhone] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('general');
  const [members, setMembers] = useState<Member[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [costEstimate, setCostEstimate] = useState<SmsCostCalculation | null>(null);

  useEffect(() => {
    if (open) {
      loadData();
      if (initialDepartmentId) {
        setSendType('department');
        setSelectedDepartment(initialDepartmentId);
      } else if (preselectedMemberIds && preselectedMemberIds.length > 0) {
        setSendType('members');
        setSelectedMembers(preselectedMemberIds);
      } else {
        setSendType('single');
      }
      if (initialMessage) {
        setMessage(initialMessage);
      }
    } else {
      // Reset form when dialog closes
      setRecipientType('manual');
      setPhone('');
      setSelectedMember('');
      setMessage('');
      setCategory('general');
      setSelectedMembers([]);
      setSelectedDepartment('');
      setCostEstimate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    // Calculate cost when message or recipient count changes
    if (message) {
      calculateCost();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message, sendType, selectedMembers, selectedDepartment]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [membersData, departmentsData] = await Promise.all([
        smsApi.getAvailableMembers(),
        departmentsApi.getAll(),
      ]);
      setMembers(membersData.members as any);
      setDepartments(departmentsData);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const calculateCost = async () => {
    try {
      let recipientCount = 1;

      if (sendType === 'members') {
        recipientCount = selectedMembers.length;
      } else if (sendType === 'department' && selectedDepartment) {
        const deptMembers = members.filter((m: any) => isInDepartment(m, selectedDepartment));
        recipientCount = deptMembers.length;
      } else if (sendType === 'all') {
        recipientCount = members.length;
      }

      if (recipientCount > 0) {
        const cost = await smsApi.calculateCost(message, recipientCount);
        setCostEstimate(cost);
      }
    } catch (error) {
      console.error('Failed to calculate cost:', error);
    }
  };

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setSending(true);
    try {
      let result;

      switch (sendType) {
        case 'single': {
          // Get phone from manual entry or selected member
          const phoneToUse = recipientType === 'manual'
            ? phone
            : members.find((m: any) => m._id === selectedMember)?.phone;

          if (!phoneToUse) {
            toast.error(recipientType === 'manual' ? 'Please enter a phone number' : 'Please select a member');
            return;
          }
          result = await smsApi.sendSingle({ phone: phoneToUse, message, category });
          break;
        }

        case 'members':
          if (selectedMembers.length === 0) {
            toast.error('Please select at least one member');
            return;
          }
          result = await smsApi.sendToMembers({
            memberIds: selectedMembers,
            message,
            category,
          });
          break;

        case 'department':
          if (!selectedDepartment) {
            toast.error('Please select a department');
            return;
          }
          result = await smsApi.sendToDepartment({
            departmentId: selectedDepartment,
            message,
            category,
          });
          break;

        case 'all':
          result = await smsApi.sendToAll({ message, category });
          break;
      }

      toast.success(result.message);
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = () => {
    if (sendType === 'single') return 1;
    if (sendType === 'members') return selectedMembers.length;
    if (sendType === 'department' && selectedDepartment) {
      return members.filter((m: any) => isInDepartment(m, selectedDepartment)).length;
    }
    if (sendType === 'all') return members.length;
    return 0;
  };

  const selectedDepartmentName = departments.find((d) => d._id === selectedDepartment)?.name;
  const insufficientCredits = !!costEstimate && !!creditBalance && creditBalance.balance < costEstimate.creditsNeeded;

  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title="Send SMS"
      description="Send SMS messages to your members"
      size="lg"
    >
      <div className="space-y-4">
        {/* Sender ID */}
        <div className="flex items-center gap-2 text-xs text-muted bg-muted/10 rounded-lg px-3 py-2">
          <Send className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Sending from: <span className="font-medium text-foreground">{activeSenderId}</span></span>
        </div>

        {/* Send Type Selection */}
        {lockSendType ? (
          <div className="text-sm font-medium text-foreground">
            Sending to: {recipientsLabel || (sendType === 'department' ? `Department — ${selectedDepartmentName || '...'}` : `${selectedMembers.length} selected member(s)`)}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Send To</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sendType" value="single" checked={sendType === 'single'} onChange={() => setSendType('single')} className="w-4 h-4" />
                <span>Single Phone Number</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sendType" value="members" checked={sendType === 'members'} onChange={() => setSendType('members')} className="w-4 h-4" />
                <span>Selected Members</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sendType" value="department" checked={sendType === 'department'} onChange={() => setSendType('department')} className="w-4 h-4" />
                <span>Department</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="radio" name="sendType" value="all" checked={sendType === 'all'} onChange={() => setSendType('all')} className="w-4 h-4" />
                <span>All Members</span>
              </label>
            </div>
          </div>
        )}

        {/* Phone Number (Single) */}
        {sendType === 'single' && !lockSendType && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Recipient Type</label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipientType"
                    value="manual"
                    checked={recipientType === 'manual'}
                    onChange={() => { setRecipientType('manual'); setSelectedMember(''); }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Manual Entry</span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="recipientType"
                    value="member"
                    checked={recipientType === 'member'}
                    onChange={() => { setRecipientType('member'); setPhone(''); }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Select Member</span>
                </label>
              </div>
            </div>

            {recipientType === 'manual' && (
              <div className="space-y-2">
                <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                <Input id="phone" placeholder="e.g., 0241234567 or 233241234567" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            )}

            {recipientType === 'member' && (
              <div className="space-y-2">
                <label htmlFor="member" className="text-sm font-medium">Select Member</label>
                <select
                  id="member"
                  value={selectedMember}
                  onChange={(e) => setSelectedMember(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a member...</option>
                  {members.map((member: any) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName} - {member.phone}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Member Selection */}
        {sendType === 'members' && !lockSendType && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Members ({selectedMembers.length} selected)</label>
            <div className="border border-border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
              {loading ? (
                <div className="flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                members.map((member: any) => (
                  <div key={member._id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={member._id}
                      checked={selectedMembers.includes(member._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedMembers([...selectedMembers, member._id]);
                        } else {
                          setSelectedMembers(selectedMembers.filter((id) => id !== member._id));
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <label htmlFor={member._id} className="flex-1 cursor-pointer">
                      {member.firstName} {member.lastName} - {member.phone}
                    </label>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Department Selection */}
        {sendType === 'department' && !lockSendType && (
          <div className="space-y-2">
            <label htmlFor="department" className="text-sm font-medium">Department</label>
            <select
              id="department"
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select department...</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        <div className="space-y-2">
          <label htmlFor="category" className="text-sm font-medium">Category</label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="general">General</option>
            <option value="announcement">Announcement</option>
            <option value="event_reminder">Event Reminder</option>
            <option value="birthday">Birthday</option>
            <option value="welcome">Welcome</option>
            <option value="thank_you">Thank You</option>
            <option value="emergency">Emergency</option>
          </select>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <label htmlFor="message" className="text-sm font-medium">Message</label>
          <textarea
            id="message"
            placeholder="Enter your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            className="w-full px-3 py-2 border border-border rounded-md bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <div className="flex justify-between text-sm text-muted">
            <span>{message.length} characters</span>
            {costEstimate && <span>{costEstimate.segments} SMS segment(s)</span>}
          </div>
        </div>

        {/* Cost Estimate */}
        {costEstimate && getRecipientCount() > 0 && (
          <div className={`border rounded-md p-4 ${
            insufficientCredits
              ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
              : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
          }`}>
            <div className="flex gap-2">
              {insufficientCredits ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              )}
              <div className="space-y-1 text-sm">
                <p><strong>Cost Estimate:</strong></p>
                <p>Recipients: {getRecipientCount().toLocaleString()}</p>
                <p>Credits per recipient: {costEstimate.creditsPerRecipient.toLocaleString()}</p>
                <p className="font-bold">Total credits needed: {costEstimate.creditsNeeded.toLocaleString()}</p>
                {creditBalance && <p>Current balance: {creditBalance.balance.toLocaleString()} credit(s)</p>}
                {insufficientCredits && (
                  <p className="font-medium text-red-700 dark:text-red-300 pt-1">
                    Insufficient SMS credits — you need {(costEstimate.creditsNeeded - creditBalance!.balance).toLocaleString()} more credit(s) to send this.{' '}
                    <Link href="/dashboard/communication/credits" className="underline" onClick={() => onOpenChange(false)}>
                      Buy credits
                    </Link>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending || insufficientCredits} isLoading={sending}>
            {sending ? 'Sending...' : 'Send SMS'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
