import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Captura from './pages/Captura';
import Dashboard from './pages/Dashboard';
import Dispensacion from './pages/Dispensacion';
import Beneficiarios from './pages/Beneficiarios';
import Inventario from './pages/Inventario';
import Entradas from './pages/Entradas';
import Usuarios from './pages/Usuarios';
import Auditoria from './pages/Auditoria';
import Reportes from './pages/Reportes';
import Catalogos from './pages/Catalogos';

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { usuario } = useAuth();
  if (usuario?.rol !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { usuario, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Captura de evidencia desde el celular: pública a propósito y fuera del
          Layout — se abre escaneando el QR, sin sesión iniciada. */}
      <Route path="/captura/:token" element={<Captura />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />

        {/* === MÓDULO INVENTARIO (Daniel) === */}
        <Route path="inventario" element={<Inventario />} />
        <Route path="entradas" element={<Entradas />} />

        {/* === MÓDULO CATÁLOGOS (Audias) — página única con pestañas === */}
        <Route path="catalogos" element={<Catalogos />} />
        {/* Redirecciones de las rutas antiguas de catálogos */}
        <Route path="medicamentos" element={<Navigate to="/catalogos?tab=medicamentos" replace />} />
        <Route path="categorias" element={<Navigate to="/catalogos?tab=categorias" replace />} />
        <Route path="ubicaciones" element={<Navigate to="/catalogos?tab=ubicaciones" replace />} />

        {/* === MÓDULO DISPENSACIÓN (Jorge) === */}
        <Route path="dispensacion" element={<Dispensacion />} />
        <Route path="beneficiarios" element={<Beneficiarios />} />

        {/* === MÓDULO REPORTES (equipo) === */}
        <Route path="reportes" element={<AdminRoute><Reportes /></AdminRoute>} />

        {/* === MÓDULO ADMIN (Daniel) === */}
        <Route path="usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
        <Route path="auditoria" element={<AdminRoute><Auditoria /></AdminRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
