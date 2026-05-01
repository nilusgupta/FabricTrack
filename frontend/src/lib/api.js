import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Endpoints that must NEVER trigger the refresh interceptor (avoid infinite loops)
const AUTH_BYPASS = ['/auth/refresh', '/auth/login', '/auth/logout', '/auth/me'];

api.interceptors.response.use(
  res => res,
  async error => {
    const cfg = error.config || {};
    const url = cfg.url || '';
    const status = error.response?.status;

    // If the failing request is itself an auth endpoint, do NOT attempt refresh
    const isAuthCall = AUTH_BYPASS.some(p => url.includes(p));

    if (status === 401 && !cfg._retry && !isAuthCall) {
      cfg._retry = true;
      try {
        await api.post('/auth/refresh');
        return api(cfg);
      } catch {
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
