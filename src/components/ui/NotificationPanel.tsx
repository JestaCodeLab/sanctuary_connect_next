'use client';

import { useEffect } from 'react';
import { Trash2, Check, CheckCheck } from 'lucide-react';
import { useNotificationStore } from '@/store/notificationStore';

interface NotificationPanelProps {
  onClose: () => void;
}

export default function NotificationPanel({ onClose }: NotificationPanelProps) {
  const {
    notifications,
    loading,
    fetchNotifications,
    markAsRead,
    deleteNotification,
    markAllAsRead,
    clearAllNotifications,
  } = useNotificationStore();

  useEffect(() => {
    fetchNotifications(10);
  }, [fetchNotifications]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'border-l-red-500 bg-red-50 dark:bg-red-950/20';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-50 dark:bg-yellow-950/20';
      case 'low':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-950/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-950/20';
    }
  };

  const getTypeIcon = (type: string) => {
    if (type.includes('subscription')) return '📋';
    if (type.includes('payment') || type.includes('sms')) return '💳';
    if (type.includes('donation')) return '💰';
    if (type.includes('shepherd')) return '🚨';
    if (type.includes('event')) return '📅';
    if (type.includes('auth')) return '🔐';
    return '📬';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border p-4">
        <h3 className="font-semibold text-foreground">Notifications</h3>
        <div className="flex gap-2">
          {notifications.length > 0 && (
            <>
              <button
                onClick={() => markAllAsRead()}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Mark all as read"
              >
                <CheckCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => clearAllNotifications()}
                className="p-1 hover:bg-accent rounded transition-colors text-red-500"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin">⏳</div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <div className="text-4xl mb-2">📭</div>
            <p className="text-sm">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {notifications.map(notification => (
              <div
                key={notification._id}
                className={`border-l-4 p-3 hover:bg-accent/50 transition-colors cursor-pointer ${getPriorityColor(
                  notification.priority
                )} ${!notification.read ? 'bg-opacity-50' : ''}`}
                onClick={() => {
                  if (!notification.read) {
                    markAsRead(notification._id);
                  }
                  if (notification.actionUrl) {
                    window.location.href = notification.actionUrl;
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg mt-0.5">{getTypeIcon(notification.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-medium text-foreground text-sm truncate">
                          {notification.title}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification._id);
                        }}
                        className="p-1 hover:bg-background rounded transition-colors flex-shrink-0"
                      >
                        <Trash2 className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleDateString()}
                      </span>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {notifications.length > 0 && (
        <div className="border-t border-border p-3 text-center">
          <button
            onClick={onClose}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
