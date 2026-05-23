import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Don't auto-redirect here - let AuthContext handle auth state
    // This prevents race conditions during page refresh
    if (error.response?.status === 401) {
      console.log('[API] 401 received - letting AuthContext handle logout');
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/admin/signup', data),
  login: (data) => api.post('/auth/login', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// OTP APIs
export const otpAPI = {
  verifySignup: (data) => api.post('/otp/verify-signup', data),
  verifyLogin: (data) => api.post('/otp/verify-login', data),
  resendOTP: (data) => api.post('/otp/resend', data),
};

// Invite APIs
export const inviteAPI = {
  createInvite: (data) => api.post('/invites/', data),
  validateInvite: (token) => api.get(`/invites/validate?token=${token}`),
  acceptInvite: (data) => api.post('/invites/accept', data),
  listInvites: () => api.get('/invites/'),
  cancelInvite: (id) => api.delete(`/invites/${id}`),
  resendInvite: (id) => api.post(`/invites/${id}/resend`),
};

// Team APIs
export const teamAPI = {
  createTeam: (data) => api.post('/teams/', data),
  getTeams: () => api.get('/teams/'),
  getTeamById: (id) => api.get(`/teams/${id}`),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  addMember: (data) => api.post('/teams/members', data),
  removeMember: (data) => api.delete('/teams/members', { data }),
};

export default api;
