'use client';

import { forwardRef, InputHTMLAttributes } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            ref={ref}
            type="checkbox"
            id={inputId}
            className={`
              peer h-4 w-4 appearance-none rounded border border-gray-300 dark:border-gray-600
              bg-white dark:bg-gray-800 transition-colors duration-200
              checked:bg-[#3AAFDC] checked:border-[#3AAFDC]
              focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:ring-offset-2 dark:focus:ring-offset-gray-900
              disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed
              ${className}
            `}
            {...props}
          />
          <Check className="absolute top-0.5 left-0.5 w-3 h-3 text-white pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity" />
        </div>
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer select-none"
          >
            {label}
          </label>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
