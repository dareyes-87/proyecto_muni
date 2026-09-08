import { useSearchParams } from 'react-router-dom';
import { Pill, Tags, MapPin } from 'lucide-react';
import PageHeader from '../../components/ui/PageHeader';
import { cn } from '../../utils/cn';
import Medicamentos from './Medicamentos';
import Categorias from './Categorias';
import Ubicaciones from './Ubicaciones';

const TABS = [
  { key: 'medicamentos', label: 'Medicamentos', icon: Pill, Panel: Medicamentos },
  { key: 'categorias', label: 'Categorías', icon: Tags, Panel: Categorias },
  { key: 'ubicaciones', label: 'Ubicaciones', icon: MapPin, Panel: Ubicaciones },
] as const;

/** Página única de catálogos con pestañas internas. Reemplaza las rutas/items
 *  de menú separados (Medicamentos, Categorías, Ubicaciones). */
export default function Catalogos() {
  const [params, setParams] = useSearchParams();
  const activeKey = TABS.find((t) => t.key === params.get('tab'))?.key ?? 'medicamentos';
  const Active = TABS.find((t) => t.key === activeKey)!.Panel;

  return (
    <div>
      <PageHeader
        title="Catálogos"
        subtitle="Datos maestros: medicamentos, categorías y ubicaciones"
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-gray-200">
        {TABS.map((tab) => {
          const active = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              onClick={() => setParams({ tab: tab.key }, { replace: true })}
              className={cn(
                '-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'border-primary-700 text-primary-800'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <Active />
    </div>
  );
}
