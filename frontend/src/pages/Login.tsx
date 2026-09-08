import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Pill } from 'lucide-react';
import Button from '../components/ui/Button';
import { Field, TextInput } from '../components/ui/Field';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, usuario } = useAuth();
  const navigate = useNavigate();

  if (usuario) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(username, password);
      toast.success('Bienvenido al sistema');
      navigate('/');
    } catch (error: any) {
      const message = error.response?.data?.error || 'Error al iniciar sesión';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary-100 rounded-xl mb-4 ring-2 ring-dorado-400/60">
            <Pill className="text-dorado-600" size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">FarmaG</h1>
          <p className="text-sm text-gray-500 mt-1">Farmacia Municipal de Gualán</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Usuario" htmlFor="username">
            <TextInput
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              autoFocus
              placeholder="Ingrese su usuario"
            />
          </Field>

          <Field label="Contraseña" htmlFor="password">
            <TextInput
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Ingrese su contraseña"
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full py-2.5">
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </Button>
        </form>
      </div>
    </div>
  );
}
