import axios from 'axios';

// Dev: leave VITE_API_URL unset → Vite proxy handles /api → localhost:5000
// Prod: set VITE_API_URL=https://your-backend.onrender.com/api in Vercel env vars
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

// Auto-attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tf_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expiry globally — skip redirect on public pages
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const publicPaths = ['/login', '/register', '/forgot-password', '/reset-password', '/menu'];
      const isPublic = publicPaths.some((p) => window.location.pathname.startsWith(p));
      if (!isPublic) {
        localStorage.removeItem('tf_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
