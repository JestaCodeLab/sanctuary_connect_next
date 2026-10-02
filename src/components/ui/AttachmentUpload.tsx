'use client';

import { useRef, useState } from 'react';
import { FileText, Loader2, Upload, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { donationsApi } from '@/lib/api';

interface AttachmentUploadProps {
  value?: string | null;
  fileName?: string | null;
  onChange: (url: string | null, fileName: string | null) => void;
  label?: string;
  className?: string;
}

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// Uploads through the API (Cloudinary) rather than a third-party widget: the
// Bytescale "free" key only accepts images, so PDFs were being rejected.
export function AttachmentUpload({
  value,
  fileName,
  onChange,
  label = 'Attachment',
  className = '',
}: AttachmentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file after a failure
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Only PDF, JPG, PNG or WEBP files are allowed');
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      toast.error('File is too large — max 5MB');
      return;
    }

    setUploading(true);
    try {
      const result = await donationsApi.uploadAttachment(file);
      onChange(result.url, result.fileName || file.name);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

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
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex flex-col items-center justify-center gap-2 w-full h-32 border-2 border-dashed border-border rounded-lg text-sm text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-60"
      >
        {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
        {uploading ? 'Uploading...' : 'Click to choose a file'}
      </button>
      <p className="text-xs text-muted mt-1.5">PDF, JPG, PNG or WEBP — max 5MB</p>
    </div>
  );
}

export default AttachmentUpload;
