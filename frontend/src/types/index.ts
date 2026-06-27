export type Semaforo = 'VERDE' | 'AMARILLO' | 'ROJO' | 'VENCIDO';
export type EstadoLote = 'DISPONIBLE' | 'AGOTADO' | 'VENCIDO' | 'DADO_DE_BAJA';
export type Origen = 'DONACION' | 'PRESUPUESTO_MUNICIPAL';
export type Rol = 'ADMIN' | 'ENCARGADO_BENEFICENCIA';

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface CategoriaRef {
  id: string;
  nombre: string;
}

export interface InventarioRow {
  id: string;
  nombreGenerico: string;
  nombreComercial: string | null;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
  categoria: CategoriaRef | null;
  stockMinimo: number;
  stockDisponible: number;
  numeroLotes: number;
  proximoVencimiento: string | null;
  diasProximoVencimiento: number | null;
  semaforo: Semaforo | null;
  stockBajo: boolean;
}

export interface LoteDetalle {
  id: string;
  numeroLote: string;
  cantidad: number;
  cantidadActual: number;
  fechaVencimiento: string;
  costoUnitario: string | null;
  estado: EstadoLote;
  diasParaVencer: number;
  semaforo: Semaforo;
  ubicacion: { id: string; codigo: string; descripcion: string | null } | null;
  entrada: {
    id: string;
    origen: Origen;
    createdAt: string;
    proveedor: { id: string; nombre: string };
  };
}

export interface MedicamentoDetalle {
  id: string;
  nombreGenerico: string;
  nombreComercial: string | null;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
  categoria: CategoriaRef | null;
  codigosBarras: { id: string; codigo: string; descripcion: string | null }[];
  stockMinimo: number;
  stockDisponible: number;
  stockBajo: boolean;
  lotes: LoteDetalle[];
}

export interface Alertas {
  stockBajo: {
    id: string;
    nombreGenerico: string;
    presentacion: string;
    stockDisponible: number;
    stockMinimo: number;
  }[];
  porVencer: {
    id: string;
    numeroLote: string;
    medicamento: { id: string; nombreGenerico: string; presentacion: string };
    cantidadActual: number;
    fechaVencimiento: string;
    diasParaVencer: number;
    semaforo: Semaforo;
  }[];
  vencidos: {
    id: string;
    numeroLote: string;
    medicamento: { id: string; nombreGenerico: string; presentacion: string };
    cantidadActual: number;
    fechaVencimiento: string;
    diasVencido: number;
  }[];
  resumen: {
    totalMedicamentos: number;
    stockBajo: number;
    porVencer: number;
    vencidos: number;
    dispensacionesHoy: number;
    beneficiarios: number;
  };
}

export interface Umbrales {
  rojo: number;
  amarillo: number;
}

export interface MedicamentoCatalogo {
  id: string;
  nombreGenerico: string;
  nombreComercial: string | null;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
  categoria?: CategoriaRef;
}

export interface Proveedor {
  id: string;
  nombre: string;
  tipo: 'INSTITUCION' | 'PERSONA';
}

export interface Ubicacion {
  id: string;
  codigo: string;
  descripcion: string | null;
}

export interface Usuario {
  id: string;
  username: string;
  nombreCompleto: string;
  email: string | null;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
}
