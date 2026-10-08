# CIERRE_SEGURIDAD.md — FarmaG

> **Cierre final de seguridad** · Rama `seguridad` · **2026-10-08** · entorno local/desarrollo en vivo.
> Verificación de los riesgos que habían quedado pendientes tras `VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md`.
> **Sin commit ni push.** Cabeceras de producción comprobadas EN RUNTIME; rate limit por IP probado
> de verdad; lockout intacto; sin regresiones; **37/37 pruebas verdes**, `tsc` limpio.

## Tabla de controles

| Control | Estado |
|---|---|
| Login | **PASS** |
| Lockout por usuario | **PASS** |
| Rate limit por IP | **PASS** |
| JWT | **PASS** |
| RBAC | **PASS** |
| Autorización por objeto | **RIESGO ACEPTADO** (no existe propiedad en el modelo) |
| Lote vencido | **PASS** |
| Concurrencia | **PASS** |
| Upload | **PASS** |
| Fotos privadas | **PASS** |
| Auditoría | **PASS** |
| Headers producción | **PASS** (runtime) |
| Migraciones producción | **PASS** |
| Tests | **PASS** (37/37) |

---

# Estado final

Se cerraron los pendientes de la verificación previa. Se añadió una **segunda capa** de protección de
login (rate limit por IP) sin tocar el lockout por usuario; se **comprobó en runtime real** que las
cabeceras de seguridad del SPA de producción funcionan y que la CSP no rompe la aplicación; y se
analizó el "IDOR" documentado, concluyendo que es un **riesgo aceptado por diseño** (el modelo de
datos no tiene concepto de propiedad por usuario). No aparecieron regresiones.

Cambios de código de este cierre (árbol de trabajo, sin commit):
- **Nuevo** `backend/src/middleware/ipRateLimit.ts` (rate limit por IP, en memoria).
- `backend/src/routes/auth.routes.ts` (capa IP + `Retry-After` en los 429).
- **Nuevo** `backend/tests/ipRateLimit.test.ts` (SEC-RATE-001..005).
- (De la fase anterior, también sin commit: fixes H-025/H-026 en `routes/*` + `utils/{imagen,validacion}.ts`, y tests `despacho_vencimiento`/`loginRateLimit`.)

---

# Rate limit

**Diseño:** dos capas independientes sobre `POST /api/auth/login`:
1. **Rate limit por IP** (`ipRateLimit.ts`): **20 solicitudes / 10 min por IP**, ventana fija, en
   memoria. Se comprueba **antes** de validar el cuerpo y las credenciales → una contraseña correcta
   desde una IP ya limitada tampoco entra. Responde **429** + cabecera **`Retry-After`** (segundos).
2. **Lockout por cuenta** (`loginRateLimit.ts`, ya existente): 3 fallos → 5 min por usuario.

**Por qué 20/10 min:** suficientemente alto para no molestar al uso legítimo (una farmacia hace pocos
logins por dispositivo), y suficientemente bajo para frenar fuerza bruta, *credential stuffing* y el
**barrido de muchos usernames distintos desde una misma IP** (que el lockout por usuario no cubre).

**Estado persistente vs memoria:** ambos mecanismos son **EN MEMORIA** (no usan BD). Se pierden al
reiniciar el backend — aceptable para una instancia única: un reinicio solo *levanta* límites
vigentes, no los crea.

**`trust proxy` / X-Forwarded-For:** `app.set('trust proxy', 1)`. En producción el `api` **no se
expone** (ligado a `127.0.0.1` / red interna) y solo lo alcanza nginx, que fija
`X-Forwarded-For = $proxy_add_x_forwarded_for` (añade el IP real del cliente). Con `trust proxy = 1`,
`req.ip` toma ese IP real de la LAN y **no es falsificable a través de nginx** (un XFF que mande el
cliente queda a la izquierda y no se usa). Alcanzar el `api` directamente para falsear XFF requeriría
estar ya en el host, que no es el modelo de amenaza.

**Pruebas (en vivo, API real):**
| Escenario | Resultado |
|---|---|
| A. Muchas passwords incorrectas de una cuenta | lockout por usuario a los 3 → 429 |
| B. 21 intentos / misma IP, usernames distintos | 20×401 y el 21º → **429** |
| C. Password correcta tras alcanzar el límite de IP | **429** (no entra) |
| D. Expira la ventana | vuelve a permitir (test `SEC-RATE-004`, timers simulados) |
| E. IP diferente | **no limitada** (bucket independiente → 401/200) |
| F. Reinicio del backend | límite reseteado (login → 200) |
| `Retry-After` en el 429 | presente (p. ej. `Retry-After: 594`) |

**Pruebas automatizadas:** `tests/ipRateLimit.test.ts` — SEC-RATE-001..005, 5/5 PASS.

---

# Lockout

Sin cambios de comportamiento; **sigue funcionando e independiente del rate limit por IP**:
- 3 fallos → 429; contraseña correcta durante el bloqueo → **429, sin token** (reverificado).
- El bloqueo se comprueba antes de las credenciales. Clave insensible a mayúsculas/espacios.
- `Retry-After` añadido también a este 429.
- Expiración cubierta por `tests/loginRateLimit.test.ts` (timers simulados).
- SEC-RATE-005 confirma que un lockout de cuenta (3 fallos) se dispara aunque la IP esté muy por
  debajo de su límite.

---

# Cabeceras producción (H-024) — VERIFICADO EN RUNTIME

Se construyó la imagen **de producción** del frontend (`--target production`) y se levantó con nginx
(no Vite), conectada a la red del `api` para que el proxy `/api` fuera real. Evidencia (`curl -D-`):

