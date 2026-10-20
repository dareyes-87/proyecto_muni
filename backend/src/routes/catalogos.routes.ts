import { Router, Request, Response } from 'express';
import { z } from 'zod';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authMiddleware, requireRole } from '../middleware/auth';
import { registrarAuditoria } from '../middleware/audit';
import { comprimirImagen } from '../utils/imagen';
import { responderError } from '../utils/httpError';
import { textoQuery } from '../utils/validacion';
import { obtenerStockMedicamento } from '../services/dispensacion.service';
import { prisma } from '../config/prisma';

const router = Router();

// ============================================
// MEDICAMENTOS
// ============================================

router.get('/medicamentos', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;
    const q = textoQuery(req.query.q);
    // La pantalla de catálogo necesita ver los inactivos para poder reactivarlos (H-26).
    const incluirInactivos = req.query.incluirInactivos === 'true';

    const where: any = incluirInactivos ? {} : { activo: true };
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
    const q = textoQuery(req.query.q)?.trim();

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

    // Mismo criterio que el despacho: excluye lotes vencidos por fecha aunque el cron
    // aún no los haya marcado VENCIDO.
    const { stockTotal } = await obtenerStockMedicamento(codigoBarras.medicamentoId);

    res.json({
      data: {
        ...codigoBarras.medicamento,
        stockActual: stockTotal,
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
  requireRole('ADMIN'), // Solo el formulario de ADMIN usa esta consulta externa (H-21).
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

    // Validación de los campos enviados (H-15): no permite dejar en blanco los
    // campos requeridos al editar.
    const parsedEdit = medicamentoSchema.extend({ activo: z.boolean() }).partial().safeParse(req.body);
    if (!parsedEdit.success) {
      res.status(400).json({ error: 'Datos inválidos', detalles: parsedEdit.error.flatten() });
      return;
    }

    const existente = await prisma.medicamento.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Medicamento no encontrado' });
      return;
    }

    const cambios: Record<string, unknown> = parsedEdit.data;
    if (cambios.categoriaId !== undefined) {
      const categoria = await prisma.categoria.findUnique({ where: { id: cambios.categoriaId as string } });
      if (!categoria) {
        res.status(400).json({ error: 'La categoría especificada no existe' });
        return;
      }
    }

    const datosActualizados: Record<string, unknown> = {};
    const datosAnteriores: Record<string, unknown> = {};
    const datosNuevos: Record<string, unknown> = {};

    for (const campo of CAMPOS_EDITABLES_MEDICAMENTO) {
      if (campo in cambios && cambios[campo] !== (existente as Record<string, unknown>)[campo]) {
        datosActualizados[campo] = cambios[campo];
        datosAnteriores[campo] = (existente as Record<string, unknown>)[campo];
        datosNuevos[campo] = cambios[campo];
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
    responderError(res, error);
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

    // Se recorta ANTES de comprobar duplicados: antes la verificación usaba el
    // valor sin recortar y la inserción el recortado, por lo que un código con
    // espacios podía terminar en error 500 por restricción única (H-31).
    const codigoLimpio = codigo.trim();

    const medicamento = await prisma.medicamento.findUnique({ where: { id } });
    if (!medicamento) {
      res.status(404).json({ error: 'Medicamento no encontrado' });
      return;
    }

    const yaExiste = await prisma.codigoBarras.findUnique({ where: { codigo: codigoLimpio } });
    if (yaExiste) {
      res.status(409).json({ error: 'Este código de barras ya está registrado en otro medicamento' });
      return;
    }

    const nuevoCodigo = await prisma.codigoBarras.create({
      data: { codigo: codigoLimpio, descripcion: descripcion || null, medicamentoId: id },
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
router.get('/categorias', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const incluirInactivos = req.query.incluirInactivos === 'true';
    const categorias = await prisma.categoria.findMany({
      where: incluirInactivos ? {} : { activo: true },
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

const categoriaEditSchema = z
  .object({
    nombre: z.string().trim().min(1, 'El nombre de la categoría no puede quedar vacío'),
    descripcion: z.string().nullable(),
    activo: z.boolean(),
  })
  .partial();

// PUT /api/catalogos/categorias/:id
router.put('/categorias/:id', authMiddleware, requireRole('ADMIN'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params as { id: string };

    const parsed = categoriaEditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues[0].message, detalles: parsed.error.flatten() });
      return;
    }

    const existente = await prisma.categoria.findUnique({ where: { id } });
    if (!existente) {
      res.status(404).json({ error: 'Categoría no encontrada' });
      return;
    }

    const datosActualizados = parsed.data;

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
    responderError(res, error);
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
    if (codigo !== undefined && (typeof codigo !== 'string' || !codigo.trim())) {
      res.status(400).json({ error: 'El código de ubicación no puede quedar vacío' });
      return;
    }
    const datosActualizados: Record<string, unknown> = {};
    if (codigo !== undefined) datosActualizados.codigo = codigo.trim();
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
    responderError(res, error);
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
      // status 400: el errorHandler global lo traduce a 400 (no 500).
      const err: any = new Error('Formato de imagen no permitido. Use JPG, PNG o WEBP');
      err.status = 400;
      cb(err);
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

      // Comprimir a WebP (foto de catálogo: no necesita gran resolución) para
      // ahorrar espacio en disco.
      const comprimida = await comprimirImagen(req.file.buffer, { maxDimension: 1000 });

      fs.mkdirSync(UPLOADS_DIR, { recursive: true });

      // Limpiar imágenes previas de este medicamento (posiblemente con otra extensión).
      const archivosExistentes = fs
        .readdirSync(UPLOADS_DIR)
        .filter((f) => f.startsWith(`${id}.`));
      for (const archivo of archivosExistentes) {
        fs.unlinkSync(path.join(UPLOADS_DIR, archivo));
      }

      const nombreArchivo = `${id}.${comprimida.ext}`;
      fs.writeFileSync(path.join(UPLOADS_DIR, nombreArchivo), comprimida.buffer);

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
      // Honra err.status 400 (imagen inválida/no decodificable) y oculta el detalle
      // de los 500 reales.
      responderError(res, error);
    }
  }
);

export default router;