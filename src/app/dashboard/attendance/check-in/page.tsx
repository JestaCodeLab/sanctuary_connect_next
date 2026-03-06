'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { QrCode, CheckCircle, XCircle, User, Mail, Phone } from 'lucide-react';
import toast from 'react-hot-toast';
import { Card, Button, Input } from '@/components/ui';
import PageHeader from '@/components/dashboard/PageHeader';
import { attendanceApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function QRCheckInPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [qrToken, setQrToken] = useState('');
  const [checkInType, setCheckInType] = useState<'member' | 'guest'>('member');
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [lastCheckIn, setLastCheckIn] = useState<any>(null);

  const checkInMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.checkInWithQR(data),
    onSuccess: (result) => {
      toast.success('Check-in successful!');
      setLastCheckIn(result.record);
      setQrToken('');
      setGuestInfo({ name: '', email: '', phone: '' });
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Check-in failed';
      toast.error(message);
    },
  });

  const handleCheckIn = () => {
    if (!qrToken) {
      toast.error('Please enter QR code token');
      return;
    }

    const data: any = { token: qrToken };

    if (checkInType === 'member' && user) {
      data.userId = user.userId;
    } else if (checkInType === 'guest') {
      if (!guestInfo.name) {
        toast.error('Guest name is required');
        return;
      }
      data.name = guestInfo.name;
      data.email = guestInfo.email;
      data.phone = guestInfo.phone;
    }

    checkInMutation.mutate(data);
  };

  const handleScanFromCamera = () => {
    toast.info('Camera QR scanning coming soon!');
    // TODO: Integrate with a QR scanner library like react-qr-reader
  };

  return (
    <div className="max-w-2xl mx-auto">
      <PageHeader
        title="QR Check-In"
        description="Scan or enter QR code to check in to an event"
      />

      <div className="space-y-6 mt-6">
        {/* Check-in Type */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">Check-in As</h2>
          <div className="flex gap-4">
            <button
              onClick={() => setCheckInType('member')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                checkInType === 'member'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <User className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Member/User</p>
            </button>
            <button
              onClick={() => setCheckInType('guest')}
              className={`flex-1 p-4 rounded-lg border-2 transition-all ${
                checkInType === 'guest'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/50'
              }`}
            >
              <User className="w-6 h-6 mx-auto mb-2 text-primary" />
              <p className="text-sm font-medium text-foreground">Guest</p>
            </button>
          </div>
        </Card>

        {/* Guest Information */}
        {checkInType === 'guest' && (
          <Card padding="lg">
            <h2 className="text-lg font-semibold text-foreground mb-4">Guest Information</h2>
            <div className="space-y-4">
              <Input
                label="Name"
                placeholder="Full name"
                value={guestInfo.name}
                onChange={(e) => setGuestInfo({ ...guestInfo, name: e.target.value })}
                leftIcon={<User className="w-4 h-4" />}
                required
              />
              <Input
                label="Email"
                type="email"
                placeholder="Email address (optional)"
                value={guestInfo.email}
                onChange={(e) => setGuestInfo({ ...guestInfo, email: e.target.value })}
                leftIcon={<Mail className="w-4 h-4" />}
              />
              <Input
                label="Phone"
                type="tel"
                placeholder="Phone number (optional)"
                value={guestInfo.phone}
                onChange={(e) => setGuestInfo({ ...guestInfo, phone: e.target.value })}
                leftIcon={<Phone className="w-4 h-4" />}
              />
            </div>
          </Card>
        )}

        {/* QR Code Input */}
        <Card padding="lg">
          <h2 className="text-lg font-semibold text-foreground mb-4">QR Code</h2>
          <div className="space-y-4">
            <Input
              label="QR Token"
              placeholder="Enter QR code token or scan below"
              value={qrToken}
              onChange={(e) => setQrToken(e.target.value)}
              leftIcon={<QrCode className="w-4 h-4" />}
            />
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={handleScanFromCamera}
                className="flex-1"
                leftIcon={<QrCode className="w-4 h-4" />}
              >
                Scan with Camera
              </Button>
              <Button
                onClick={handleCheckIn}
                isLoading={checkInMutation.isPending}
                className="flex-1"
                leftIcon={<CheckCircle className="w-4 h-4" />}
              >
                Check In
              </Button>
            </div>
          </div>
        </Card>

        {/* Last Check-in Result */}
        {lastCheckIn && (
          <Card padding="lg" className="border-2 border-green-500">
            <div className="flex items-start gap-3">
              <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Check-in Successful!
                </h3>
                <div className="space-y-1 text-sm text-muted">
                  <p>
                    <span className="font-medium">Event:</span> {lastCheckIn.eventId?.title}
                  </p>
                  {lastCheckIn.memberId && (
                    <p>
                      <span className="font-medium">Member:</span>{' '}
                      {lastCheckIn.memberId.firstName} {lastCheckIn.memberId.lastName}
                    </p>
                  )}
                  {lastCheckIn.userId && (
                    <p>
                      <span className="font-medium">User:</span>{' '}
                      {lastCheckIn.userId.firstName} {lastCheckIn.userId.lastName}
                    </p>
                  )}
                  {lastCheckIn.name && (
                    <p>
                      <span className="font-medium">Guest:</span> {lastCheckIn.name}
                    </p>
                  )}
                  <p>
                    <span className="font-medium">Time:</span>{' '}
                    {new Date(lastCheckIn.checkInTime).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Instructions */}
        <Card padding="lg" className="bg-muted/20">
          <h3 className="text-sm font-semibold text-foreground mb-2">How to Check In</h3>
          <ol className="text-sm text-muted space-y-2 list-decimal list-inside">
            <li>Select whether you're checking in as a member/user or guest</li>
            <li>If guest, provide your information</li>
            <li>Scan the QR code with your camera or manually enter the token</li>
            <li>Click "Check In" to complete the process</li>
          </ol>
        </Card>
      </div>
    </div>
  );
}
