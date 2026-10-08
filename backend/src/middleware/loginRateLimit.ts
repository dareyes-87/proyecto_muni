// Límite de intentos de inicio de sesión (H-09).
//
// Tras 3 intentos fallidos con el mismo usuario, se bloquea ese usuario durante
// 5 minutos. El estado se mantiene en memoria: es suficiente para este sistema
// de una sola instancia y NO requiere cambios en la base de datos. Se pierde al
// reiniciar el backend (un reinicio levanta los bloqueos vigentes, lo cual es
// aceptable aquí).

export const MAX_INTENTOS = 3;
export const BLOQUEO_MS = 5 * 60 * 1000; // 5 minutos

interface Registro {
  fallos: number;
  /** Epoch ms hasta el que el usuario está bloqueado, o null si no lo está. */
  bloqueadoHasta: number | null;
}

const intentos = new Map<string, Registro>();

function clave(username: string): string {
  return username.trim().toLowerCase();
}

/** Elimina entradas cuyo bloqueo ya expiró y no acumulan fallos recientes. */
function purgarExpirados(ahora: number): void {
  for (const [k, r] of intentos) {
    if (r.bloqueadoHasta !== null && r.bloqueadoHasta <= ahora) {
      intentos.delete(k);
    }
  }
}

/**
 * Milisegundos que faltan para que el usuario pueda volver a intentar.
 * Devuelve 0 si no está bloqueado. Limpia el registro si el bloqueo ya expiró.
 */
export function msBloqueoRestante(username: string): number {
  const k = clave(username);
  const r = intentos.get(k);
  if (!r || r.bloqueadoHasta === null) return 0;

  const restante = r.bloqueadoHasta - Date.now();
  if (restante <= 0) {
    intentos.delete(k);
    return 0;
  }
  return restante;
}

/**
 * Registra un intento fallido. Al alcanzar MAX_INTENTOS activa el bloqueo.
 * Devuelve si quedó bloqueado, el tiempo restante y los intentos que quedan.
 */
export function registrarFallo(username: string): {
  bloqueado: boolean;
  restanteMs: number;
  intentosRestantes: number;
} {
  const ahora = Date.now();
  purgarExpirados(ahora);

  const k = clave(username);
  const r = intentos.get(k) ?? { fallos: 0, bloqueadoHasta: null };
  r.fallos += 1;
  if (r.fallos >= MAX_INTENTOS) {
    r.bloqueadoHasta = ahora + BLOQUEO_MS;
  }
  intentos.set(k, r);

  const bloqueado = r.bloqueadoHasta !== null && r.bloqueadoHasta > ahora;
  return {
    bloqueado,
    restanteMs: bloqueado ? r.bloqueadoHasta! - ahora : 0,
    intentosRestantes: Math.max(0, MAX_INTENTOS - r.fallos),
  };
}

/** Limpia el registro de un usuario (tras un login exitoso). */
export function limpiarIntentos(username: string): void {
  intentos.delete(clave(username));
}

/** Convierte milisegundos a minutos enteros hacia arriba (para el mensaje al usuario). */
export function msAMinutos(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60000));
}
