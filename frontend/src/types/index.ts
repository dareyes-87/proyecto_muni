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

export interface ResumenImportacionExcel {
  totalFilas: number;
  medicamentosCreados: number;
  medicamentosExistentes: number;
  categoriasCreadas: number;
  proveedoresCreados: number;
  ubicacionesCreadas: number;
  codigosBarrasVinculados: number;
  lotesRegistrados: number;
  errores: { fila: number; error: string }[];
  avisos: { fila: number; aviso: string }[];
}

export interface CodigoBarras {
  id: string;
  codigo: string;
  descripcion: string | null;
}

export interface MedicamentoCatalogo {
  id: string;
  nombreGenerico: string;
  nombreComercial: string | null;
  presentacion: string;
  concentracion: string | null;
  unidadMedida: string;
  categoriaId?: string;
  stockMinimo?: number;
  imagenUrl?: string | null;
  activo?: boolean;
  categoria?: CategoriaRef;
  codigosBarras?: CodigoBarras[];
}

export interface Proveedor {
  id: string;
  nombre: string;
  tipo: 'INSTITUCION' | 'PERSONA';
  contacto?: string | null;
  notas?: string | null;
  activo?: boolean;
}

export interface Ubicacion {
  id: string;
  codigo: string;
  descripcion: string | null;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface CatalogoPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
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

export type AccionAuditoria =
  | 'CREAR'
  | 'EDITAR'
  | 'ELIMINAR'
  | 'DISPENSAR'
  | 'BAJA'
  | 'LOGIN'
  | 'LOGOUT'
  | 'ACTIVAR'
  | 'DESACTIVAR';

export interface LogAuditoria {
  id: string;
  usuarioId: string;
  accion: AccionAuditoria;
  entidad: string;
  entidadId: string | null;
  datosAnteriores: unknown;
  datosNuevos: unknown;
  ipAddress: string | null;
  createdAt: string;
  usuario: { username: string; nombreCompleto: string } | null;
}

// ============================================
// REPORTES
// ============================================

export interface ReporteDispensacionRow {
  id: string;
  createdAt: string;
  observaciones: string | null;
  beneficiario: { nombreCompleto: string; dpi: string | null };
  usuario: { nombreCompleto: string; username: string };
  medicamentos: {
    medicamentoId: string;
    nombreGenerico: string;
    presentacion: string;
    concentracion: string | null;
    cantidad: number;
    codigoBarras: string | null;
  }[];
}

export interface ReporteConsumoRow {
  medicamentoId: string;
  nombreGenerico: string;
  presentacion: string;
  categoria: string;
  cantidadTotalDispensada: number;
  numeroDispensaciones: number;
}

export interface ReporteInventarioRow {
  loteId: string;
  numeroLote: string;
  medicamento: {
    id: string;
    nombreGenerico: string;
    presentacion: string;
    concentracion: string | null;
    categoria: string | null;
  };
  codigoBarras: string | null;
  cantidadActual: number;
  fechaVencimiento: string;
  diasParaVencer: number;
  semaforo: Semaforo;
  estado: EstadoLote;
  ubicacion: { codigo: string; descripcion: string | null } | null;
  origen: Origen;
  proveedor: string;
}

export interface ReportePorVencerRow {
  loteId: string;
  numeroLote: string;
  medicamento: { id: string; nombreGenerico: string; presentacion: string; categoria: string | null };
  codigoBarras: string | null;
  cantidadActual: number;
  fechaVencimiento: string;
  diasParaVencer: number;
  semaforo: Semaforo;
  ubicacion: { codigo: string } | null;
}

export interface ReporteEntradaRow {
  id: string;
  createdAt: string;
  origen: Origen;
  proveedor: string;
  usuario: string;
  totalLotes: number;
  totalUnidades: number;
  costoTotal: number;
  lotes: {
    numeroLote: string;
    medicamento: string;
    cantidad: number;
    costoUnitario: string | null;
    fechaVencimiento: string;
  }[];
}

export interface ReporteBajaRow {
  loteId: string;
  numeroLote: string;
  medicamento: { nombreGenerico: string; presentacion: string; categoria: string | null };
  estado: EstadoLote;
  fechaVencimiento: string;
  cantidadPerdida: number;
  costoUnitario: string | null;
  costoEstimado: number | null;
  proveedor: string;
}
