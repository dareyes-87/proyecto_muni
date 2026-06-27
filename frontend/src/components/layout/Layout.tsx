import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Pill,
  HandHeart,
  Users,
  FileBarChart,
  Shield,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Inventario', href: '/inventario', icon: Package, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Registrar Entrada', href: '/entradas', icon: PackagePlus, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Medicamentos', href: '/medicamentos', icon: Pill, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Dispensación', href: '/dispensacion', icon: HandHeart, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Beneficiarios', href: '/beneficiarios', icon: Users, roles: ['ADMIN', 'ENCARGADO_BENEFICENCIA'] },
  { name: 'Reportes', href: '/reportes', icon: FileBarChart, roles: ['ADMIN'] },
  { name: 'Usuarios', href: '/usuarios', icon: Users, roles: ['ADMIN'] },
  { name: 'Auditoría', href: '/auditoria', icon: Shield, roles: ['ADMIN'] },
];

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const filteredNav = navigation.filter(
    (item) => usuario && item.roles.includes(usuario.rol)
  );

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-primary-800 text-white transform transition-transform lg:translate-x-0 lg:static
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between h-16 px-4 bg-primary-900">
          <h1 className="text-lg font-bold tracking-wide">FarmaRH</h1>
          <button className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="mt-4 px-2 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-700 text-white'
                    : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-primary-700">
          <div className="text-sm text-primary-300 mb-2">
            <p className="font-medium text-white">{usuario?.nombreCompleto}</p>
            <p className="text-xs">{usuario?.rol === 'ADMIN' ? 'Administrador' : 'Enc. Beneficencia'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-primary-300 hover:text-white transition-colors"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-4 lg:px-6">
          <button className="lg:hidden mr-3" onClick={() => setSidebarOpen(true)}>
            <Menu size={24} className="text-gray-600" />
          </button>
          <h2 className="text-lg font-semibold text-gray-800">
            Farmacia Municipal de Gualán
          </h2>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
