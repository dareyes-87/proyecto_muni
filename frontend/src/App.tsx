import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Dispensacion from './pages/Dispensacion';
import Beneficiarios from './pages/Beneficiarios';
import Inventario from './pages/Inventario';
import Entradas from './pages/Entradas';
import Usuarios from './pages/Usuarios';

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

        {/* === MÓDULO CATÁLOGOS (Audias) === */}
        {/* <Route path="medicamentos" element={<Medicamentos />} /> */}
        {/* <Route path="categorias" element={<Categorias />} /> */}
        {/* <Route path="proveedores" element={<Proveedores />} /> */}
        {/* <Route path="ubicaciones" element={<Ubicaciones />} /> */}

        {/* === MÓDULO DISPENSACIÓN (Jorge) === */}
        <Route path="dispensacion" element={<Dispensacion />} />
        <Route path="beneficiarios" element={<Beneficiarios />} />

        {/* === MÓDULO REPORTES (equipo) === */}
        {/* <Route path="reportes" element={<Reportes />} /> */}

        {/* === MÓDULO ADMIN (Daniel) === */}
        <Route path="usuarios" element={<AdminRoute><Usuarios /></AdminRoute>} />
        {/* <Route path="auditoria" element={<Auditoria />} /> */}
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
