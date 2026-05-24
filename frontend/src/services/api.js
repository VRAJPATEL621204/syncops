import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5002/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send HttpOnly cookie on every request
});

// No request interceptor needed — cookie is sent automatically by the browser

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/auth/admin/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
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
  getOrgMembers: () => api.get('/teams/org/members'),
  removeFromOrg: (data) => api.delete('/teams/org/members', { data }),
};

// Incident APIs
export const incidentAPI = {
  createIncident: (data) => api.post('/incidents/', data),
  getIncidents: (params) => api.get('/incidents/', { params }),
  getIncidentById: (id) => api.get(`/incidents/${id}`),
  updateIncident: (id, data) => api.patch(`/incidents/${id}`, data),
  changeStatus: (id, data) => api.patch(`/incidents/${id}/status`, data),
  assignTeam: (id, data) => api.patch(`/incidents/${id}/assign-team`, data),
  assignManager: (id, data) => api.patch(`/incidents/${id}/assign-manager`, data),
  resolveIncident: (id) => api.patch(`/incidents/${id}/resolve`),
  closeIncident: (id) => api.patch(`/incidents/${id}/close`),
  reopenIncident: (id) => api.patch(`/incidents/${id}/reopen`),
  // Workflow methods
  reportIncident: (data) => api.post('/incidents/report', data),        // Employee creates pending report
  approveReport: (id, data) => api.post(`/incidents/${id}/approve`, data), // Manager approves report
  rejectReport: (id, data) => api.post(`/incidents/${id}/reject`, data),   // Manager rejects report
  createManualIncident: (data) => api.post('/incidents/manual', data),   // Direct active incident creation
};

// Room/Chat APIs
export const roomAPI = {
  getRooms: () => api.get('/rooms/'),
  getRoomById: (id) => api.get(`/rooms/${id}`),
  getRoomMessages: (id, params) => api.get(`/rooms/${id}/messages`, { params }),
  getRoomParticipants: (id) => api.get(`/rooms/${id}/participants`),
  createDMRoom: (data) => api.post('/rooms/dm', data),
  leaveRoom: (id) => api.delete(`/rooms/${id}/leave`),
};

// User APIs
export const userAPI = {
  searchUsers: (query) => api.get('/auth/users/search', { params: { q: query } }),
};

// Media Upload API
export const uploadAPI = {
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadEvidenceImages: (files, onUploadProgress) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    return api.post('/upload/evidence', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
};

export default api;
