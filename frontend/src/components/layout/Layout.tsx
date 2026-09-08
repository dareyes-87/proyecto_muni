import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Package,
  PackagePlus,
  Boxes,
  BookMarked,
  HandHeart,
  Users,
  FileBarChart,
  Shield,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { cn } from '../../utils/cn';

type Rol = 'ADMIN' | 'ENCARGADO_BENEFICENCIA';

interface NavLeaf {
  name: string;
  href: string;
  icon: React.ElementType;
}
interface NavItem {
  name: string;
  icon: React.ElementType;
  roles: Rol[];
  href?: string;
  children?: NavLeaf[];
}

const AMBOS: Rol[] = ['ADMIN', 'ENCARGADO_BENEFICENCIA'];

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, roles: AMBOS },
  { name: 'Dispensación', href: '/dispensacion', icon: HandHeart, roles: AMBOS },
  { name: 'Beneficiarios', href: '/beneficiarios', icon: Users, roles: AMBOS },
  {
    name: 'Inventario',
    icon: Package,
    roles: AMBOS,
    children: [
      { name: 'Existencias', href: '/inventario', icon: Boxes },
      { name: 'Registrar entrada', href: '/entradas', icon: PackagePlus },
    ],
  },
  { name: 'Catálogos', href: '/catalogos', icon: BookMarked, roles: AMBOS },
  { name: 'Reportes', href: '/reportes', icon: FileBarChart, roles: ['ADMIN'] },
  {
    name: 'Administración',
    icon: ShieldCheck,
    roles: ['ADMIN'],
    children: [
      { name: 'Usuarios', href: '/usuarios', icon: Users },
      { name: 'Auditoría', href: '/auditoria', icon: Shield },
    ],
  },
];

const leafActive = 'bg-primary-700 text-white';
const leafIdle = 'text-primary-200 hover:bg-primary-700/50 hover:text-white';

const COLLAPSE_KEY = 'farmag_sidebar_collapsed';

export default function Layout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(COLLAPSE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? '1' : '0');
      } catch {
        /* almacenamiento no disponible: se pierde la preferencia, no es crítico */
      }
      return next;
    });
  };

  const rol = usuario?.rol as Rol | undefined;
  const filteredNav = useMemo(
    () => navigation.filter((item) => rol && item.roles.includes(rol)),
    [rol]
  );

  const groupHasActive = (item: NavItem) =>
    !!item.children?.some((c) => location.pathname.startsWith(c.href));
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(navigation.filter((i) => i.children).map((i) => [i.name, groupHasActive(i)]))
  );
  const toggleGroup = (name: string) =>
    setOpenGroups((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const closeMobile = () => setSidebarOpen(false);

  // El modo "rail" (solo iconos) aplica en escritorio cuando está colapsado, pero
  // NO cuando el usuario abrió el menú móvil (ahí siempre se muestra completo).
  const rail = collapsed && !sidebarOpen;

  // Al abrir un grupo desde el rail, primero se expande la barra.
  const abrirGrupoDesdeRail = (name: string) => {
    setCollapsed(false);
    try {
      localStorage.setItem(COLLAPSE_KEY, '0');
    } catch {
      /* noop */
    }
    setOpenGroups((prev) => ({ ...prev, [name]: true }));
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-30 flex w-64 transform flex-col bg-primary-800 text-white transition-all lg:static lg:translate-x-0',
          collapsed ? 'lg:w-16' : 'lg:w-64',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className={cn('flex h-16 shrink-0 items-center bg-primary-900', rail ? 'justify-center px-0' : 'justify-between px-4')}>
          {!rail && <h1 className="text-lg font-bold tracking-wide text-dorado-400">FarmaG</h1>}
          {rail ? (
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-700 text-sm font-bold text-dorado-400">
              FG
            </span>
          ) : (
            <button className="lg:hidden" onClick={closeMobile} aria-label="Cerrar menú">
              <X size={20} />
            </button>
          )}
        </div>

        <div className="flex flex-1 flex-col overflow-y-auto overflow-x-hidden [scrollbar-color:#006eae_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary-600 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
          <nav className="mt-4 space-y-1 px-2">
            {filteredNav.map((item) =>
              item.children ? (
                rail ? (
                  <button
                    key={item.name}
                    onClick={() => abrirGrupoDesdeRail(item.name)}
                    title={item.name}
                    className={cn(
                      'flex w-full items-center justify-center rounded-lg py-2.5 transition-colors',
                      groupHasActive(item) ? 'bg-primary-700 text-white' : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                    )}
                  >
                    <item.icon size={20} />
                  </button>
                ) : (
                  <div key={item.name}>
                    <button
                      onClick={() => toggleGroup(item.name)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                        groupHasActive(item) ? 'text-white' : 'text-primary-200 hover:text-white'
                      )}
                    >
                      <item.icon size={18} />
                      <span className="flex-1 text-left">{item.name}</span>
                      <ChevronDown
                        size={16}
                        className={cn('transition-transform', openGroups[item.name] && 'rotate-180')}
                      />
                    </button>
                    {openGroups[item.name] && (
                      <div className="mt-1 space-y-1 pl-4">
                        {item.children.map((child) => (
                          <NavLink
                            key={child.href}
                            to={child.href}
                            onClick={closeMobile}
                            className={({ isActive }) =>
                              cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                isActive ? leafActive : leafIdle
                              )
                            }
                          >
                            <child.icon size={16} />
                            {child.name}
                          </NavLink>
                        ))}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <NavLink
                  key={item.href}
                  to={item.href!}
                  end={item.href === '/'}
                  onClick={closeMobile}
                  title={rail ? item.name : undefined}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center rounded-lg text-sm font-medium transition-colors',
                      rail ? 'justify-center py-2.5' : 'gap-3 px-3 py-2.5',
                      isActive ? leafActive : leafIdle
                    )
                  }
                >
                  <item.icon size={rail ? 20 : 18} />
                  {!rail && item.name}
                </NavLink>
              )
            )}
          </nav>

          <div className={cn('mt-auto border-t border-primary-700', rail ? 'p-2' : 'p-4')}>
            {rail ? (
              <button
                onClick={handleLogout}
                title="Cerrar sesión"
                className="flex w-full items-center justify-center rounded-lg py-2 text-primary-300 transition-colors hover:bg-primary-700/50 hover:text-white"
              >
                <LogOut size={18} />
              </button>
            ) : (
              <>
                <div className="mb-2 text-sm text-primary-300">
                  <p className="font-medium text-white">{usuario?.nombreCompleto}</p>
                  <span className="mt-1 inline-block rounded-full bg-dorado-500/15 px-2 py-0.5 text-xs font-medium text-dorado-300 ring-1 ring-dorado-500/40">
                    {usuario?.rol === 'ADMIN' ? 'Administrador' : 'Enc. Beneficencia'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-sm text-primary-300 transition-colors hover:text-white"
                >
                  <LogOut size={16} />
                  Cerrar sesión
                </button>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={closeMobile} />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:px-6">
          {/* Toggle móvil */}
          <button className="lg:hidden" onClick={() => setSidebarOpen(true)} aria-label="Abrir menú">
            <Menu size={24} className="text-gray-600" />
          </button>
          {/* Toggle colapsar (escritorio) */}
          <button
            className="hidden text-gray-500 transition-colors hover:text-gray-800 lg:inline-flex"
            onClick={toggleCollapsed}
            aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
            title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          >
            {collapsed ? <PanelLeftOpen size={22} /> : <PanelLeftClose size={22} />}
          </button>
          <h2 className="text-lg font-semibold text-gray-800">Farmacia Municipal de Gualán</h2>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
