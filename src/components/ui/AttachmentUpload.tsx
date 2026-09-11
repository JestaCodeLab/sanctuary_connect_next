'use client';

import { useCallback } from 'react';
import { UploadWidgetConfig, UploadWidgetOnUpdateEvent, UploadWidgetResult } from '@bytescale/upload-widget';
import { UploadDropzone } from '@bytescale/upload-widget-react';
import { FileText, X } from 'lucide-react';

interface AttachmentUploadProps {
  value?: string | null;
  fileName?: string | null;
  onChange: (url: string | null, fileName: string | null) => void;
  label?: string;
  className?: string;
}

const options: UploadWidgetConfig = {
  apiKey: process.env.NEXT_PUBLIC_BYTESCALE_API_KEY || 'free',
  maxFileCount: 1,
  mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  showFinishButton: true,
  showRemoveButton: true,
  styles: {
    colors: {
      primary: '#4F46E5',
      active: '#4F46E5',
      error: '#DC2626',
      // The widget draws its own card (background, border, helper text) -
      // it can't inherit the app's CSS variables, so it's given a fixed
      // light, neutral palette that reads cleanly against either a light or
      // dark app theme instead of the default near-white-on-white styling.
      shade900: '#F9FAFB', // widget background
      shade800: '#F3F4F6',
      shade700: '#E5E7EB', // border
      shade600: '#D1D5DB',
      shade500: '#9CA3AF',
      shade400: '#6B7280', // helper text
      shade300: '#4B5563',
      shade200: '#374151',
      shade100: '#111827', // primary text
    },
    fontSizes: {
      base: 14,
    },
  },
};

export function AttachmentUpload({
  value,
  fileName,
  onChange,
  label = 'Attachment',
  className = '',
}: AttachmentUploadProps) {
  const handleUpdate = useCallback(
    ({ uploadedFiles }: UploadWidgetOnUpdateEvent) => {
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        onChange(file.fileUrl, file.originalFile?.originalFileName || null);
      }
    },
    [onChange]
  );

  // With showFinishButton enabled, the widget waits for the user to click
  // "Finished" before it considers the selection done - onComplete (not
  // onUpdate) is what fires at that point. Leaving this as a no-op meant
  // clicking "Finished" never actually recorded the uploaded file.
  const handleComplete = useCallback(
    (files: UploadWidgetResult[]) => {
      if (files.length > 0) {
        const file = files[0];
        onChange(file.fileUrl, file.originalFile?.originalFileName || null);
      }
    },
    [onChange]
  );

  if (value) {
    return (
      <div className={className}>
        {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border border-border rounded-lg bg-muted/30">
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline truncate"
          >
            <FileText className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{fileName || 'View attachment'}</span>
          </a>
          <button
            type="button"
            onClick={() => onChange(null, null)}
            className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded flex-shrink-0"
            title="Remove attachment"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && <label className="block text-sm font-medium text-foreground mb-2">{label}</label>}
      <div className="rounded-lg overflow-hidden border border-border">
        <UploadDropzone options={options} onUpdate={handleUpdate} onComplete={handleComplete} height="140px" width="100%" />
      </div>
      <p className="text-xs text-muted mt-1.5">PDF, JPG, PNG or WEBP — max 5MB</p>
    </div>
  );
}

export default AttachmentUpload;
