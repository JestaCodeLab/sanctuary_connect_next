'use client';

import React from 'react';
import { Dialog, DialogContent, Button } from '@/components/ui';
import { LogOut, Clock, ShieldAlert } from 'lucide-react';

interface SessionWarningModalProps {
  isOpen: boolean;
  timeRemaining: string;
  onStayLoggedIn: () => Promise<void>;
  onLogout: () => void;
  isRefreshing: boolean;
}

export const SessionWarningModal: React.FC<SessionWarningModalProps> = ({
  isOpen,
  timeRemaining,
  onStayLoggedIn,
  onLogout,
  isRefreshing,
}) => {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isRefreshing) onLogout();
      }}
    >
      <DialogContent className="w-full max-w-sm p-0 overflow-hidden border-0 shadow-2xl rounded-2xl">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

        <div className="px-6 pt-5 pb-6 space-y-5 bg-white dark:bg-gray-900">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-50 leading-tight">
                Session Expiring Soon
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                You'll be logged out due to inactivity
              </p>
            </div>
          </div>

          {/* Countdown */}
          <div className="flex flex-col items-center py-4 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Clock className="h-3.5 w-3.5 text-gray-400 dark:text-gray-500" />
              <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Time Remaining
              </span>
            </div>
            <span className="text-5xl font-bold tabular-nums text-amber-500 dark:text-amber-400 tracking-tight">
              {timeRemaining}
            </span>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
              Click <span className="text-amber-600 dark:text-amber-400 font-medium">Stay Logged In</span> to continue
            </p>
          </div>

          {/* Info */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center leading-relaxed">
            For your security, idle sessions expire automatically. Extend your session to keep working without interruption.
          </p>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              onClick={onLogout}
              disabled={isRefreshing}
              className="flex-1 h-9 text-sm gap-1.5 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </Button>
            <Button
              onClick={onStayLoggedIn}
              disabled={isRefreshing}
              isLoading={isRefreshing}
              className="flex-1 h-9 text-sm bg-amber-500 hover:bg-amber-600 dark:bg-amber-500 dark:hover:bg-amber-600 text-white font-medium shadow-sm"
            >
              {isRefreshing ? 'Extending...' : 'Stay Logged In'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
