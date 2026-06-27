import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: agregar token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmarh_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: redirigir a login si el token expiró
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('farmarh_token');
      localStorage.removeItem('farmarh_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
