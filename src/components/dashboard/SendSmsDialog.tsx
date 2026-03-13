'use client';

import { useState, useEffect } from 'react';
import { smsApi, membersApi, departmentsApi } from '@/lib/api';
import { Member, Department, SmsCostCalculation } from '@/types';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Loader2, AlertCircle, X } from 'lucide-react';

interface SendSmsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function SendSmsDialog({ open, onOpenChange, onSuccess }: SendSmsDialogProps) {
  const [showToast, setShowToast] = useState<{ title: string; description: string; type: 'success' | 'error' } | null>(null);
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

  const toast = (data: { title: string; description: string; variant?: string }) => {
    setShowToast({ title: data.title, description: data.description, type: data.variant === 'destructive' ? 'error' : 'success' });
    setTimeout(() => setShowToast(null), 3000);
  };

  useEffect(() => {
    if (open) {
      loadData();
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
  }, [open]);

  useEffect(() => {
    // Calculate cost when message or recipient count changes
    if (message) {
      calculateCost();
    }
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
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive',
      });
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
        const deptMembers = members.filter(
          (m: any) => m.department?._id === selectedDepartment
        );
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
      toast({
        title: 'Error',
        description: 'Please enter a message',
        variant: 'destructive',
      });
      return;
    }

    setSending(true);
    try {
      let result;

      switch (sendType) {
        case 'single':
          // Get phone from manual entry or selected member
          const phoneToUse = recipientType === 'manual' 
            ? phone 
            : members.find((m: any) => m._id === selectedMember)?.phone;

          if (!phoneToUse) {
            toast({
              title: 'Error',
              description: recipientType === 'manual' 
                ? 'Please enter a phone number'
                : 'Please select a member',
              variant: 'destructive',
            });
            return;
          }
          result = await smsApi.sendSingle({ phone: phoneToUse, message, category });
          break;

        case 'members':
          if (selectedMembers.length === 0) {
            toast({
              title: 'Error',
              description: 'Please select at least one member',
              variant: 'destructive',
            });
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
            toast({
              title: 'Error',
              description: 'Please select a department',
              variant: 'destructive',
            });
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

      toast({
        title: 'Success',
        description: result.message,
        variant: 'default',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to send SMS',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  const getRecipientCount = () => {
    if (sendType === 'single') return 1;
    if (sendType === 'members') return selectedMembers.length;
    if (sendType === 'department' && selectedDepartment) {
      return members.filter((m: any) => m.department?._id === selectedDepartment).length;
    }
    if (sendType === 'all') return members.length;
    return 0;
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-[60] ${ showToast.type === 'error' ? 'bg-red-500' : 'bg-green-500'} text-white`}>
          <div className="font-semibold">{showToast.title}</div>
          <div className="text-sm">{showToast.description}</div>
        </div>
      )}

      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto mx-4">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-semibold">Send SMS</h2>
              <p className="text-sm text-gray-500">Send SMS messages to your members</p>
            </div>
            <button onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Send Type Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Send To</label>
            <div className="space-y-2">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="single"
                  checked={sendType === 'single'}
                  onChange={() => setSendType('single')}
                  className="w-4 h-4"
                />
                <span>Single Phone Number</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="members"
                  checked={sendType === 'members'}
                  onChange={() => setSendType('members')}
                  className="w-4 h-4"
                />
                <span>Selected Members</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="department"
                  checked={sendType === 'department'}
                  onChange={() => setSendType('department')}
                  className="w-4 h-4"
                />
                <span>Department</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="sendType"
                  value="all"
                  checked={sendType === 'all'}
                  onChange={() => setSendType('all')}
                  className="w-4 h-4"
                />
                <span>All Members</span>
              </label>
            </div>
          </div>

          {/* Phone Number (Single) */}
          {sendType === 'single' && (
            <div className="space-y-4">
              {/* Recipient Type Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Recipient Type</label>
                <div className="flex gap-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="recipientType"
                      value="manual"
                      checked={recipientType === 'manual'}
                      onChange={(e) => {
                        e.preventDefault();
                        setRecipientType('manual');
                        setSelectedMember('');
                      }}
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
                      onChange={(e) => {
                        e.preventDefault();
                        setRecipientType('member');
                        setPhone('');
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Select Member</span>
                  </label>
                </div>
              </div>

              {/* Manual Phone Entry */}
              {recipientType === 'manual' && (
                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
                  <Input
                    id="phone"
                    placeholder="e.g., 0241234567 or 233241234567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              )}

              {/* Member Selection */}
              {recipientType === 'member' && (
                <div className="space-y-2">
                  <label htmlFor="member" className="text-sm font-medium">Select Member</label>
                  <select
                    id="member"
                    value={selectedMember}
                    onChange={(e) => {
                      e.preventDefault();
                      setSelectedMember(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          {sendType === 'members' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Members ({selectedMembers.length} selected)</label>
              <div className="border rounded-md p-4 max-h-60 overflow-y-auto space-y-2">
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
          {sendType === 'department' && (
            <div className="space-y-2">
              <label htmlFor="department" className="text-sm font-medium">Department</label>
              <select
                id="department"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select department...</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>
                    {dept.name}
                  </option>
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-between text-sm text-gray-500">
              <span>{message.length} characters</span>
              {costEstimate && (
                <span>{costEstimate.segments} SMS segment(s)</span>
              )}
            </div>
          </div>

          {/* Cost Estimate */}
          {costEstimate && getRecipientCount() > 0 && (
            <div className="border border-blue-200 bg-blue-50 rounded-md p-4">
              <div className="flex gap-2">
                <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <div className="space-y-1 text-sm">
                  <p><strong>Cost Estimate:</strong></p>
                  <p>Recipients: {getRecipientCount()}</p>
                  <p>Credits per recipient: {costEstimate.creditsPerRecipient}</p>
                  <p className="font-bold">Total credits needed: {costEstimate.creditsNeeded}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={sending}>
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              'Send SMS'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
