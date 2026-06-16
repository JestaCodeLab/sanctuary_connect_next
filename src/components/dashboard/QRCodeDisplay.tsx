'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QrCode, Download, RefreshCw, X, Share2, Lock, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, Card } from '@/components/ui';
import { eventsApi } from '@/lib/api';
import type { EventOccurrence } from '@/types';

interface QRCodeDisplayProps {
  eventId: string;
  eventTitle: string;
  isRecurring?: boolean;
  showAsCard?: boolean; // true = show directly as card, false = show as button that opens modal
}

interface ServiceCodeState {
  [occurrenceDateStr: string]: string; // occurrenceDate ISO string -> code
}

export default function QRCodeDisplay({ eventId, eventTitle, isRecurring = false, showAsCard = true }: QRCodeDisplayProps) {
  const [isOpen, setIsOpen] = useState(showAsCard);
  const [serviceCodes, setServiceCodes] = useState<ServiceCodeState>({});
  const queryClient = useQueryClient();

  const { data: qrData, isLoading, isError, error } = useQuery({
    queryKey: ['qr-code', eventId],
    queryFn: () => eventsApi.getQRCode(eventId),
    enabled: showAsCard || isOpen,
    retry: false,
  });

  const { data: occurrences = [] } = useQuery<EventOccurrence[]>({
    queryKey: ['events', eventId, 'occurrences'],
    queryFn: () => eventsApi.getOccurrences(eventId, 7),
    enabled: (showAsCard || isOpen) && isRecurring,
  });

  // Get only the next upcoming occurrence
  const nextOccurrence = occurrences.length > 0 ? occurrences[0] : null;

  const generateMutation = useMutation({
    mutationFn: () => eventsApi.generateQRCode(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr-code', eventId] });
      toast.success('QR code generated successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to generate QR code';
      toast.error(msg);
    },
  });

  const regenerateServiceCodeMutation = useMutation({
    mutationFn: ({ occurrenceDate }: { occurrenceDate: string }) =>
      eventsApi.regenerateServiceCode(eventId, occurrenceDate),
    onSuccess: (data, variables) => {
      setServiceCodes(prev => ({
        ...prev,
        [variables.occurrenceDate]: data.code
      }));
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'occurrences'] });
      toast.success('Service code regenerated successfully');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.error || 'Failed to regenerate service code';
      toast.error(msg);
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

  const handleShare = () => {
    if (!qrData?.checkInUrl) return;
    const url = qrData.checkInUrl;
    navigator.share?.({
      title: eventTitle,
      text: 'Scan this QR code to check in to ' + eventTitle,
      url,
    }).catch(() => {
      navigator.clipboard.writeText(url);
      toast.success('Check-in URL copied to clipboard');
    });
  };

  // If not showing as card, render as button that opens modal
  if (!showAsCard && !isOpen) {
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

  const cardContent = (
    <>
      {!showAsCard && (
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-4 right-4 text-muted hover:text-foreground"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <QrCode className="w-6 h-6 text-primary mr-2" />
          <h2 className="text-xl font-semibold text-foreground">
            Attendance QR Code
          </h2>
        </div>
        <p className="text-sm text-muted mb-4">
          Scan this code to check in to {eventTitle}
        </p>

        {/* Service Code Section for Next Occurrence */}
        {isRecurring && nextOccurrence && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Service Code for Next Occurrence
            </h3>
            {(() => {
              const occDateStr = new Date(nextOccurrence.startDate).toISOString();
              const hasCode = serviceCodes[occDateStr];
              const isGenerating = regenerateServiceCodeMutation.isPending;

              return (
                <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 overflow-hidden">
                  {/* Date Section */}
                  <div className="px-6 py-4 border-b border-blue-200 dark:border-blue-800 bg-blue-100/40 dark:bg-blue-950/40">
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wide">
                      Scheduled For
                    </p>
                    <p className="text-base font-semibold text-foreground mt-1">
                      {new Date(nextOccurrence.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-muted mt-0.5">
                      {new Date(nextOccurrence.startDate).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true,
                      })}
                    </p>
                  </div>

                  {/* Code Section */}
                  <div className="px-6 py-8 text-center">
                    {hasCode ? (
                      <>
                        <p className="text-xs font-medium text-muted mb-4 uppercase tracking-wider">
                          Service Code
                        </p>
                        <p className="text-5xl font-bold text-blue-700 dark:text-blue-300 font-mono tracking-widest mb-1">
                          {hasCode}
                        </p>
                        <p className="text-xs text-muted mt-4">
                          Members must enter this code along with scanning the QR to check in
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 p-3 bg-yellow-100/50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <p className="text-sm text-yellow-800 dark:text-yellow-200">
                            No code generated yet
                          </p>
                        </div>
                        <p className="text-sm text-muted">
                          Generate a service code for members to use during check-in
                        </p>
                      </>
                    )}
                  </div>

                  {/* Button Section */}
                  <div className="px-6 py-4 bg-blue-100/40 dark:bg-blue-950/40 border-t border-blue-200 dark:border-blue-800 flex gap-2">
                    <Button
                      onClick={() => regenerateServiceCodeMutation.mutate({ occurrenceDate: nextOccurrence.startDate })}
                      isLoading={isGenerating}
                      leftIcon={<RefreshCw className="w-4 h-4" />}
                      className="flex-1"
                    >
                      {hasCode ? 'Regenerate Code' : 'Generate Code'}
                    </Button>
                    {hasCode && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(hasCode);
                          toast.success('Code copied to clipboard');
                        }}
                        className="flex-shrink-0"
                      >
                        Copy
                      </Button>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Security info for service codes */}
        {isRecurring && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="flex items-start gap-2">
              <Lock className="w-4 h-4 text-green-700 dark:text-green-400 mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Service Code Security</p>
                <p className="text-xs text-green-600 dark:text-green-500">
                  This recurring event uses service codes for enhanced security. Generate a unique 4-digit code for each occurrence above. Members must enter both the QR token and the service code to check in.
                </p>
              </div>
            </div>
          </div>
        )}

        {qrData?.occurrenceDate && (
          <p className="text-xs font-medium text-primary mb-4">
            QR for {new Date(qrData.occurrenceDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        )}
        {!qrData?.occurrenceDate && <div className="mb-4" />}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          </div>
        ) : isError ? (
          <div className="text-center py-8">
            <p className="text-error font-medium mb-2">Unable to load QR code</p>
            <p className="text-sm text-muted mb-4">
              {(error as any)?.response?.data?.error || 'Failed to load QR code'}
            </p>
            <Button
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={handleGenerate}
              isLoading={generateMutation.isPending}
            >
              Regenerate QR Code
            </Button>
          </div>
        ) : qrData ? (
          <>
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <p className="text-xs text-blue-700 dark:text-blue-400">
                ℹ️ This QR code links directly to a check-in page. When scanned, it opens the URL below.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg mb-4 inline-block">
              <img
                src={qrData.dataUrl}
                alt="QR Code"
                className="w-64 h-64"
              />
            </div>

            {qrData.token && (
              <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
                <p className="text-xs font-medium text-foreground mb-1">Check-In Token:</p>
                <p className="text-sm font-mono font-bold text-primary break-all">{qrData.token}</p>
                <p className="text-xs text-muted mt-1">
                  {isRecurring
                    ? 'This token is reusable for all occurrences (service code changes per event)'
                    : 'Use this token to manually check in'}
                </p>
              </div>
            )}

            {qrData.checkInUrl && (
              <div className="mb-4 p-3 bg-muted/20 rounded-lg">
                <p className="text-xs font-medium text-foreground mb-1">Check-In URL:</p>
                <p className="text-xs text-muted break-all">{qrData.checkInUrl}</p>
              </div>
            )}

            {!isRecurring && qrData.expiresAt && qrData.expiresAt !== null && (
              <p className="text-xs text-muted mb-6">
                Valid until: {new Date(qrData.expiresAt).toLocaleString()}
              </p>
            )}

            {isRecurring && (
              <p className="text-xs text-muted mb-6">
                Recurring event - QR code is permanent, service codes rotate per occurrence
              </p>
            )}

            <div className="flex gap-3 justify-center flex-wrap">
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
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Share2 className="w-4 h-4" />}
                onClick={handleShare}
              >
                Share
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
    </>
  );

  // Render as card directly (for event details right column)
  if (showAsCard) {
    return (
      <Card padding="lg" className="w-full">
        {cardContent}
      </Card>
    );
  }

  // Render as modal (for button trigger)
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card padding="lg" className="max-w-md w-full relative max-h-[90vh] overflow-y-auto">
        {cardContent}
      </Card>
    </div>
  );
}
