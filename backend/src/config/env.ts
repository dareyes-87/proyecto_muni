import fs from 'fs';
import path from 'path';

// Configuración del backend con validación al iniciar.
//
// No existe un JWT_SECRET de respaldo: si falta una variable crítica el proceso
// se detiene con un mensaje claro (H-03). En producción, además, se detectan los
// valores de ejemplo del repositorio y los secretos demasiado cortos: se advierte
// (o se aborta con STRICT_SECRETS=true, ver más abajo).

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

/** Valores de ejemplo versionados en el repositorio: prohibidos en producción. */
const VALORES_INSEGUROS = [
  'fallback_secret',
  'farmag_jwt_secret_cambiar_en_produccion',
  'farmag_secret_2026',
  'cambiar',
  'cambie', // CAMBIE_ESTE_SECRETO... / CAMBIE_ESTA_CONTRASENA del .env.example actual
  'changeme',
];

function contieneValorInseguro(valor: string): boolean {
  const v = valor.toLowerCase();
  return VALORES_INSEGUROS.some((inseguro) => v.includes(inseguro));
}

/** Detiene el proceso con un mensaje claro (sin imprimir el valor del secreto). */
function abortar(mensaje: string): never {
  console.error(`\n❌ Configuración inválida: ${mensaje}\n`);
  process.exit(1);
}

function exigir(nombre: string, valor: string | undefined): string {
  if (!valor || valor.trim() === '') {
    abortar(`la variable de entorno ${nombre} es obligatoria y no está definida.`);
  }
  return valor!;
}

const jwtSecret = exigir('JWT_SECRET', process.env.JWT_SECRET);
const databaseUrl = exigir('DATABASE_URL', process.env.DATABASE_URL);

// En producción, los valores de ejemplo o un JWT_SECRET corto son un riesgo. Pero
// el servidor de la municipalidad se actualiza solo y nadie puede corregir su .env
// en sitio: si el backend se detuviera aquí, la farmacia quedaría sin sistema.
// Por eso, por defecto se ADVIERTE (consola + backups/ESTADO_ARRANQUE.txt) y se
// arranca igual. Con STRICT_SECRETS=true se vuelve obligatorio (abortar), para
// activarlo cuando se haya confirmado el .env real del servidor.
const estricto = (process.env.STRICT_SECRETS || '').toLowerCase() === 'true';

function advertir(mensaje: string): void {
  console.warn(`\n⚠️  AVISO DE SEGURIDAD: ${mensaje}\n`);
  try {
    const dir = process.env.PREDEPLOY_BACKUP_DIR || path.join(process.cwd(), 'backups');
    if (fs.existsSync(dir)) {
      const linea = `[arranque ${new Date().toISOString()}] AVISO: ${mensaje}\n`;
      fs.appendFileSync(path.join(dir, 'ESTADO_ARRANQUE.txt'), linea);
    }
  } catch {
    // Escribir la constancia nunca debe impedir el arranque.
  }
}

if (isProd) {
  const problemas: string[] = [];
  if (contieneValorInseguro(jwtSecret) || jwtSecret.length < 16) {
    problemas.push('JWT_SECRET usa un valor de ejemplo o es demasiado corto (<16)');
  }
  if (contieneValorInseguro(databaseUrl)) {
    problemas.push('la contraseña de la base de datos es un valor de ejemplo');
  }
  if (problemas.length > 0) {
    const mensaje =
      `${problemas.join('; ')}. En producción defina secretos propios en .env ` +
      '(y luego STRICT_SECRETS=true para exigirlos).';
    if (estricto) abortar(mensaje);
    advertir(mensaje);
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  databaseUrl,
};
