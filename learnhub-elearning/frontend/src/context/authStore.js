import { create } from 'zustand';
import api from '../utils/api.js';

const useAuthStore = create((set) => ({
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isLoading: !!localStorage.getItem('accessToken'),
  error: null,

  register: async (email, password, firstName, lastName, role = 'student', reason = '', experience = '', files = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = new FormData();
      data.append('email', email);
      data.append('password', password);
      data.append('firstName', firstName);
      data.append('lastName', lastName);
      data.append('role', role);
      data.append('reason', reason);
      data.append('experience', experience);
      if (files.idCard) data.append('idCard', files.idCard);
      if (files.cv) data.append('cv', files.cv);
      if (files.diploma) data.append('diploma', files.diploma);

      const response = await api.post('/api/auth/register', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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

  googleLogin: async (token, role = 'student', reason = '', experience = '', files = {}) => {
    set({ isLoading: true, error: null });
    try {
      const data = new FormData();
      // Detect if it's an ID token (JWT has 3 parts separated by dots) or access token
      const isJwt = token.split('.').length === 3;
      if (isJwt) {
        data.append('idToken', token);
      } else {
        data.append('accessToken', token);
      }
      data.append('role', role);
      data.append('reason', reason);
      data.append('experience', experience);
      if (files.idCard) data.append('idCard', files.idCard);
      if (files.cv) data.append('cv', files.cv);
      if (files.diploma) data.append('diploma', files.diploma);

      const response = await api.post('/api/auth/google-login', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
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
      let error = 'Google login failed';
      if (!err.response) {
        error = 'Network error: Cannot reach the server.';
      } else {
        error = err.response.data?.error || error;
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
      const error = err.response?.data?.error || err.response?.data?.details || 'Failed to fetch user';
      set({ error, isLoading: false });
      throw err;
    }
  },

  setUser: (user) => set({ user }),
}));

export default useAuthStore;
