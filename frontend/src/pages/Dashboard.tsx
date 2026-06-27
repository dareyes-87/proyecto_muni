import { useAuth } from '../context/AuthContext';
import { Package, AlertTriangle, Users, HandHeart } from 'lucide-react';

export default function Dashboard() {
  const { usuario } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Bienvenido, {usuario?.nombreCompleto}
      </h1>

      {/* Tarjetas resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <DashboardCard
          title="Medicamentos"
          value="—"
          icon={Package}
          color="blue"
        />
        <DashboardCard
          title="Por Vencer"
          value="—"
          icon={AlertTriangle}
          color="yellow"
        />
        <DashboardCard
          title="Dispensaciones Hoy"
          value="—"
          icon={HandHeart}
          color="green"
        />
        <DashboardCard
          title="Beneficiarios"
          value="—"
          icon={Users}
          color="purple"
        />
      </div>

      {/* Panel de alertas */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Alertas del Sistema</h2>
        <p className="text-gray-500 text-sm">
          Las alertas de stock bajo, medicamentos por vencer y lotes vencidos aparecerán aquí
          una vez que se implemente el módulo de inventario.
        </p>
      </div>
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
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={18} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
