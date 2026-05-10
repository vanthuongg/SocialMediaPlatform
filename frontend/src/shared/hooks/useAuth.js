import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/api/axios.instance.js';
import { useAuthStore } from '@/shared/stores/auth.store.js';
import { useSocketStore } from '@/shared/stores/socket.store.js';
import { toast } from '@/shared/hooks/useToast.js';

export function useAuth() {
  const { user, isAuthenticated, login, logout: storeLogout, updateUser } = useAuthStore();
  const { disconnect } = useSocketStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: (credentials) => api.post('/auth/login', credentials),
    onSuccess: (response) => {
      const { user, accessToken } = response.data.data;
      login(user, accessToken);
      toast.success(`Welcome back, ${user.name}! 👋`);
      if (['admin', 'moderator'].includes(user.role)) {
        navigate('/admin-panel');
      } else {
        navigate('/feed');
      }
    },
    onError: (error) => {
      const msg = error.response?.data?.error?.message;
      if (msg && msg.includes('suspended')) {
        navigate(`/banned?error=${encodeURIComponent(msg)}`);
      } else {
        toast.error(msg || 'Login failed');
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: (data) => api.post('/auth/register', data),
    onSuccess: () => {
      toast.success('Account created! Please check your email to verify your account.');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Registration failed');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSettled: () => {
      storeLogout();
      disconnect();
      queryClient.clear();
      navigate('/login');
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: (data) => api.post('/auth/forgot-password', data),
    onSuccess: () => {
      toast.success('Password reset link sent to your email.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to send reset email');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: ({ token, password }) => api.post(`/auth/reset-password/${token}`, { password }),
    onSuccess: () => {
      toast.success('Password reset successfully!');
      navigate('/login');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error?.message || 'Failed to reset password');
    },
  });

  return {
    user,
    isAuthenticated,
    updateUser,
    loginMutation,
    registerMutation,
    logoutMutation,
    forgotPasswordMutation,
    resetPasswordMutation,
  };
}
