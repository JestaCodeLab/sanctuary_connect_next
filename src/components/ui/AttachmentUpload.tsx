'use client';

import { useCallback } from 'react';
import { UploadWidgetConfig, UploadWidgetOnUpdateEvent } from '@bytescale/upload-widget';
import { UploadDropzone } from '@bytescale/upload-widget-react';
import { FileText, Upload, X } from 'lucide-react';

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
      primary: '#3AAFDC',
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
      <div className="border-2 border-dashed border-border rounded-lg hover:border-primary transition-colors bg-muted/20 min-h-[100px] flex flex-col items-center justify-center gap-1 p-4">
        <UploadDropzone options={options} onUpdate={handleUpdate} onComplete={() => {}} height="100px" width="100%" />
        <Upload className="w-5 h-5 text-muted" />
        <p className="text-sm text-muted">Click or drag file (PDF, JPG, PNG — max 5MB)</p>
      </div>
    </div>
  );
}

export default AttachmentUpload;
