import { create } from 'zustand';
import api from '../utils/api.js';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: !!localStorage.getItem('accessToken'),
  error: null,

  register: async (email, password, firstName, lastName) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/auth/register', {
        email,
        password,
        firstName,
        lastName,
      });
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      set({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      return response.data;
    } catch (err) {
      let error = 'Registration failed';
      if (!err.response) {
        error = 'Network error: Cannot reach the server. Please ensure the backend is running on port 5000.';
      } else {
        error = err.response.data?.details || err.response.data?.error || error;
      }
      set({ error });
      throw new Error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/api/auth/login', { email, password });
      localStorage.setItem('accessToken', response.data.accessToken);
      localStorage.setItem('refreshToken', response.data.refreshToken);
      set({
        user: response.data.user,
        accessToken: response.data.accessToken,
        refreshToken: response.data.refreshToken,
      });
      return response.data;
    } catch (err) {
      let error = 'Login failed';
      if (!err.response) {
        error = 'Network error: Cannot reach the server. Please ensure the backend is running on port 5000.';
      } else {
        error = err.response.data?.details || err.response.data?.error || error;
      }
      set({ error });
      throw new Error(error);
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    delete api.defaults.headers.common['Authorization'];
    set({ user: null, accessToken: null, refreshToken: null });
  },

  getCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/api/auth/me');
      set({ user: response.data, isLoading: false });
      return response.data;
    } catch (err) {
      set({ error: 'Failed to fetch user', isLoading: false });
      throw err;
    }
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
