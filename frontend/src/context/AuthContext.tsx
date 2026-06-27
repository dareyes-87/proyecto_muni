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
    const savedToken = localStorage.getItem('farmarh_token');
    const savedUser = localStorage.getItem('farmarh_usuario');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUsuario(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    const response = await api.post('/auth/login', { username, password });
    const { token: newToken, usuario: newUsuario } = response.data;

    localStorage.setItem('farmarh_token', newToken);
    localStorage.setItem('farmarh_usuario', JSON.stringify(newUsuario));

    setToken(newToken);
    setUsuario(newUsuario);
  };

  const logout = () => {
    localStorage.removeItem('farmarh_token');
    localStorage.removeItem('farmarh_usuario');
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
