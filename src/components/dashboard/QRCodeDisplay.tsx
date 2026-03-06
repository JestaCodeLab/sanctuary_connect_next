'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, Download, RefreshCw, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '@/components/ui';
import { eventsApi } from '@/lib/api';

interface QRCodeDisplayProps {
  eventId: string;
  eventTitle: string;
}

export default function QRCodeDisplay({ eventId, eventTitle }: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: qrData, isLoading } = useQuery({
    queryKey: ['qr-code', eventId],
    queryFn: () => eventsApi.getQRCode(eventId),
    enabled: isOpen,
    retry: false,
  });

  const generateMutation = useMutation({
    mutationFn: () => eventsApi.generateQRCode(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-code', eventId] });
      toast.success('QR code generated successfully');
    },
    onError: () => {
      toast.error('Failed to generate QR code');
    },
  });

  const handleDownload = () => {
    if (!qrData?.dataUrl) return;

    const link = document.createElement('a');
    link.href = qrData.dataUrl;
    link.download = `${eventTitle.replace(/\s+/g, '-')}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('QR code downloaded');
  };

  const handleGenerate = () => {
    generateMutation.mutate();
  };

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        leftIcon={<QrCode className="w-4 h-4" />}
        onClick={() => setIsOpen(true)}
      >
        QR Code
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card padding="lg" className="max-w-md w-full relative">
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-muted hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center">
          <div className="flex items-center justify-center mb-4">
            <QrCode className="w-6 h-6 text-primary mr-2" />
            <h2 className="text-xl font-semibold text-foreground">
              Attendance QR Code
            </h2>
          </div>
          <p className="text-sm text-muted mb-6">
            Scan this code to check in to {eventTitle}
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : qrData ? (
            <>
              <div className="bg-white p-6 rounded-lg mb-4 inline-block">
                <img
                  src={qrData.dataUrl}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>
              
              {qrData.checkInUrl && (
                <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                  <p className="text-xs font-medium text-foreground mb-1">Check-In URL:</p>
                  <p className="text-xs text-muted break-all">{qrData.checkInUrl}</p>
                </div>
              )}
              
              <p className="text-xs text-muted mb-6">
                Valid until: {new Date(qrData.expiresAt).toLocaleString()}
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<RefreshCw className="w-4 h-4" />}
                  onClick={handleGenerate}
                  isLoading={generateMutation.isPending}
                >
                  Regenerate
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={handleDownload}
                >
                  Download
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted mb-4">No QR code generated yet</p>
              <Button
                leftIcon={<QrCode className="w-4 h-4" />}
                onClick={handleGenerate}
                isLoading={generateMutation.isPending}
              >
                Generate QR Code
              </Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
