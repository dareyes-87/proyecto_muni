import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import api from '../api/client';

interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  rol: 'ADMIN' | 'ENCARGADO_BENEFICENCIA';
  email?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('farmag_token');
    const savedUser = localStorage.getItem('farmag_usuario');

    if (!savedToken) {
      setLoading(false);
      return;
    }

    setToken(savedToken);
    // Render inmediato con la copia local, pero el rol REAL se confirma con el
    // servidor: la copia en localStorage no es confiable (puede editarse) (H-19).
    if (savedUser) {
      try {
        setUsuario(JSON.parse(savedUser));
      } catch {
        /* copia corrupta: se ignora, se usará la del servidor */
      }
    }

    api
      .get('/auth/perfil')
      .then((res) => {
        const u = res.data;
        const usuarioServidor: Usuario = {
          id: u.id,
          username: u.username,
          nombreCompleto: u.nombreCompleto,
          rol: u.rol,
          email: u.email ?? undefined,
        };
        setUsuario(usuarioServidor);
        localStorage.setItem('farmag_usuario', JSON.stringify(usuarioServidor));
      })
      .catch(() => {
        // Token inválido/expirado: el interceptor de client.ts ya limpia y redirige en 401.
      })
      .finally(() => setLoading(false));
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, usuario: newUsuario } = response.data;

    localStorage.setItem('farmag_token', newToken);
    localStorage.setItem('farmag_usuario', JSON.stringify(newUsuario));

    setToken(newToken);
    setUsuario(newUsuario);
  };

  const logout = () => {
    localStorage.removeItem('farmag_token');
    localStorage.removeItem('farmag_usuario');
    setToken(null);
    setUsuario(null);
  };

  const isAdmin = usuario?.rol === 'ADMIN';

  return (
    <AuthContext.Provider value={{ usuario, token, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}
