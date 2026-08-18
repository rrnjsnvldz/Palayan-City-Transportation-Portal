import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token');
  if (token) cfg.headers.Authorization = `Bearer ${token}`;
  return cfg;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login:      (data) => api.post('/api/auth/login', data),
  me:         ()     => api.get('/api/auth/me'),
  getUsers:   ()     => api.get('/api/auth/users'),
  createUser: (data) => api.post('/api/auth/users', data),
  deleteUser: (id)   => api.delete(`/api/auth/users/${id}`),
};

export const vehicleApi = {
  list:   ()         => api.get('/api/vehicles'),
  get:    (id)       => api.get(`/api/vehicles/${id}`),
  create: (data)     => api.post('/api/vehicles', data),
  update: (id, data) => api.put(`/api/vehicles/${id}`, data),
  delete: (id)       => api.delete(`/api/vehicles/${id}`),
};

export const requestApi = {
  list:    ()              => api.get('/api/requests'),
  get:     (id)            => api.get(`/api/requests/${id}`),
  stats:   ()              => api.get('/api/requests/stats/summary'),
  create:  (data)          => api.post('/api/requests', data),
  approve: (id)            => api.patch(`/api/requests/${id}/approve`),
  deny:    (id, reason)    => api.patch(`/api/requests/${id}/deny`, { reason }),
  cancel:  (id)            => api.patch(`/api/requests/${id}/cancel`),
};

export const assignmentApi = {
  list:      ()             => api.get('/api/assignments'),
  create:    (data)         => api.post('/api/assignments', data),
  startTrip: (id)           => api.patch(`/api/assignments/${id}/start`),
  endTrip:   (id, data)     => api.patch(`/api/assignments/${id}/end`, data),
};

export const gpsApi = {
  update:        (data)  => api.post('/api/gps/update', data),
  vehicles:      ()      => api.get('/api/gps/vehicles'),
  history:       (id, n) => api.get(`/api/gps/history/${id}?limit=${n || 100}`),
  notifications: ()      => api.get('/api/gps/notifications'),
  markRead:      (id)    => api.patch(`/api/gps/notifications/${id}/read`),
  markAllRead:   ()      => api.patch('/api/gps/notifications/read-all'),
};

export default api;
