import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  AlertTriangle,
  HandHeart,
  PackageX,
  TrendingDown,
  PackagePlus,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { obtenerAlertas, listarEntradas } from '../api/inventario';
import type { Alertas } from '../types';
import Semaforo from '../components/ui/Semaforo';
import Card from '../components/ui/Card';
import { formatFecha, formatFechaHora } from '../utils/formatDate';

interface EntradaReciente {
  id: string;
  createdAt: string;
  usuario?: { nombreCompleto: string };
  _count?: { lotes: number };
}

export default function Dashboard() {
  const { usuario } = useAuth();
  const [alertas, setAlertas] = useState<Alertas | null>(null);
  const [entradas, setEntradas] = useState<EntradaReciente[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      obtenerAlertas().catch(() => null),
      listarEntradas().then((r) => r.data as EntradaReciente[]).catch(() => []),
    ])
      .then(([a, e]) => {
        setAlertas(a);
        setEntradas(e.slice(0, 6));
      })
      .finally(() => setLoading(false));
  }, []);

  const r = alertas?.resumen;
  const nStockBajo = alertas?.stockBajo.length ?? 0;
  const nPorVencer = alertas?.porVencer.length ?? 0;
  const nVencidos = alertas?.vencidos.length ?? 0;
  const totalAtencion = nStockBajo + nPorVencer + nVencidos;
  const hoy = fechaLarga();

  const verInventario = (
    <Link to="/inventario" className={sectionLink}>
      Ver inventario <ArrowRight size={14} />
    </Link>
  );
  const irRegistrarEntrada = (
    <Link to="/entradas" className={sectionLink}>
      Registrar entrada <ArrowRight size={14} />
    </Link>
  );

  return (
    <div className="space-y-8">
      {/* 1-2. Encabezado + resumen rápido del estado */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">Hola, {usuario?.nombreCompleto}</h1>
          <p className="text-sm text-gray-500">{hoy}</p>
        </div>

        {loading ? (
          <Card className="animate-pulse text-sm text-gray-400">Cargando estado del sistema...</Card>
        ) : totalAtencion === 0 ? (
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <CheckCircle2 className="shrink-0 text-emerald-600" size={20} />
            <p className="text-sm font-medium text-emerald-800">
              Todo en orden. No hay alertas de inventario que requieran atención.
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <AlertTriangle className="shrink-0 text-amber-600" size={20} />
            <p className="text-sm font-medium text-amber-800">
              {totalAtencion} {totalAtencion === 1 ? 'asunto requiere' : 'asuntos requieren'} tu atención hoy.
              {nStockBajo > 0 && ` ${nStockBajo} con stock bajo.`}
              {nPorVencer > 0 && ` ${nPorVencer} por vencer.`}
              {nVencidos > 0 && ` ${nVencidos} vencidos sin baja.`}
            </p>
          </div>
        )}
      </div>

      {/* 3. Acciones principales */}
      <section>
        <SectionHeader title="Acciones rápidas" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <QuickAction to="/dispensacion" icon={HandHeart} title="Dispensar medicamento" description="Buscar beneficiario y entregar medicamentos" />
          <QuickAction to="/entradas" icon={PackagePlus} title="Registrar entrada" description="Ingresar lotes recibidos al inventario" />
        </div>
      </section>

      {/* 4. Métricas clave */}
      <section>
        <SectionHeader title="Resumen" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard to="/catalogos" title="Medicamentos" value={loading ? '—' : String(r?.totalMedicamentos ?? 0)} icon={Package} color="blue" />
          <StatCard to="/inventario" title="Stock bajo" value={loading ? '—' : String(r?.stockBajo ?? 0)} icon={TrendingDown} color="red" />
          <StatCard to="/inventario" title="Por vencer" value={loading ? '—' : String(r?.porVencer ?? 0)} icon={AlertTriangle} color="amber" />
          <StatCard to="/dispensacion" title="Dispensaciones hoy" value={loading ? '—' : String(r?.dispensacionesHoy ?? 0)} icon={HandHeart} color="green" />
        </div>
      </section>

      {/* 5. Alertas / requiere atención */}
      <section>
        <SectionHeader title="Requiere atención" action={verInventario} />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AlertPanel title="Stock bajo" icon={TrendingDown} count={nStockBajo} accent="text-red-600" empty="Todo el stock está por encima del mínimo" loading={loading}>
            {alertas?.stockBajo.slice(0, 8).map((m) => (
              <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">
                  {m.nombreGenerico} <span className="text-gray-400">· {m.presentacion}</span>
                </span>
                <span className="font-semibold text-red-600">
                  {m.stockDisponible}
                  <span className="text-xs font-normal text-gray-400">/{m.stockMinimo}</span>
                </span>
              </li>
            ))}
          </AlertPanel>

          <AlertPanel title="Próximos a vencer" icon={AlertTriangle} count={nPorVencer} accent="text-amber-600" empty="No hay lotes próximos a vencer" loading={loading}>
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

          <AlertPanel title="Vencidos sin baja" icon={PackageX} count={nVencidos} accent="text-gray-700" empty="No hay lotes vencidos pendientes de baja" loading={loading}>
            {alertas?.vencidos.slice(0, 8).map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">
                  {l.medicamento.nombreGenerico}
                  <span className="text-gray-400"> · lote {l.numeroLote}</span>
                </span>
                <span className="text-xs text-gray-500">{formatFecha(l.fechaVencimiento)}</span>
              </li>
            ))}
          </AlertPanel>
        </div>
      </section>

      {/* 6. Información secundaria */}
      <section>
        <SectionHeader title="Entradas recientes" action={irRegistrarEntrada} />
        <Card flush>
          {loading ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">Cargando...</p>
          ) : entradas.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-gray-400">No hay entradas registradas todavía</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {entradas.map((e) => (
                <li key={e.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-700">
                      <PackagePlus size={16} />
                    </span>
                    <div>
                      <p className="font-medium text-gray-800">
                        {e._count?.lotes ?? 0} lote{(e._count?.lotes ?? 0) === 1 ? '' : 's'} ingresado{(e._count?.lotes ?? 0) === 1 ? '' : 's'}
                      </p>
                      <p className="text-xs text-gray-400">{e.usuario?.nombreCompleto ?? '—'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500">{formatFechaHora(e.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>
    </div>
  );
}

/** Fecha larga en español para el encabezado, ej. "Lunes, 7 de septiembre de 2026". */
function fechaLarga(): string {
  try {
    const s = new Date().toLocaleDateString('es-GT', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return formatFecha(new Date());
  }
}

const sectionLink =
  'inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-900';

/** Encabezado de sección: etiqueta corta en mayúsculas + acción opcional. */
function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">{title}</h2>
      {action}
    </div>
  );
}

function QuickAction({
  to,
  icon: Icon,
  title,
  description,
}: {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-primary-300 hover:bg-primary-50/40"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-700">
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900">{title}</p>
        <p className="truncate text-sm text-gray-500">{description}</p>
      </div>
      <ArrowRight size={18} className="shrink-0 text-gray-300 transition-colors group-hover:text-primary-600" />
    </Link>
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
    <Card>
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
    </Card>
  );
}

function StatCard({
  to,
  title,
  value,
  icon: Icon,
  color,
}: {
  to: string;
  title: string;
  value: string;
  icon: React.ElementType;
  color: 'blue' | 'amber' | 'green' | 'red';
}) {
  const colors = {
    blue: 'bg-primary-50 text-primary-700',
    amber: 'bg-amber-50 text-amber-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <Link to={to} className="rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300 hover:bg-gray-50">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`rounded-lg p-1.5 ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </Link>
  );
}
