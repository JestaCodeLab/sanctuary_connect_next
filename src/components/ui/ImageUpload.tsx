'use client';

import { useState, useCallback } from 'react';
import { UploadWidgetConfig, UploadWidgetOnUpdateEvent } from '@bytescale/upload-widget';
import { UploadDropzone } from '@bytescale/upload-widget-react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  description?: string;
  accept?: string[];
  maxFileSize?: number;
  className?: string;
}

const options: UploadWidgetConfig = {
  apiKey: process.env.NEXT_PUBLIC_BYTESCALE_API_KEY || 'free',
  maxFileCount: 1,
  mimeTypes: ['image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
  maxFileSizeBytes: 5 * 1024 * 1024, // 5MB
  editor: {
    images: {
      crop: true,
      cropShape: 'rect',
      cropRatio: 1,
    },
  },
  styles: {
    colors: {
      primary: '#3AAFDC',
    },
    fontSizes: {
      base: 14,
    },
    breakpoints: {
      fullScreenWidth: 500,
      fullScreenHeight: 400,
    },
  },
  layout: 'modal',
  showFinishButton: true,
  showRemoveButton: false,
};

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Image',
  description = 'PNG, JPG or SVG (max. 5MB)',
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleUpdate = useCallback(
    ({ uploadedFiles }: UploadWidgetOnUpdateEvent) => {
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        onChange(file.fileUrl);
      }
      setIsUploading(false);
    },
    [onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
  }, [onChange]);

  // If we have a value, show the preview
  if (value) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative inline-block">
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-600">
            <img
              src={value}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          {label}
        </label>
      )}
      {/* @ts-expect-error - bytescale types mismatch with render prop pattern */}
      <UploadDropzone
        options={options}
        onUpdate={handleUpdate}
        onComplete={() => setIsUploading(false)}
        width="100%"
        height="160px"
      >
        {({ onClick }: { onClick: () => void }) => (
          <div
            onClick={onClick}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 text-center hover:border-[#3AAFDC] transition-colors cursor-pointer bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="inline-flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg mb-2">
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-[#3AAFDC] border-t-transparent rounded-full animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5 text-gray-400 dark:text-gray-500" />
              )}
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Drag and drop or{' '}
              <span className="text-[#3AAFDC] font-medium">browse</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {description}
            </p>
          </div>
        )}
      </UploadDropzone>
    </div>
  );
}

export default ImageUpload;
