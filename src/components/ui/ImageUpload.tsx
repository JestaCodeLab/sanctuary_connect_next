'use client';

import { useState, useCallback, useRef } from 'react';
import { UploadWidgetConfig, UploadWidgetOnUpdateEvent } from '@bytescale/upload-widget';
import { UploadDropzone } from '@bytescale/upload-widget-react';
import { Upload, X, Edit2, Trash2 } from 'lucide-react';

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
      maxDimensions: {
        width: 2048,
        height: 2048,
      },
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
      fullScreenWidth: 900,
      fullScreenHeight: 800,
    },
  },
  layout: 'fullscreen',
  showFinishButton: true,
  showRemoveButton: true,
};

export function ImageUpload({
  value,
  onChange,
  label = 'Upload Image',
  description = 'PNG, JPG or SVG (max. 5MB)',
  className = '',
}: ImageUploadProps) {
  const [showUploader, setShowUploader] = useState(false);
  const uploaderRef = useRef<HTMLDivElement>(null);

  const handleUpdate = useCallback(
    ({ uploadedFiles }: UploadWidgetOnUpdateEvent) => {
      if (uploadedFiles.length > 0) {
        const file = uploadedFiles[0];
        onChange(file.fileUrl);
        setShowUploader(false);
      }
    },
    [onChange]
  );

  const handleRemove = useCallback(() => {
    onChange(null);
    setShowUploader(false);
  }, [onChange]);

  // If we have a value, show clean preview
  if (value) {
    return (
      <div className={className}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            {label}
          </label>
        )}
        
        <div className="space-y-4">
          {/* Logo Preview Container */}
          <div className="flex items-center gap-6">
            {/* Large Preview */}
            <div className="relative flex-shrink-0">
              <div className="w-48 h-48 rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700 shadow-lg bg-white dark:bg-gray-800 p-3 flex items-center justify-center">
                <img
                  src={value}
                  alt="Organization logo"
                  className="w-full h-full object-contain"
                />
              </div>
              {/* Delete button overlay */}
              <button
                type="button"
                onClick={handleRemove}
                className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-all shadow-lg hover:shadow-xl"
                title="Delete logo"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Actions Column */}
            <div className="flex-1 space-y-3">
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Logo ready</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Your organization logo is set and will appear across the platform.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploader(true)}
                  className="w-full px-4 py-3 bg-[#3AAFDC] hover:bg-[#2a8ebd] text-white rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                >
                  <Edit2 className="w-4 h-4" />
                  Change Logo
                </button>

                <button
                  type="button"
                  onClick={handleRemove}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Logo
                </button>
              </div>

              <p className="text-xs text-gray-500 dark:text-gray-400 pt-1">
                {description}
              </p>
            </div>
          </div>
        </div>

        {/* Upload Modal - Only show when explicitly triggered */}
        {showUploader && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div
              ref={uploaderRef}
              className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl"
            >
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Change Logo
                </h3>
                <button
                  onClick={() => setShowUploader(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6">
                <UploadDropzone
                  options={options}
                  onUpdate={handleUpdate}
                  onComplete={() => {}}
                  width="100%"
                  height="300px"
                >
                  {() => (
                    <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center bg-gray-50 dark:bg-gray-800/50">
                      <Upload className="w-12 h-12 text-[#3AAFDC] mx-auto mb-3" />
                      <p className="text-base font-semibold text-gray-800 dark:text-gray-100">
                        Drop your new logo here
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        or click to browse
                      </p>
                    </div>
                  )}
                </UploadDropzone>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Initial upload state
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          {label}
        </label>
      )}
      <UploadDropzone
        options={options}
        onUpdate={handleUpdate}
        onComplete={() => {}}
        width="100%"
        height="280px"
      >
        {({ onClick }: { onClick: () => void }) => (
          <div
            onClick={onClick}
            className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-[#3AAFDC] hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all cursor-pointer bg-gray-50 dark:bg-gray-800/50"
          >
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#3AAFDC]/10 rounded-xl mb-4">
              <Upload className="w-8 h-8 text-[#3AAFDC]" />
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Upload your logo
            </p>
            <p className="text-base text-gray-600 dark:text-gray-400 mb-3">
              Drag and drop your logo here or <span className="text-[#3AAFDC] font-semibold">click to browse</span>
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {description}
            </p>
          </div>
        )}
      </UploadDropzone>
    </div>
  );
}

export default ImageUpload;
