import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { jwtDecode } from 'jwt-decode';

interface DecodedToken {
  exp: number;
  iat: number;
  userId: string;
  role: string;
  organizationId?: string;
}

export const useSessionWarning = () => {
  const { token, logout } = useAuthStore();
  const [showWarning, setShowWarning] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Calculate time until expiration
  const getTimeUntilExpiry = useCallback((): number => {
    if (!token) return 0;
    try {
      const decoded = jwtDecode<DecodedToken>(token);
      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeLeft = expiryTime - now;
      return Math.max(0, timeLeft);
    } catch {
      return 0;
    }
  }, [token]);

  // Refresh token by calling backend endpoint
  const refreshSession = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await api.post('/auth/refresh-token', {});
      const { token: newToken, user } = response.data;
      
      // Update auth store with new token
      useAuthStore.setState({
        token: newToken,
        user,
      });
      
      // Update localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('token', newToken);
      }
      
      // Hide warning and reset timer
      setShowWarning(false);
      setTimeRemaining(0);
    } catch (error) {
      console.error('Failed to refresh session:', error);
      // If refresh fails, logout
      logout();
    } finally {
      setIsRefreshing(false);
    }
  }, [logout]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    setShowWarning(false);
  }, [logout]);

  // Monitor token expiration
  useEffect(() => {
    if (!token) return;

    // Set up interval to check token expiration
    const interval = setInterval(() => {
      const timeLeft = getTimeUntilExpiry();
      
      // Show warning when 5 minutes (300,000 ms) remain
      if (timeLeft > 0 && timeLeft <= 5 * 60 * 1000) {
        setShowWarning(true);
        setTimeRemaining(timeLeft);
      } else if (timeLeft === 0) {
        // Token has expired
        setShowWarning(false);
        logout();
      } else {
        setShowWarning(false);
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [token, getTimeUntilExpiry, logout]);

  // Format time remaining for display
  const formatTimeRemaining = useCallback((ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    showWarning,
    timeRemaining,
    formattedTime: formatTimeRemaining(timeRemaining),
    refreshSession,
    handleLogout,
    isRefreshing,
  };
};