```
GET /  → HTTP/1.1 200
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(self), microphone=(), geolocation=()
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; object-src 'none';
  frame-ancestors 'none'; base-uri 'self'; form-action 'self'
```
- Las mismas cabeceras aparecen en rutas del SPA (`/inventario` → 200, fallback de React Router).
- **CSP contiene `frame-ancestors 'none'`** (anti-clickjacking) y `object-src 'none'`.

**La CSP NO rompe la app (verificado en navegador real contra el build de producción):**
- La página de login **renderiza** (bundle JS `script-src 'self'` + estilos Tailwind
  `style-src 'self' 'unsafe-inline'`); íconos/colores correctos.
- **Login real exitoso** → el dashboard carga con datos (varias llamadas a `/api`, permitidas por
  `connect-src 'self'`). Las imágenes/blobs (fotos con JWT) encajan en `img-src 'self' data: blob:`.
- **Cero errores de consola / cero violaciones CSP.**

No se levantó el stack prod completo de `db+api` para no interrumpir el entorno de desarrollo (mismos
nombres de contenedor/puertos); la capa que H-024 cubre (nginx + CSP del SPA) sí se verificó en
runtime real.

---

# Autorización por objeto

**Análisis del modelo (`schema.prisma`):** ninguna entidad tiene campo de propiedad por usuario.
- `Beneficiario`, `Lote`, `Medicamento`, `Categoria`, `Ubicacion`: **sin** `ownerId`/`usuarioId` → son
  datos **institucionales** (de la farmacia).
- `Entrada.usuarioId`, `Dispensacion.usuarioId`, `LogAuditoria.usuarioId`: indican **quién registró /
  dispensó / actuó** (procedencia y auditoría), **no** control de acceso.

**Conclusión:** no existe concepto de propiedad. ADMIN y ENCARGADO son personal autorizado que debe
trabajar sobre toda la información compartida (la encargada atiende a todos los beneficiarios, despacha
de todo el stock). Por tanto, que un usuario autenticado acceda a cualquier beneficiario/dispensación
**no es un IDOR explotable dentro del modelo de negocio**: no hay una "víctima" ni un objeto privado
ajeno. La única frontera de autorización real es el **rol**, y el **RBAC sí se aplica** (endpoints
ADMIN rechazan a ENCARGADO con 403, reverificado).

**Decisión:** **RIESGO ACEPTADO por diseño.** No se implementa autorización por objeto porque el
sistema no tiene objetos con dueño (no se inventa propiedad inexistente). Si en el futuro el modelo
cambia (p. ej. múltiples farmacias con datos segregados), habría que reevaluarlo.

---

# Tests

`npm test` = `node --import tsx --test tests/*.test.ts` → **37 pruebas, 37 PASS.** `tsc --noEmit` limpio.

| Archivo | Nº | Cubre |
|---|---|---|
| inventario.service.test.ts | 6 | vencimiento/semáforo/dispensable (H-01/H-34) |
| fecha.test.ts | 9 | fechas de query → 400 (H-004) |
| validacion.test.ts | 11 | clampPaginacion/esEnteroPositivo/exigirCadena/**textoQuery** (H-020/022/025) |
| despacho_vencimiento.test.ts | 1 | integración: SELECT FOR UPDATE real (lote vencido, H-01) |
| loginRateLimit.test.ts | 5 | lockout por usuario + expiración |
| **ipRateLimit.test.ts** | **5** | **SEC-RATE-001..005 (rate limit por IP)** |

**Regresión completa (en vivo) sin fallos:** login 200; lockout 429 (correcta durante bloqueo → 429);
rate limit IP (21º → 429, IP distinta → 401); usuario desactivado → 401 en caliente; RBAC → 403;
despacho válido → 201 y **lote vencido nunca elegible** (despachar extra → 409); concurrencia
6×5/stock20 → 201×4+409×2, stock 0; upload válido → 200, corrupto → 400.

---

# Riesgos restantes

- **RIESGO ACEPTADO — Autorización por objeto:** no hay propiedad en el modelo (ver arriba). RBAC por
  rol sí aplica.
- **RIESGO ACEPTADO — Estado de rate-limit/lockout en memoria:** se pierde al reiniciar el backend.
  Correcto para una instancia única; si se escala a varias instancias habría que mover el estado a un
  almacén compartido (Redis).
- **Dependencias con avisos no explotables en runtime** (`deepmerge-ts` vía Prisma config, `uuid` vía
  exceljs): planificar el bump cuando haya versiones no-breaking.
- **Verificación de la encargada con celular físico (QR de captura):** fuera de alcance de este
  entorno; pendiente de prueba en sitio (documentado desde antes).
- **Residuos QA en la BD de desarrollo** (ver `VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md` §Residuos):
  no afectan pruebas ni producción; pendiente de que el equipo decida su borrado.

No quedan vulnerabilidades críticas ni altas abiertas. Los 500 por input encontrados se corrigieron
(H-025/H-026) y se reverificaron.

---

# Recomendación final

**APTO PARA PRODUCCIÓN con los controles verificados**, sujeto al checklist de despliegue:
1. Secretos propios y largos (`JWT_SECRET`, `DB_PASSWORD`) — el guard de `config/env.ts` aborta en
   prod con valores de ejemplo (verificado).
2. `ADMIN_INITIAL_PASSWORD` propia; cambiarla tras el primer login.
3. Desplegar con `docker-compose.prod.yml` (`migrate deploy` + nginx :80). Las cabeceras del SPA ya
   están verificadas en runtime.
4. Definir `CORS_ORIGIN` explícito.
5. Borrar/desactivar cuentas de prueba (`qa_*`, `sec_*`, `reg_lk_*` ya desactivadas).
6. Planificar el bump de dependencias con avisos.

**Commit/push: pendiente, a cargo del equipo** (no se realizó por indicación).
