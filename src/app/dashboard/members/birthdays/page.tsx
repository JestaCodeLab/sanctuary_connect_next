'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Cake, MessageSquare, Gift, Calendar, Send, Mail, Phone, Settings, RotateCcw, Save } from 'lucide-react';
import { membersApi, smsApi, settingsApi } from '@/lib/api';
import { Card, Button, Input } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import type { MemberWithBirthday } from '@/types';
import toast from 'react-hot-toast';

function BirthdayTableRow({ 
  member, 
  onSendSms, 
  isSending 
}: { 
  member: MemberWithBirthday; 
  onSendSms: (member: MemberWithBirthday) => void;
  isSending: boolean;
}) {
  const dob = new Date(member.dateOfBirth!);
  const monthDay = dob.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const isToday = member.daysUntilBirthday === 0;

  return (
    <tr className={`border-b border-border hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
      isToday ? 'bg-primary/5' : ''
    }`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
            isToday 
              ? 'bg-primary text-white' 
              : 'bg-primary/10 text-primary'
          }`}>
            {member.firstName[0]}{member.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {member.firstName} {member.lastName}
            </p>
            {member.email && (
              <p className="text-xs text-muted flex items-center gap-1">
                <Mail className="w-3 h-3" />
                {member.email}
              </p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {member.phone ? (
          <div className="flex items-center gap-1 text-sm text-foreground">
            <Phone className="w-3 h-3 text-muted" />
            {member.phone}
          </div>
        ) : (
          <span className="text-xs text-muted italic">No phone</span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="text-sm text-foreground">{monthDay}</div>
      </td>
      <td className="px-4 py-3">
        <div className="text-sm font-medium text-foreground">{member.age}</div>
      </td>
      <td className="px-4 py-3">
        {isToday ? (
          <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary text-white text-xs font-medium rounded-full">
            <Cake className="w-3 h-3" />
            Today!
          </span>
        ) : member.daysUntilBirthday <= 7 ? (
          <span className="inline-flex items-center px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 text-xs font-medium rounded-full">
            in {member.daysUntilBirthday}d
          </span>
        ) : (
          <span className="text-xs text-muted">
            in {member.daysUntilBirthday} days
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          {member.phone ? (
            <Button
              onClick={() => onSendSms(member)}
              disabled={isSending}
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send SMS
            </Button>
          ) : (
            <Button
              disabled
              size="sm"
              variant="outline"
              className="flex items-center gap-1.5 opacity-50"
              title="No phone number"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Send SMS
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}

function BirthdaysContent() {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth()); // 0-11
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sendingAll, setSendingAll] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [customTemplate, setCustomTemplate] = useState('');
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);

  const queryClient = useQueryClient();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch all birthdays for the year (365 days)
  const { data, isLoading } = useQuery({
    queryKey: ['birthdays', 365],
    queryFn: () => membersApi.getBirthdays(365),
  });

  // Fetch birthday settings
  const { data: settings } = useQuery({
    queryKey: ['birthdaySettings'],
    queryFn: () => settingsApi.getBirthdaySettings(),
  });

  // Update local state when settings are loaded
  useEffect(() => {
    if (settings) {
      setCustomTemplate(settings.birthdayMessageTemplate);
      setAutoSendEnabled(settings.birthdayAutoSendEnabled);
    }
  }, [settings]);

  // Update birthday settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: { birthdayMessageTemplate?: string; birthdayAutoSendEnabled?: boolean }) =>
      settingsApi.updateBirthdaySettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['birthdaySettings'] });
      toast.success('Birthday settings updated successfully');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to update settings');
    },
  });

  // Reset template mutation
  const resetTemplateMutation = useMutation({
    mutationFn: () => settingsApi.resetBirthdayTemplate(),
    onSuccess: (data) => {
      setCustomTemplate(data.birthdayMessageTemplate);
      queryClient.invalidateQueries({ queryKey: ['birthdaySettings'] });
      toast.success('Template reset to default');
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Failed to reset template');
    },
  });

  const todayBirthdays = data?.today ?? [];
  const allUpcoming = data?.upcoming ?? [];

  // Group birthdays by month
  const birthdaysByMonth = allUpcoming.reduce((acc, member) => {
    const dob = new Date(member.dateOfBirth!);
    const birthdayMonth = dob.getMonth();
    
    if (!acc[birthdayMonth]) {
      acc[birthdayMonth] = [];
    }
    acc[birthdayMonth].push(member);
    return acc;
  }, {} as Record<number, MemberWithBirthday[]>);

  // Sort each month's birthdays by day
  Object.keys(birthdaysByMonth).forEach(monthKey => {
    birthdaysByMonth[Number(monthKey)].sort((a, b) => {
      const dobA = new Date(a.dateOfBirth!);
      const dobB = new Date(b.dateOfBirth!);
      return dobA.getDate() - dobB.getDate();
    });
  });

  const selectedMonthBirthdays = birthdaysByMonth[selectedMonth] || [];

  const handleSendBirthdaySms = async (member: MemberWithBirthday) => {
    setSendingTo(member._id);
    try {
      // Use custom template or fallback
      const template = customTemplate || `Happy Birthday {{firstName}}! 🎉🎂 Wishing you a wonderful day filled with joy and blessings as you turn {{age}}. May God's grace continue to shine upon you!`;
      
      await smsApi.sendToMembers({
        memberIds: [member._id],
        message: template,
        category: 'birthday',
      });

      toast.success(`Birthday SMS sent to ${member.firstName}!`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send SMS');
    } finally {
      setSendingTo(null);
    }
  };

  const handleSendToAllToday = async () => {
    if (todayBirthdays.length === 0) return;
    
    setSendingAll(true);
    try {
      const memberIds = todayBirthdays.map(m => m._id);
      const template = customTemplate || `Happy Birthday {{firstName}}! 🎉🎂 Wishing you a wonderful day filled with joy and blessings as you turn {{age}}. May God's grace continue to shine upon you!`;
      
      await smsApi.sendToMembers({
        memberIds,
        message: template,
        category: 'birthday',
      });

      toast.success(`Birthday SMS sent to ${todayBirthdays.length} member${todayBirthdays.length > 1 ? 's' : ''}!`);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || 'Failed to send birthday SMS');
    } finally {
      setSendingAll(false);
    }
  };

  const handleSaveSettings = () => {
    updateSettingsMutation.mutate({
      birthdayMessageTemplate: customTemplate,
      birthdayAutoSendEnabled: autoSendEnabled,
    });
  };

  const handleResetTemplate = () => {
    resetTemplateMutation.mutate();
  };

  const handleToggleAutoSend = (enabled: boolean) => {
    setAutoSendEnabled(enabled);
    // Automatically save the toggle change
    updateSettingsMutation.mutate({
      birthdayAutoSendEnabled: enabled,
    });
  };

  return (
    <div>
      <PageHeader
        title="Birthdays"
        description="Track and celebrate member birthdays"
      />

      {/* Birthday Settings */}
      <Card className="mb-6 border-primary/20">
        <div className="p-4">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-foreground">Birthday Automation Settings</h3>
            </div>
            <span className="text-sm text-muted">
              {showSettings ? 'Hide' : 'Show'}
            </span>
          </button>

          {showSettings && (
            <div className="mt-4 space-y-4">
              {/* Auto-Send Toggle */}
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">Auto-Send Birthday SMS</p>
                  <p className="text-xs text-muted mt-0.5">
                    Automatically send birthday greetings at 9:00 AM daily
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={autoSendEnabled}
                    onChange={(e) => handleToggleAutoSend(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                </label>
              </div>

              {/* Custom Message Template */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Birthday Message Template
                </label>
                <textarea
                  value={customTemplate}
                  onChange={(e) => setCustomTemplate(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Enter your custom birthday message..."
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <span className="text-xs text-muted">Available variables:</span>
                  <button
                    onClick={() => setCustomTemplate(prev => prev + '{{firstName}}')}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                  >
                    {'{{firstName}}'}
                  </button>
                  <button
                    onClick={() => setCustomTemplate(prev => prev + '{{lastName}}')}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                  >
                    {'{{lastName}}'}
                  </button>
                  <button
                    onClick={() => setCustomTemplate(prev => prev + '{{age}}')}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                  >
                    {'{{age}}'}
                  </button>
                  <button
                    onClick={() => setCustomTemplate(prev => prev + '{{churchName}}')}
                    className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded hover:bg-primary/20"
                  >
                    {'{{churchName}}'}
                  </button>
                </div>
              </div>

              {/* Preview */}
              {customTemplate && settings?.churchName && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-1">Preview:</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {customTemplate
                      .replace(/\{\{firstName\}\}/g, 'John')
                      .replace(/\{\{lastName\}\}/g, 'Doe')
                      .replace(/\{\{age\}\}/g, '25')
                      .replace(/\{\{churchName\}\}/g, settings.churchName)}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveSettings}
                  disabled={updateSettingsMutation.isPending}
                  className="flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Settings
                </Button>
                <Button
                  onClick={handleResetTemplate}
                  disabled={resetTemplateMutation.isPending}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset to Default
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Today's Birthdays */}
      {todayBirthdays.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Today&apos;s Birthdays
              </h2>
              <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                {todayBirthdays.length}
              </span>
            </div>
            {todayBirthdays.some(m => m.phone) && (
              <Button
                onClick={handleSendToAllToday}
                disabled={sendingAll}
                size="sm"
                className="flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Send SMS to All
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {todayBirthdays.map((member) => (
              <Card key={member._id} className="flex items-center gap-4 p-4 border-primary/20 bg-primary/5">
                <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {member.firstName[0]}{member.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="text-xs text-primary font-medium">
                    Turning {member.age} today!
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Cake className="w-5 h-5 text-primary" />
                  {member.phone && (
                    <button
                      onClick={() => handleSendBirthdaySms(member)}
                      disabled={sendingTo === member._id || sendingAll}
                      title="Send Birthday SMS"
                      className="p-2 rounded-lg text-primary hover:bg-white/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <MessageSquare className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Birthdays by Month */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Birthdays by Month
            </h2>
          </div>
        </div>

        {/* Month Selector - Scrollable Grid */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="grid grid-cols-12 gap-2 min-w-max">
            {months.map((month, index) => {
              const count = birthdaysByMonth[index]?.length || 0;
              const isCurrentMonth = index === currentMonth;
              const isSelected = index === selectedMonth;
              
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(index)}
                  className={`relative px-3 py-2.5 rounded-lg border-2 transition-all text-center min-w-[90px] ${
                    isSelected
                      ? 'border-primary bg-primary text-white shadow-md'
                      : isCurrentMonth
                      ? 'border-primary/30 bg-primary/5 text-foreground hover:border-primary/50'
                      : 'border-border bg-card text-foreground hover:border-primary/30'
                  }`}
                >
                  <div className="text-xs font-semibold">{month.slice(0, 3)}</div>
                  <div className={`text-lg font-bold mt-0.5 ${
                    isSelected ? 'text-white' : 'text-primary'
                  }`}>
                    {count}
                  </div>
                  {isCurrentMonth && (
                    <div className="absolute top-1 right-1">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Month Birthdays */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : selectedMonthBirthdays.length === 0 ? (
          <Card className="text-center py-12">
            <Cake className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No birthdays in {months[selectedMonth]}
            </p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Make sure members have their date of birth set
            </p>
          </Card>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-muted">
                {selectedMonthBirthdays.length} birthday{selectedMonthBirthdays.length !== 1 ? 's' : ''} in {months[selectedMonth]}
              </p>
            </div>
            
            {/* Birthday Table */}
            <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-800 border-b border-border">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Phone
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Age
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-muted uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-card divide-y divide-border">
                    {selectedMonthBirthdays.map((member) => (
                      <BirthdayTableRow 
                        key={member._id} 
                        member={member}
                        onSendSms={handleSendBirthdaySms}
                        isSending={sendingTo === member._id || sendingAll}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SMS Feature Info */}
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Birthday SMS Greetings
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Send personalized birthday SMS to members individually or in bulk. Messages use member names and ages automatically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BirthdaysPage() {
  return <BirthdaysContent />;
}
