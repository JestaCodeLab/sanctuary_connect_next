'use client';

import React, { forwardRef, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className = '',
      label,
      error,
      options,
      placeholder = 'Select an option',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={inputId}
            className={`
              block w-full rounded-lg border bg-white dark:bg-gray-800 px-3 py-2.5 pr-10
              text-gray-900 dark:text-gray-100 appearance-none
              transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent
              disabled:bg-gray-50 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed
              ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 dark:border-gray-600'}
              ${className}
            `}
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400 dark:text-gray-500">
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
        {error && <p className="mt-1.5 text-sm text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';

// Radix UI-like Select components for compatibility
interface SelectContextType {
  open: boolean;
  setOpen: (open: boolean) => void;
  value: string;
  setValue: (value: string) => void;
}

const SelectContext = React.createContext<SelectContextType | undefined>(undefined);

export function SelectRoot({ 
  children, 
  value: controlledValue,
  onValueChange,
}: { 
  children: React.ReactNode;
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(controlledValue || '');

  const handleValueChange = (newValue: string) => {
    setValue(newValue);
    onValueChange?.(newValue);
    setOpen(false);
  };

  return (
    <SelectContext.Provider value={{ open, setOpen, value, setValue: handleValueChange }}>
      <div className="relative w-full">
        {children}
      </div>
    </SelectContext.Provider>
  );
}

export function SelectTrigger({ 
  children,
  className = '',
  asChild,
}: { 
  children: React.ReactNode;
  className?: string;
  asChild?: boolean;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectTrigger must be used within Select');

  return (
    <button
      onClick={() => context.setOpen(!context.open)}
      className={`flex items-center justify-between w-full px-3 py-2 border border-input rounded-md bg-background text-sm ${className}`}
    >
      {children}
      <ChevronDown className="w-4 h-4 opacity-50" />
    </button>
  );
}

export function SelectValue({ 
  placeholder = 'Select an option' 
}: { 
  placeholder?: string 
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectValue must be used within Select');

  return <span>{context.value || placeholder}</span>;
}

export function SelectContent({ 
  children,
  className = '',
}: { 
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectContent must be used within Select');

  if (!context.open) return null;

  return (
    <div className={`absolute top-full left-0 w-full mt-1 border border-input rounded-md bg-background shadow-md z-50 ${className}`}>
      {children}
    </div>
  );
}

export function SelectItem({ 
  value,
  children,
  className = '',
}: { 
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(SelectContext);
  if (!context) throw new Error('SelectItem must be used within Select');

  return (
    <button
      onClick={() => context.setValue(value)}
      className={`w-full text-left px-3 py-2 hover:bg-accent text-sm ${className}`}
    >
      {children}
    </button>
  );
}

export default Select;
