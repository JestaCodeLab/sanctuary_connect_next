import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui';
import Button from '@/components/ui/button';
import { AlertCircle, LogOut } from 'lucide-react';

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
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <DialogTitle>Session Expiring Soon</DialogTitle>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            Your session will expire in {timeRemaining}. Choose an action below.
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
            <p>
              For your security, your login session is set to expire when you have been inactive.
              Click <strong>Stay Logged In</strong> to extend your session and continue working.
            </p>
          </div>

          <div className="text-center text-lg font-semibold text-gray-900">
            Time Remaining: <span className="text-orange-600">{timeRemaining}</span>
          </div>
        </div>

        <div className="flex gap-2 border-t border-gray-200 pt-4">
          <Button
            variant="outline"
            onClick={onLogout}
            disabled={isRefreshing}
            className="flex items-center gap-2 flex-1"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
          <Button
            onClick={onStayLoggedIn}
            disabled={isRefreshing}
            className="flex-1"
          >
            {isRefreshing ? 'Extending...' : 'Stay Logged In'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
