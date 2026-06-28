import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@/components/ui';
import { AlertCircle, LogOut, Clock } from 'lucide-react';

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
    <Dialog open={isOpen} onOpenChange={(open) => {
      // Only allow closing if not refreshing
      if (!open && !isRefreshing) {
        onLogout();
      }
    }}>
      <DialogContent className="w-full max-w-md border-amber-200 bg-white dark:bg-slate-950 dark:border-amber-900">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-amber-600 dark:text-amber-400 mt-0.5" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">Your Session is Expiring</h2>
              <p className="text-sm text-muted-foreground">
                Your login session will expire soon due to inactivity.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Time Warning Box */}
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                Time Remaining
              </p>
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400 text-center">
              {timeRemaining}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300 text-center mt-2">
              Click "Stay Logged In" to continue working
            </p>
          </div>

          {/* Info Box */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
            <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
              For your security, idle sessions automatically expire. Click <strong>Stay Logged In</strong> to extend your session and continue working without interruption.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t border-border pt-4 mt-6">
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={isRefreshing}
            className="flex items-center gap-2 flex-1 text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <Button
            onClick={onStayLoggedIn}
            disabled={isRefreshing}
            isLoading={isRefreshing}
            className="flex-1 bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800"
          >
            {isRefreshing ? 'Extending...' : 'Stay Logged In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
