import { create } from 'zustand';
import { api } from '@/lib/api';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  priority: 'low' | 'medium' | 'high';
  actionUrl?: string;
  createdAt: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: (limit?: number, skip?: number, unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markMultipleAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  addNotification: (notification: Notification) => void;
  reset: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  // Fetch all notifications
  fetchNotifications: async (limit = 20, skip = 0, unreadOnly = false) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/api/notifications', {
        params: { limit, skip, unreadOnly },
      });
      set({
        notifications: response.data.notifications || [],
        loading: false,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch notifications';
      set({
        error: errorMessage,
        loading: false,
      });
    }
  },

  // Fetch unread count
  fetchUnreadCount: async () => {
    try {
      const response = await api.get('/api/notifications/unread/count');
      set({ unreadCount: response.data.unreadCount || 0 });
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  },

  // Mark single notification as read
  markAsRead: async (notificationId: string) => {
    try {
      await api.patch(`/api/notifications/${notificationId}/read`);
      set((state) => ({
        notifications: state.notifications.map((n: Notification) =>
          n._id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  },

  // Mark multiple notifications as read
  markMultipleAsRead: async (notificationIds: string[]) => {
    try {
      await api.patch('/api/notifications/read/multiple', { notificationIds });
      set((state) => ({
        notifications: state.notifications.map((n: Notification) =>
          notificationIds.includes(n._id) ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - notificationIds.length),
      }));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  },

  // Mark all notifications as read
  markAllAsRead: async () => {
    try {
      await api.patch('/api/notifications/read/all');
      set((state) => ({
        notifications: state.notifications.map((n: Notification) => ({ ...n, read: true })),
        unreadCount: 0,
      }));
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  },

  // Delete a notification
  deleteNotification: async (notificationId: string) => {
    try {
      await api.delete(`/api/notifications/${notificationId}`);
      set((state) => {
        const notification = state.notifications.find((n: Notification) => n._id === notificationId);
        const wasUnread = notification && !notification.read;
        return {
          notifications: state.notifications.filter((n: Notification) => n._id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  },

  // Clear all notifications
  clearAllNotifications: async () => {
    try {
      await api.delete('/api/notifications/clear/all');
      set({ notifications: [], unreadCount: 0 });
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  },

  // Add notification to store (for real-time updates)
  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  // Reset store
  reset: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null,
    });
  },
}));
