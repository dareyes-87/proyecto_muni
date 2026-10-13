// Rate limit por IP para POST /auth/login (cierre de seguridad 2026-10-08).
//
// Es una SEGUNDA capa, independiente del lockout por usuario
// (middleware/loginRateLimit.ts). El lockout por usuario frena el ataque a UNA
// cuenta (3 fallos → 5 min); este limitador por IP frena el abuso desde una
// misma red: fuerza bruta, credential stuffing y, sobre todo, el barrido de
// MUCHOS usernames distintos desde una sola IP (que el lockout por usuario no
// cubre). También limita el abuso intencional del propio mecanismo de lockout.
//
// Estado EN MEMORIA (igual que el lockout por usuario): suficiente para una
// instancia única; se pierde al reiniciar el backend (los límites vigentes se
// levantan, lo cual es aceptable). No requiere base de datos.
//
// Ventana fija por IP: hasta MAX_INTENTOS_IP solicitudes por ventana; al
// superarlas se responde 429 hasta que la ventana expira. Cuenta TODA solicitud
// de login (acertada o no) para que un atacante no pueda “colar” intentos entre
// aciertos; el volumen legítimo de una farmacia está muy por debajo del límite.

/** Máximo de solicitudes de login por IP dentro de la ventana. */
export const MAX_INTENTOS_IP = 20;
/** Duración de la ventana por IP. */
export const VENTANA_IP_MS = 10 * 60 * 1000; // 10 minutos

interface RegistroIp {
  conteo: number;
  /** Epoch ms en que termina la ventana actual de esta IP. */
  ventanaExpira: number;
}

const porIp = new Map<string, RegistroIp>();

function purgar(ahora: number): void {
  for (const [k, r] of porIp) {
    if (r.ventanaExpira <= ahora) porIp.delete(k);
  }
}

/**
 * Registra un intento de login de una IP y devuelve si queda limitada.
 * Debe llamarse ANTES de verificar credenciales (así una contraseña correcta
 * tras superar el límite tampoco pasa).
 */
export function registrarIntentoIp(ip: string): {
  limitado: boolean;
  restanteMs: number;
  intentosRestantes: number;
} {
  const ahora = Date.now();
  purgar(ahora);

  let r = porIp.get(ip);
  if (!r || r.ventanaExpira <= ahora) {
    r = { conteo: 0, ventanaExpira: ahora + VENTANA_IP_MS };
  }
  r.conteo += 1;
  porIp.set(ip, r);

  const limitado = r.conteo > MAX_INTENTOS_IP;
  return {
    limitado,
    restanteMs: limitado ? r.ventanaExpira - ahora : 0,
    intentosRestantes: Math.max(0, MAX_INTENTOS_IP - r.conteo),
  };
}

/** ms restantes de limitación de una IP (0 si no está limitada). No incrementa. */
export function msLimiteIpRestante(ip: string): number {
  const r = porIp.get(ip);
  if (!r) return 0;
  const ahora = Date.now();
  if (r.ventanaExpira <= ahora) {
    porIp.delete(ip);
    return 0;
  }
  return r.conteo > MAX_INTENTOS_IP ? r.ventanaExpira - ahora : 0;
}

/** Limpia el registro de una IP (uso interno/pruebas). */
export function limpiarIp(ip: string): void {
  porIp.delete(ip);
}

/** Convierte ms a segundos enteros hacia arriba (cabecera Retry-After). */
export function msASegundos(ms: number): number {
  return Math.max(1, Math.ceil(ms / 1000));
}
