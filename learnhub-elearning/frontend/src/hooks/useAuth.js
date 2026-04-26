import { useEffect } from 'react';
import useAuthStore from '../context/authStore.js';

export const useAuth = () => {
  const { user, accessToken, refreshToken, isLoading, error, getCurrentUser } = useAuthStore();

  useEffect(() => {
    if (accessToken && !user) {
      getCurrentUser().catch(() => {
        // User not found, clear tokens
        useAuthStore.getState().logout();
      });
    }
  }, [accessToken, user, getCurrentUser]);

  return {
    user,
    accessToken,
    refreshToken,
    isLoading,
    error,
    getCurrentUser,
    isAuthenticated: !!user && !!accessToken,
  };
};

export default useAuth;
