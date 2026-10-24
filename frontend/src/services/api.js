import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to inject JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('brandguard_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 unauthenticated
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (currentPath !== '/login') {
        localStorage.removeItem('brandguard_token');
        localStorage.removeItem('brandguard_user');
        window.location.href = '/login?expired=true';
      }
    }
    return Promise.reject(error);
  }
);

// --- API Service Methods ---

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  getUsers: () => api.get('/auth/users'),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
};

export const submissionService = {
  list: (params) => api.get('/submissions', { params }),
  create: (data) => api.post('/submissions', data),
  get: (id) => api.get(`/submissions/${id}`),
  update: (id, data) => api.put(`/submissions/${id}`, data),
  analyze: (id, versionId) => api.post(`/submissions/${id}/analyze`, { version_id: versionId }),
  createVersion: (id, data) => api.post(`/submissions/${id}/versions`, data),
  getVersions: (id) => api.get(`/submissions/${id}/versions`),
  getFindings: (id, versionId) => api.get(`/submissions/${id}/findings`, { params: { version_id: versionId } }),
  uploadDocument: (formData) => api.post('/submissions/upload-document', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
};

export const findingService = {
  updateStatus: (id, status) => api.patch(`/findings/${id}`, { status }),
  applySuggestion: (id, customText) => api.post(`/findings/${id}/apply-suggestion`, { custom_text: customText }),
  dismiss: (id, reason) => api.post(`/findings/${id}/dismiss`, { reason }),
};

export const reviewService = {
  getQueue: () => api.get('/reviews/queue'),
  submitForReview: (subId, reviewerId) => api.post(`/submissions/${subId}/submit-for-review`, { assigned_reviewer_id: reviewerId }),
  addComment: (subId, commentText, commentType = 'general') => api.post(`/submissions/${subId}/reviews`, { comment_text: commentText, comment_type: commentType }),
  approve: (subId, data) => api.post(`/submissions/${subId}/approve`, data),
  requestChanges: (subId, reason) => api.post(`/submissions/${subId}/request-changes`, { reason }),
  escalate: (subId, reason) => api.post(`/submissions/${subId}/escalate`, { reason }),
};

export const guidelineService = {
  list: (params) => api.get('/guidelines', { params }),
  create: (data) => api.post('/guidelines', data),
  get: (id) => api.get(`/guidelines/${id}`),
  update: (id, data) => api.put(`/guidelines/${id}`, data),
  delete: (id) => api.delete(`/guidelines/${id}`),
  getFacts: () => api.get('/guidelines/facts'),
  createFact: (data) => api.post('/guidelines/facts', data),
  getClaims: () => api.get('/guidelines/claims'),
  createClaim: (data) => api.post('/guidelines/claims', data),
  getAssets: () => api.get('/guidelines/assets'),
  createAsset: (data) => api.post('/guidelines/assets', data),
};

export const ruleService = {
  list: (params) => api.get('/rules', { params }),
  create: (data) => api.post('/rules', data),
  update: (id, data) => api.put(`/rules/${id}`, data),
  toggle: (id) => api.patch(`/rules/${id}/toggle`),
  delete: (id) => api.delete(`/rules/${id}`),
};

export const analyticsService = {
  getOverview: (days) => api.get('/analytics/overview', { params: { days } }),
  getFindings: () => api.get('/analytics/findings'),
};

export const auditService = {
  getEvents: (params) => api.get('/audit-events', { params }),
};

export default api;
