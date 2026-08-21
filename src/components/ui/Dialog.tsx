'use client';

import { ReactNode, useState, useEffect, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: ReactNode;
}

interface DialogContentProps {
  children: ReactNode;
  className?: string;
}

interface DialogHeaderProps {
  children: ReactNode;
}

interface DialogTitleProps {
  children: ReactNode;
}

interface DialogDescriptionProps {
  children: ReactNode;
}

interface DialogTriggerProps {
  children: ReactNode;
  asChild?: boolean;
  onClick?: () => void;
}

interface DialogCloseProps {
  children: ReactNode;
  onClick?: () => void;
}

// Context to track dialog nesting depth
const DialogDepthContext = createContext<number>(0);

export function DialogTrigger({ children, asChild, onClick }: DialogTriggerProps) {
  return (
    <div onClick={onClick}>
      {children}
    </div>
  );
}

export function DialogClose({ children, onClick }: DialogCloseProps) {
  if (!children) {
    return (
      <button
        onClick={onClick}
        className="absolute right-4 top-4 p-1 hover:bg-muted rounded-md transition-colors"
      >
        <X className="w-5 h-5 text-muted-foreground" />
      </button>
    );
  }
  return <div>{children}</div>;
}

export function DialogHeader({ children }: DialogHeaderProps) {
  return (
    <div className="border-b border-border px-6 py-4">
      {children}
    </div>
  );
}

export function DialogTitle({ children }: DialogTitleProps) {
  return (
    <h2 className="text-lg font-semibold text-foreground">
      {children}
    </h2>
  );
}

export function DialogDescription({ children }: DialogDescriptionProps) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export function Dialog({ open: initialOpen, onOpenChange, children }: DialogProps) {
  const [internalOpen, setInternalOpen] = useState(initialOpen ?? false);
  const [mounted, setMounted] = useState(false);
  const parentDepth = useContext(DialogDepthContext);
  const currentDepth = parentDepth + 1;
  const open = initialOpen !== undefined ? initialOpen : internalOpen;

  const handleOpenChange = (newOpen: boolean) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  // document is only available client-side; avoids SSR portal mismatches
  useEffect(() => {
    setMounted(true);
  }, []);

  // Esc-to-close, and lock body scroll while open
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleOpenChange(false);
    };
    document.addEventListener('keydown', handleKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open || !mounted) return null;

  // Calculate z-index based on nesting depth
  // Base: backdrop z-40, content z-50
  // Each nested level adds 10 to prevent overlap issues
  const backdropZIndex = 40 + (currentDepth - 1) * 10;
  const contentZIndex = 50 + (currentDepth - 1) * 10;

  // Portaled directly to <body> so the overlay is always positioned against
  // the true viewport, regardless of any ancestor (e.g. a scrollable <main>)
  // that would otherwise clip or mis-contain a `position: fixed` descendant.
  return createPortal(
    <DialogDepthContext.Provider value={currentDepth}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn"
        style={{ zIndex: backdropZIndex }}
        onClick={() => handleOpenChange(false)}
      />
      {/* Dialog */}
      <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto" style={{ zIndex: contentZIndex }}>
        {children}
      </div>
    </DialogDepthContext.Provider>,
    document.body
  );
}

export function DialogContent({ children, className = '' }: DialogContentProps) {
  return (
    <div className={`bg-background rounded-xl shadow-2xl animate-zoomIn my-8 ${className}`}>
      {children}
    </div>
  );
}
