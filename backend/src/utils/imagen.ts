import sharp from 'sharp';

export interface ImagenComprimida {
  buffer: Buffer;
  /** Extensión del archivo resultante (siempre 'webp'). */
  ext: string;
  mimetype: string;
}

export interface OpcionesCompresion {
  /** Lado máximo (ancho o alto) en píxeles. No se amplían imágenes más chicas. */
  maxDimension?: number;
  /** Calidad WebP 1-100. Más bajo = archivo más chico y menos nitidez. */
  calidad?: number;
}

/**
 * Redimensiona y reencoda una imagen a WebP para que ocupe mucho menos espacio.
 * - Respeta la orientación EXIF (.rotate()) para que las fotos de celular no
 *   queden giradas.
 * - Reduce al lado máximo indicado sin ampliar las que ya son más chicas.
 * - WebP da buena compresión manteniendo legible el texto de una receta.
 *
 * Convierte cualquier formato de entrada admitido (JPG/PNG/WEBP) a WebP.
 */
export async function comprimirImagen(
  entrada: Buffer,
  opciones: OpcionesCompresion = {}
): Promise<ImagenComprimida> {
  const maxDimension = opciones.maxDimension ?? 1600;
  const calidad = opciones.calidad ?? 80;

  // Si el buffer no es una imagen decodificable (texto renombrado, archivo
  // corrupto, MIME falsificado), sharp lanza. Eso es entrada inválida del usuario,
  // no un fallo del servidor: se traduce a un 400 (los handlers honran err.status).
  let buffer: Buffer;
  try {
    buffer = await sharp(entrada, { failOn: 'none' })
      .rotate()
      .resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: calidad })
      .toBuffer();
  } catch {
    const err: any = new Error('El archivo no es una imagen válida');
    err.status = 400;
    throw err;
  }

  return { buffer, ext: 'webp', mimetype: 'image/webp' };
}
