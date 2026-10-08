// Configuración del backend con validación al iniciar.
//
// No existe un JWT_SECRET de respaldo: si falta una variable crítica el proceso
// se detiene con un mensaje claro (H-03). En producción, además, se rechazan los
// valores de ejemplo del repositorio y los secretos demasiado cortos, para que el
// sistema nunca arranque con credenciales conocidas.

const nodeEnv = process.env.NODE_ENV || 'development';
const isProd = nodeEnv === 'production';

/** Valores de ejemplo versionados en el repositorio: prohibidos en producción. */
const VALORES_INSEGUROS = [
  'fallback_secret',
  'farmag_jwt_secret_cambiar_en_produccion',
  'farmag_secret_2026',
  'cambiar',
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

if (isProd) {
  if (contieneValorInseguro(jwtSecret) || jwtSecret.length < 16) {
    abortar(
      'JWT_SECRET usa un valor por defecto/de ejemplo o es demasiado corto. ' +
        'En producción debe ser un secreto propio, largo y aleatorio.'
    );
  }
  if (contieneValorInseguro(databaseUrl)) {
    abortar(
      'la contraseña de la base de datos usa un valor por defecto inseguro. ' +
        'Defina una contraseña propia en DATABASE_URL para producción.'
    );
  }
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv,
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  databaseUrl,
};
