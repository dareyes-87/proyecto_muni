import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor: agregar token JWT a cada petición
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('farmag_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor: redirigir a login si el token expiró.
// Se excluye la propia ruta de login: un 401/429 ahí es un intento fallido o un
// bloqueo por demasiados intentos, no una sesión vencida, y recargar ocultaría el
// mensaje de error (H-32).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url: string = error.config?.url || '';
    const esLogin = url.includes('/auth/login');
    if (error.response?.status === 401 && !esLogin) {
      localStorage.removeItem('farmag_token');
      localStorage.removeItem('farmag_usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
