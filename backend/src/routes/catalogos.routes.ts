import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, requireRole } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';

const router = Router();
const prisma = new PrismaClient();

// ============================================
// MEDICAMENTOS
// ============================================

router.get('/medicamentos', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const q = (req.query.q as string) || undefined;

    const where: any = { activo: true };
    if (q) {
      where.OR = [
        { nombreGenerico: { contains: q, mode: 'insensitive' } },
        { nombreComercial: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [medicamentos, total] = await Promise.all([
      prisma.medicamento.findMany({
        where, skip, take: limit,
        orderBy: { nombreGenerico: 'asc' },
        include: { categoria: true, codigosBarras: true },
      }),
      prisma.medicamento.count({ where }),
    ]);

    res.json({ data: medicamentos, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('Error listando medicamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/catalogos/medicamentos/buscar?q=aceta
router.get('/medicamentos/buscar', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const q = (req.query.q as string)?.trim();

    if (!q) {
      res.json({ data: [] });
      return;
    }

    const medicamentos = await prisma.medicamento.findMany({
      where: {
        activo: true,
        OR: [
          { nombreGenerico: { contains: q, mode: 'insensitive' } },
          { nombreComercial: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: { categoria: true, codigosBarras: true },
      take: 20,
      orderBy: { nombreGenerico: 'asc' },
    });

    res.json({ data: medicamentos });
  } catch (error) {
    console.error('Error buscando medicamentos:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// GET /api/catalogos/medicamentos/barcode/:codigo
router.get('/medicamentos/barcode/:codigo', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo } = req.params as { codigo: string };

    const codigoBarras = await prisma.codigoBarras.findUnique({
      where: { codigo },
      include: { medicamento: { include: { categoria: true, codigosBarras: true } } },
    });

    if (!codigoBarras) {
      res.status(404).json({ error: 'Código de barras no registrado' });
      return;
    }

    const stockActual = await prisma.lote.aggregate({
      where: { medicamentoId: codigoBarras.medicamentoId, estado: 'DISPONIBLE' },
      _sum: { cantidadActual: true },
    });

    res.json({
      data: {
        ...codigoBarras.medicamento,
        stockActual: stockActual._sum.cantidadActual || 0,
      },
    });
  } catch (error) {
    console.error('Error buscando por código de barras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// GET /api/catalogos/medicamentos/lookup-fda/:codigoBarras
// Consulta de referencia en OpenFDA para auto-llenar el formulario de "Nuevo medicamento"
// cuando el código de barras no existe localmente. No requiere rol específico.
// ============================================

/**
 * Extrae el NDC-10 (10 dígitos, sin guiones) de un GTIN-14/EAN-13/UPC-A de un envase
 * farmacéutico de EE.UU. Estructura estándar del GTIN de un NDC:
 * [2 dígitos de relleno][1 dígito indicador][NDC-10 (10 dígitos)][1 dígito verificador] = 14 dígitos.
 */
function gtinToNdc10(codigoBarras: string): string | null {
  const digitos = codigoBarras.replace(/\D/g, '');
  if (!digitos) return null;
  const gtin14 = digitos.padStart(14, '0');
  if (gtin14.length !== 14) return null;
  const sinDigitoVerificador = gtin14.slice(0, 13); // quita el último dígito (verificador)
  const ndc10 = sinDigitoVerificador.slice(3); // quita relleno(2) + indicador(1)
  return ndc10.length === 10 ? ndc10 : null;
}

/** El formato de guiones del NDC (4-4-2, 5-3-2 o 5-4-1) depende del labeler; se prueban los tres. */
function candidatosNdc(ndc10: string): string[] {
  return [
    `${ndc10.slice(0, 4)}-${ndc10.slice(4, 8)}-${ndc10.slice(8, 10)}`,
    `${ndc10.slice(0, 5)}-${ndc10.slice(5, 8)}-${ndc10.slice(8, 10)}`,
    `${ndc10.slice(0, 5)}-${ndc10.slice(5, 9)}-${ndc10.slice(9, 10)}`,
  ];
}

function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(' ');
}

async function fetchConTimeout(url: string, ms = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

router.get(
  '/medicamentos/lookup-fda/:codigoBarras',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { codigoBarras } = req.params as { codigoBarras: string };
      const ndc10 = gtinToNdc10(codigoBarras);
      if (!ndc10) {
        res.json({ found: false });
        return;
      }

      for (const candidato of candidatosNdc(ndc10)) {
        let respuesta;
        try {
          respuesta = await fetchConTimeout(
            `https://api.fda.gov/drug/label.json?search=openfda.package_ndc:"${candidato}"&limit=1`
          );
        } catch {
          continue; // timeout o error de red: probar el siguiente formato de NDC
        }
        if (!respuesta.ok) continue;

        const json = (await respuesta.json()) as { results?: any[] };
        const resultado = json?.results?.[0];
        if (!resultado) continue;

        const openfda = resultado.openfda || {};
        const nombreGenerico = openfda.generic_name?.[0] || null;
        const nombreComercial = openfda.brand_name?.[0] || null;
        const presentacion = openfda.dosage_form?.[0] || null;
        const activo = Array.isArray(resultado.active_ingredient) ? resultado.active_ingredient[0] : null;
        const categoriaSugerida = openfda.pharm_class_epc?.[0] || openfda.pharm_class_moa?.[0] || null;

        res.json({
          found: true,
          ndcConsultado: candidato,
          nombreGenerico: nombreGenerico ? capitalizar(nombreGenerico) : null,
          nombreComercial: nombreComercial ? capitalizar(nombreComercial) : null,
          presentacion: presentacion ? capitalizar(presentacion) : null,
          concentracion: typeof activo === 'string' ? activo.slice(0, 100) : null,
          unidadMedida: presentacion ? capitalizar(presentacion) : null,
          categoriaSugerida: categoriaSugerida ? capitalizar(categoriaSugerida) : null,
        });
        return;
      }

      res.json({ found: false });
    } catch (error) {
      console.error('Error consultando OpenFDA:', error);
      res.json({ found: false });
    }
  }
);

const medicamentoSchema = z.object({
  nombreGenerico: z.string().min(2, 'El nombre genérico es requerido'),
  nombreComercial: z.string().optional().nullable(),
  presentacion: z.string().min(1, 'La presentación es requerida'),
  concentracion: z.string().optional().nullable(),
  unidadMedida: z.string().min(1, 'La unidad de medida es requerida'),
  categoriaId: z.string().uuid('categoriaId debe ser un UUID válido'),
  stockMinimo: z.number().int().nonnegative().optional(),
});

// POST /api/catalogos/medicamentos
// Body adicional opcional: forzarCreacion: true → ignora la advertencia de duplicados y crea de todos modos
router.post('/medicamentos', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = medicamentoSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Datos inválidos', detalles: parsed.error.flatten() });
      return;
    }

    const datos = parsed.data;
    const forzarCreacion = req.body.forzarCreacion === true;

    const categoria = await prisma.categoria.findUnique({ where: { id: datos.categoriaId } });
    if (!categoria) {
      res.status(400).json({ error: 'La categoría especificada no existe' });
      return;
    }

    // Detección de duplicados: nombre genérico similar + misma presentación + misma concentración
    const candidatos = await prisma.medicamento.findMany({
      where: {
        nombreGenerico: { contains: datos.nombreGenerico, mode: 'insensitive' },
        presentacion: { equals: datos.presentacion, mode: 'insensitive' },
      },
      include: { categoria: true },
    });

    const concentracionNueva = (datos.concentracion || '').toLowerCase().trim();
    const similares = candidatos.filter(
      (m) => (m.concentracion || '').toLowerCase().trim() === concentracionNueva
    );

    if (similares.length > 0 && !forzarCreacion) {
      res.json({
        advertencia: true,
        mensaje: 'Se encontraron medicamentos similares. Revisa antes de continuar o confirma el registro.',
        similares,
      });
      return;
    }

    const medicamento = await prisma.medicamento.create({
      data: {
        nombreGenerico: datos.nombreGenerico,
        nombreComercial: datos.nombreComercial || null,
        presentacion: datos.presentacion,
        concentracion: datos.concentracion || null,
        unidadMedida: datos.unidadMedida,
        categoriaId: datos.categoriaId,
        stockMinimo: datos.stockMinimo ?? 10,
      },
      include: { categoria: true, codigosBarras: true },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'medicamento',
      entidadId: medicamento.id,
      datosNuevos: medicamento,
      ipAddress: req.ip,
    });

    res.status(201).json({ data: medicamento });
  } catch (error) {
    console.error('Error creando medicamento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/catalogos/medicamentos/:id
const CAMPOS_EDITABLES_MEDICAMENTO = [
  'nombreGenerico',
  'nombreComercial',
  'presentacion',
  'concentracion',
  'unidadMedida',
  'categoriaId',
  'stockMinimo',
  'activo',
] as const;

router.put('/medicamentos/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const existente = await prisma.medicamento.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Medicamento no encontrado' });
      return;
    }

    if (req.body.categoriaId !== undefined) {
      const categoria = await prisma.categoria.findUnique({ where: { id: req.body.categoriaId } });
      if (!categoria) {
        res.status(400).json({ error: 'La categoría especificada no existe' });
        return;
      }
    }

    const datosActualizados: Record<string, unknown> = {};
    const datosAnteriores: Record<string, unknown> = {};
    const datosNuevos: Record<string, unknown> = {};

    for (const campo of CAMPOS_EDITABLES_MEDICAMENTO) {
      if (campo in req.body && req.body[campo] !== (existente as Record<string, unknown>)[campo]) {
        datosActualizados[campo] = req.body[campo];
        datosAnteriores[campo] = (existente as Record<string, unknown>)[campo];
        datosNuevos[campo] = req.body[campo];
      }
    }

    if (Object.keys(datosActualizados).length === 0) {
      res.json({ data: existente, mensaje: 'No hubo cambios que aplicar' });
      return;
    }

    const medicamento = await prisma.medicamento.update({
      where: { id },
      data: datosActualizados,
      include: { categoria: true, codigosBarras: true },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'medicamento',
      entidadId: id,
      datosAnteriores,
      datosNuevos,
      ipAddress: req.ip,
    });

    res.json({ data: medicamento });
  } catch (error) {
    console.error('Error editando medicamento:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// CÓDIGOS DE BARRAS
// ============================================

// POST /api/catalogos/medicamentos/:id/codigos
router.post('/medicamentos/:id/codigos', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };
    const { codigo, descripcion } = req.body;

    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      res.status(400).json({ error: 'El código de barras es requerido' });
      return;
    }

    const medicamento = await prisma.medicamento.findUnique({ where: { id } });
    if (!medicamento) {
      res.status(404).json({ error: 'Medicamento no encontrado' });
      return;
    }

    const yaExiste = await prisma.codigoBarras.findUnique({ where: { codigo } });
    if (yaExiste) {
      res.status(409).json({ error: 'Este código de barras ya está registrado en otro medicamento' });
      return;
    }

    const nuevoCodigo = await prisma.codigoBarras.create({
      data: { codigo: codigo.trim(), descripcion: descripcion || null, medicamentoId: id },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'codigo_barras',
      entidadId: nuevoCodigo.id,
      datosNuevos: nuevoCodigo,
      ipAddress: req.ip,
    });

    res.status(201).json({ data: nuevoCodigo });
  } catch (error) {
    console.error('Error agregando código de barras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// DELETE /api/catalogos/codigos/:id
router.delete('/codigos/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const codigoBarras = await prisma.codigoBarras.findUnique({ where: { id } });
    if (!codigoBarras) {
      res.status(404).json({ error: 'Código de barras no encontrado' });
      return;
    }

    await prisma.codigoBarras.delete({ where: { id } });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'ELIMINAR',
      entidad: 'codigo_barras',
      entidadId: id,
      datosAnteriores: codigoBarras,
      ipAddress: req.ip,
    });

    res.json({ mensaje: 'Código de barras eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando código de barras:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// CATEGORÍAS
// ============================================

// GET /api/catalogos/categorias
router.get('/categorias', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const categorias = await prisma.categoria.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
    res.json({ data: categorias });
  } catch (error) {
    console.error('Error listando categorías:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/catalogos/categorias
router.post('/categorias', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, descripcion } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      res.status(400).json({ error: 'El nombre de la categoría es requerido' });
      return;
    }

    const existente = await prisma.categoria.findUnique({ where: { nombre } });
    if (existente) {
      res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      return;
    }

    const categoria = await prisma.categoria.create({
      data: { nombre: nombre.trim(), descripcion: descripcion || null },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'categoria',
      entidadId: categoria.id,
      datosNuevos: categoria,
      ipAddress: req.ip,
    });

    res.status(201).json({ data: categoria });
  } catch (error) {
    console.error('Error creando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/catalogos/categorias/:id
router.put('/categorias/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const existente = await prisma.categoria.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    const { nombre, descripcion, activo } = req.body;
    const datosActualizados: Record<string, unknown> = {};
    if (nombre !== undefined) datosActualizados.nombre = nombre;
    if (descripcion !== undefined) datosActualizados.descripcion = descripcion;
    if (activo !== undefined) datosActualizados.activo = activo;

    const categoria = await prisma.categoria.update({ where: { id }, data: datosActualizados });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'categoria',
      entidadId: id,
      datosAnteriores: existente,
      datosNuevos: categoria,
      ipAddress: req.ip,
    });

    res.json({ data: categoria });
  } catch (error) {
    console.error('Error editando categoría:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// PROVEEDORES / DONANTES
// ============================================

// GET /api/catalogos/proveedores?tipo=INSTITUCION
router.get('/proveedores', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { tipo } = req.query;
    if (tipo && tipo !== 'INSTITUCION' && tipo !== 'PERSONA') {
      res.status(400).json({ error: 'Tipo inválido. Use INSTITUCION o PERSONA' });
      return;
    }
    const where: any = { activo: true };
    if (tipo) where.tipo = tipo as 'INSTITUCION' | 'PERSONA';

    const proveedores = await prisma.proveedor.findMany({ where, orderBy: { nombre: 'asc' } });
    res.json({ data: proveedores });
  } catch (error) {
    console.error('Error listando proveedores:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/catalogos/proveedores
router.post('/proveedores', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { nombre, tipo, contacto, notas } = req.body;

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      res.status(400).json({ error: 'El nombre es requerido' });
      return;
    }

    if (tipo !== 'INSTITUCION' && tipo !== 'PERSONA') {
      res.status(400).json({ error: 'Tipo inválido. Use INSTITUCION o PERSONA' });
      return;
    }

    const proveedor = await prisma.proveedor.create({
      data: { nombre: nombre.trim(), tipo, contacto: contacto || null, notas: notas || null },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'proveedor',
      entidadId: proveedor.id,
      datosNuevos: proveedor,
      ipAddress: req.ip,
    });

    res.status(201).json({ data: proveedor });
  } catch (error) {
    console.error('Error creando proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/catalogos/proveedores/:id (incluye activar/desactivar)
router.put('/proveedores/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const existente = await prisma.proveedor.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Proveedor no encontrado' });
      return;
    }

    const { nombre, tipo, contacto, notas, activo } = req.body;

    if (tipo !== undefined && tipo !== 'INSTITUCION' && tipo !== 'PERSONA') {
      res.status(400).json({ error: 'Tipo inválido. Use INSTITUCION o PERSONA' });
      return;
    }

    const datosActualizados: Record<string, unknown> = {};
    if (nombre !== undefined) datosActualizados.nombre = nombre;
    if (tipo !== undefined) datosActualizados.tipo = tipo;
    if (contacto !== undefined) datosActualizados.contacto = contacto;
    if (notas !== undefined) datosActualizados.notas = notas;
    if (activo !== undefined) datosActualizados.activo = activo;

    const proveedor = await prisma.proveedor.update({ where: { id }, data: datosActualizados });

    let accion: 'EDITAR' | 'ACTIVAR' | 'DESACTIVAR' = 'EDITAR';
    if (activo === false) accion = 'DESACTIVAR';
    if (activo === true && existente.activo === false) accion = 'ACTIVAR';

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion,
      entidad: 'proveedor',
      entidadId: id,
      datosAnteriores: existente,
      datosNuevos: proveedor,
      ipAddress: req.ip,
    });

    res.json({ data: proveedor });
  } catch (error) {
    console.error('Error editando proveedor:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// UBICACIONES / ESTANTES
// ============================================

// GET /api/catalogos/ubicaciones
router.get('/ubicaciones', authMiddleware, async (_req: Request, res: Response): Promise<void> => {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      orderBy: { codigo: 'asc' },
    });
    res.json({ data: ubicaciones });
  } catch (error) {
    console.error('Error listando ubicaciones:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// POST /api/catalogos/ubicaciones
router.post('/ubicaciones', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { codigo, descripcion } = req.body;

    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      res.status(400).json({ error: 'El código de ubicación es requerido' });
      return;
    }

    const existente = await prisma.ubicacion.findUnique({ where: { codigo } });
    if (existente) {
      res.status(409).json({ error: 'Ya existe una ubicación con ese código' });
      return;
    }

    const ubicacion = await prisma.ubicacion.create({
      data: { codigo: codigo.trim(), descripcion: descripcion || null },
    });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'CREAR',
      entidad: 'ubicacion',
      entidadId: ubicacion.id,
      datosNuevos: ubicacion,
      ipAddress: req.ip,
    });

    res.status(201).json({ data: ubicacion });
  } catch (error) {
    console.error('Error creando ubicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// PUT /api/catalogos/ubicaciones/:id
// Nota: este endpoint no estaba en el stub original pero la especificación lo pide
// explícitamente ("Editar (solo ADMIN)"), así que se agrega aquí.
router.put('/ubicaciones/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const existente = await prisma.ubicacion.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Ubicación no encontrada' });
      return;
    }

    const { codigo, descripcion } = req.body;
    const datosActualizados: Record<string, unknown> = {};
    if (codigo !== undefined) datosActualizados.codigo = codigo;
    if (descripcion !== undefined) datosActualizados.descripcion = descripcion;

    const ubicacion = await prisma.ubicacion.update({ where: { id }, data: datosActualizados });

    await registrarAuditoria({
      usuarioId: req.user!.userId,
      accion: 'EDITAR',
      entidad: 'ubicacion',
      entidadId: id,
      datosAnteriores: existente,
      datosNuevos: ubicacion,
      ipAddress: req.ip,
    });

    res.json({ data: ubicacion });
  } catch (error) {
    console.error('Error editando ubicación:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================
// FOTO DE MEDICAMENTO
// ============================================

const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads', 'medicamentos');
const EXT_POR_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const uploadImagen = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!EXT_POR_MIME[file.mimetype]) {
      cb(new Error('Formato de imagen no permitido. Use JPG, PNG o WEBP'));
      return;
    }
    cb(null, true);
  },
});

// POST /api/catalogos/medicamentos/:id/imagen
router.post(
  '/medicamentos/:id/imagen',
  authMiddleware,
  requireRole('ADMIN'),
  uploadImagen.single('imagen'),
  async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params as { id: string };
      if (!req.file) {
        res.status(400).json({ error: 'Debe adjuntar una imagen en el campo "imagen"' });
        return;
      }

      const medicamento = await prisma.medicamento.findUnique({ where: { id } });
      if (!medicamento) {
        res.status(404).json({ error: 'Medicamento no encontrado' });
        return;
      }

      const ext = EXT_POR_MIME[req.file.mimetype];

      fs.mkdirSync(UPLOADS_DIR, { recursive: true });

      // Limpiar imágenes previas de este medicamento (posiblemente con otra extensión).
      const archivosExistentes = fs
        .readdirSync(UPLOADS_DIR)
        .filter((f) => f.startsWith(`${id}.`));
      for (const archivo of archivosExistentes) {
        fs.unlinkSync(path.join(UPLOADS_DIR, archivo));
      }

      const nombreArchivo = `${id}.${ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), req.file.buffer);

      const imagenUrl = `/uploads/medicamentos/${nombreArchivo}`;
      const actualizado = await prisma.medicamento.update({
        where: { id },
        data: { imagenUrl },
      });

      await registrarAuditoria({
        usuarioId: req.user!.userId,
        accion: 'EDITAR',
        entidad: 'medicamento',
        entidadId: id,
        datosAnteriores: { imagenUrl: medicamento.imagenUrl },
        datosNuevos: { imagenUrl },
        ipAddress: req.ip,
      });

      res.json({ data: actualizado });
    } catch (error) {
      console.error('Error subiendo imagen de medicamento:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

export default router;