import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Package, AlertTriangle, Users, HandHeart, PackageX, TrendingDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { obtenerAlertas } from '../api/inventario';
import type { Alertas } from '../types';
import Semaforo from '../components/ui/Semaforo';

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-GT', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    obtenerAlertas()
      .then(setAlertas)
      .catch(() => setAlertas(null))
      .finally(() => setLoading(false));
  }, []);

  const r = alertas?.resumen;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Bienvenido, {usuario?.nombreCompleto}</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard title="Medicamentos" value={loading ? '—' : String(r?.totalMedicamentos ?? 0)} icon={Package} color="blue" />
        <DashboardCard title="Por Vencer" value={loading ? '—' : String(r?.porVencer ?? 0)} icon={AlertTriangle} color="yellow" />
        <DashboardCard title="Dispensaciones Hoy" value={loading ? '—' : String(r?.dispensacionesHoy ?? 0)} icon={HandHeart} color="green" />
        <DashboardCard title="Beneficiarios" value={loading ? '—' : String(r?.beneficiarios ?? 0)} icon={Users} color="purple" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Stock bajo */}
        <AlertPanel
          title="Stock bajo"
          icon={TrendingDown}
          count={alertas?.stockBajo.length ?? 0}
          accent="text-red-600"
          empty="Todo el stock está por encima del mínimo"
          loading={loading}
        >
          {alertas?.stockBajo.slice(0, 8).map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">{m.nombreGenerico} <span className="text-gray-400">· {m.presentacion}</span></span>
              <span className="font-semibold text-red-600">{m.stockDisponible}<span className="text-xs font-normal text-gray-400">/{m.stockMinimo}</span></span>
            </li>
          ))}
        </AlertPanel>

        {/* Por vencer */}
        <AlertPanel
          title="Próximos a vencer"
          icon={AlertTriangle}
          count={alertas?.porVencer.length ?? 0}
          accent="text-amber-600"
          empty="No hay lotes próximos a vencer"
          loading={loading}
        >
          {alertas?.porVencer.slice(0, 8).map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">
                {l.medicamento.nombreGenerico}
                <span className="text-gray-400"> · lote {l.numeroLote}</span>
              </span>
              <Semaforo estado={l.semaforo} dias={l.diasParaVencer} />
            </li>
          ))}
        </AlertPanel>

        {/* Vencidos sin baja */}
        <AlertPanel
          title="Vencidos sin baja"
          icon={PackageX}
          count={alertas?.vencidos.length ?? 0}
          accent="text-gray-700"
          empty="No hay lotes vencidos pendientes de baja"
          loading={loading}
        >
          {alertas?.vencidos.slice(0, 8).map((l) => (
            <li key={l.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">
                {l.medicamento.nombreGenerico}
                <span className="text-gray-400"> · lote {l.numeroLote}</span>
              </span>
              <span className="text-xs text-gray-500">{fmtFecha(l.fechaVencimiento)}</span>
            </li>
          ))}
        </AlertPanel>
      </div>

      <div className="mt-6">
        <Link to="/inventario" className="text-sm font-medium text-primary-700 hover:text-primary-900">
          Ver inventario completo →
        </Link>
      </div>
    </div>
  );
}

function AlertPanel({
  title,
  icon: Icon,
  count,
  accent,
  empty,
  loading,
  children,
}: {
  title: string;
  icon: React.ElementType;
  count: number;
  accent: string;
  empty: string;
  loading: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <Icon size={16} className={accent} /> {title}
        </h2>
        {!loading && count > 0 && (
          <span className={`rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold ${accent}`}>{count}</span>
        )}
      </div>
      {loading ? (
        <p className="py-4 text-sm text-gray-400">Cargando...</p>
      ) : count === 0 ? (
        <p className="py-4 text-sm text-gray-400">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">{children}</ul>
      )}
    </div>
  );
}

function DashboardCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'yellow' | 'green' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-700',
    yellow: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    purple: 'bg-purple-50 text-purple-700',
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
