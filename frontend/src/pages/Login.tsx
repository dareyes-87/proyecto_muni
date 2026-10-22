import { useState, FormEvent } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Pill } from 'lucide-react';

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
    <div className="min-h-screen flex bg-white">
      {/* Panel institucional (solo pantallas grandes) */}
      <aside className="hidden lg:flex w-[560px] shrink-0 relative overflow-hidden flex-col justify-between bg-[#0B4F8A] text-white px-14 py-12">
        <div aria-hidden className="pointer-events-none absolute -right-[180px] -top-[160px] w-[460px] h-[460px] rounded-full bg-white/5" />
        <div aria-hidden className="pointer-events-none absolute -left-[140px] -bottom-[120px] w-[320px] h-[320px] rounded-full bg-white/5" />

        <Marca className="relative" />

        <div className="relative flex justify-center">
          <div className="w-[300px] h-[300px] rounded-full bg-white flex items-center justify-center shadow-[0_0_0_14px_rgba(255,255,255,.12),0_0_0_30px_rgba(255,255,255,.06)] motion-safe:animate-[login-flotar_6s_ease-in-out_infinite]">
            <img src="/img/login-ilustracion.png" alt="" className="w-[210px] h-[210px] object-contain" />
          </div>
        </div>

        <div className="relative text-center">
          <h2 className="text-[36px] leading-tight font-extrabold tracking-tight">Farmacia Municipal de Gualán</h2>
          <p className="mt-2 text-[17px] text-[#D6E4F2]">Programa de beneficencia municipal</p>
        </div>
      </aside>

      {/* Formulario */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[380px] flex flex-col gap-[22px]">
          <Marca className="lg:hidden justify-center text-[#0A2E52]" />

          <img
            src="/img/logo-municipalidad.png"
            alt="Municipalidad de Gualán"
            className="w-[210px] mx-auto"
          />

          <div>
            <h1 className="text-[28px] font-bold text-[#10233A]">Iniciar sesión</h1>
            <p className="mt-1 text-[15px] text-[#52637A]">
              Ingrese con la cuenta asignada por el administrador.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-[22px]">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username" className="text-sm font-medium text-[#10233A]">
                Usuario
              </label>
              <input
                id="username"
                className={inputClass}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
                placeholder="Ej. mlopez"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm font-medium text-[#10233A]">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-[10px] bg-[#0B4F8A] hover:bg-[#083A66] text-white text-base font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0B4F8A] focus-visible:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Ingresando...' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-[13px] text-[#52637A]">
            ¿Olvidó su contraseña? Solicítela al administrador del sistema.
          </p>
        </div>
      </main>
    </div>
  );
}

const inputClass =
  'w-full h-12 px-3.5 rounded-[10px] border-[1.5px] border-[#C9D3DF] text-[15px] text-[#10233A] placeholder:text-[#8A97A8] focus:outline-none focus:border-[#0B4F8A] focus:ring-2 focus:ring-[#0B4F8A]/25 transition-colors';

function Marca({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="w-11 h-11 rounded-xl bg-[#F5C518] flex items-center justify-center">
        <Pill className="text-[#0A2E52]" size={24} />
      </div>
      <span className="text-[22px] font-extrabold">FarmaG</span>
    </div>
  );
}
