# Plan de pruebas funcionales de FarmaG

> Fase 4 del flujo de trabajo (`00_lineamientos.md`). Documento de trabajo; servirá de base para el
> capítulo 8 (Aseguramiento de la calidad). Fuentes: `capitulos/04_requerimientos.md` (RF-01 a RF-58,
> RNF-01 a RNF-45, CU-01 a CU-19), `analisis/06_reglas_negocio.md` (RN-01 a RN-77),
> `analisis/07_flujos_modulos.md`, `analisis/11_resultados_pruebas_automatizadas.md` y
> `analisis/12_plan_correcciones.md`. Los casos de prueba están en `casos_prueba.md`, los datos en
> `datos_prueba.md` y el registro de ejecución en `registro_ejecucion.md`.

## 1. Objetivo

Verificar que el comportamiento de FarmaG en el commit `bdf1187` cumple los requerimientos funcionales
y los casos de uso especificados en el capítulo 4, con énfasis en las reglas de negocio que protegen la
integridad del inventario y la trazabilidad de las entregas: criterio de vencimiento y orden FIFO,
verificación de stock, control de acceso por rol, límite de intentos de inicio de sesión, filtros de
fechas de los reportes y evidencia fotográfica mediante código QR.

Además, el plan deja registrados como casos los hallazgos funcionales abiertos que afectan a un caso de
uso, para que su corrección se pueda verificar con el mismo procedimiento.

## 2. Alcance

### 2.1 Qué se prueba

- Los 19 casos de uso CU-01 a CU-19, con al menos un caso positivo y uno negativo por cada uno.
- Los requerimientos funcionales RF-01 a RF-58 que tienen interfaz o API. RF-31 (umbrales del
  semáforo) se prueba por la API, porque no tiene pantalla (H-22).
- Las reglas de negocio críticas:
  - vencimiento y FIFO: RN-02, RN-04, RN-09, RN-23, RN-24, RN-47, RN-52, RN-54, RN-71;
  - stock y concurrencia: RN-03, RN-11, RN-14, RN-15, RN-28, RN-74;
  - bloqueo del inicio de sesión: RN-56, RN-72;
  - permisos por rol: RN-05, RN-25, RN-43, RN-53, RN-57 a RN-61, RN-67, RN-70, RN-73;
  - fechas de los reportes y de la bitácora: RN-67, RN-68, RN-70 y los hallazgos H-45 y H-46;
  - evidencia por QR: RN-35 a RN-42, RN-76, RN-77.
- Los requerimientos no funcionales que se observan desde la interfaz o la API como parte de un caso de
  uso: RNF-02, RNF-03, RNF-05, RNF-06, RNF-07, RNF-13, RNF-14, RNF-15, RNF-22, RNF-24, RNF-25,
  RNF-27, RNF-31.

### 2.2 Qué no se prueba

- **Seguridad.** Las pruebas de penetración, el análisis de vulnerabilidades y la revisión de la
  configuración de seguridad los cubren el informe de pentesting (anexo de la tesis) y los informes de
  `docs/seguridad/`. Este plan solo verifica las reglas de seguridad que forman parte del
  comportamiento funcional de un caso de uso (por ejemplo, 403 para un rol sin permiso o 401 sin
  sesión).
- **Despliegue, respaldos e instalación** (RNF-16 a RNF-18, RNF-21, RNF-34, RNF-38): los verifican los
  trabajos del workflow "Despliegue seguro" (`docs/DESPLIEGUE.md`, `docs/RESPALDOS.md`) y la lista de
  comprobación en sitio de `analisis/12_plan_correcciones.md`, sección 4. Los hallazgos de
  configuración del servidor (H-03, H-07, H-17, H-36, H-40, H-49, H-50, H-51) no tienen caso aquí.
- **Rendimiento y carga** (RNF-32): no se ha definido una prueba de carga. [COMPLETAR: prueba de carga
  con 4 usuarios simultáneos, si se realiza]. La única prueba de simultaneidad es la de concurrencia
  del despacho (CP-67).
- **Funciones pendientes de decisión:** desactivación de beneficiarios (H-29, P-19), motivo obligatorio
  de la baja (H-27, P-18) y acceso del Encargado a la pantalla de Reportes (H-20, R-07). No se escriben
  resultados esperados para un comportamiento que aún no se ha decidido; se agregarán cuando se tome la
  decisión.
- **Funciones fuera de la fase 1** (sección 5 de `docs/FarmaG_Especificacion_Tecnica_v1.md`): ventas,
  devoluciones, alertas de tratamientos recurrentes, entre otras.

## 3. Enfoque

### 3.1 Pruebas funcionales de caja negra

Cada caso se deriva de un caso de uso: el flujo normal da los casos positivos y los flujos alternativos
dan los negativos. Se aplican estas técnicas:

- **Partición de equivalencia:** datos válidos e inválidos por campo (DPI de 13 dígitos frente a 12,
  cantidad entera frente a decimal, formato de imagen permitido frente a no permitido).
- **Valores límite:** fecha de vencimiento hoy y mañana, 30, 31, 90 y 91 días para el semáforo, stock
  igual y menor que el mínimo, tercer intento fallido de inicio de sesión, 5000 y 5001 registros en la
  exportación.
- **Pruebas por rol:** cada operación exclusiva del Administrador se intenta también con el Encargado de
  Beneficencia, desde la interfaz y con una petición directa a la API.
- **Transición de estados:** lote `DISPONIBLE` → `AGOTADO`, `VENCIDO`, `DADO_DE_BAJA`; enlace de
  captura vigente → usado o vencido.

Los pasos se ejecutan desde la interfaz web. Cuando el resultado solo se puede observar en la API (código
HTTP, mensaje que la interfaz no muestra, valor de un campo) o cuando el caso exige una petición que la
interfaz no permite, el paso indica la petición con `curl`, usando el token de una sesión
(`Authorization: Bearer <token>`). Las consultas a la base de datos se hacen con `docker compose exec db
psql` o con Prisma Studio, solo para preparar datos o para comprobar el resultado.

### 3.2 Pruebas automatizadas como regresión

Las 53 pruebas del backend (`backend/tests/`, 10 archivos) se ejecutan antes y después de cada ciclo de
pruebas funcionales y después de cada corrección, con el comando de
`analisis/11_resultados_pruebas_automatizadas.md`:

```
docker compose exec -T api sh -c 'cd /app && npm test'
```

La última ejecución registrada (2026-10-20, commit `bdf1187`) aprobó 53 de 53 con `TZ=America/Guatemala`
y 11 de 11 pruebas de base de datos con `TZ=UTC`. La Tabla 1 relaciona cada archivo con los casos
funcionales que complementa.

Tabla 1.
Pruebas automatizadas y casos funcionales que complementan

| Archivo de prueba | Casos | Qué cubre | Casos funcionales relacionados |
|-------------------|------:|-----------|--------------------------------|
| despacho_vencimiento.test.ts | 1 | El despacho no toma lotes con fecha de vencimiento hoy o anterior | CP-53, CP-64 |
| env.test.ts | 5 | Arranque sin `JWT_SECRET` y secretos débiles (RNF-10) | Ninguno (fuera de alcance funcional) |
| fecha.test.ts | 9 | Validación de fechas de los filtros | CP-81, CP-83, CP-90 |
| inventario.service.test.ts | 9 | Semáforo, días para vencer y stock dispensable | CP-45, CP-47, CP-53 |
| ipRateLimit.test.ts | 5 | Límite de 20 solicitudes por IP en 10 minutos | CP-04 |
| loginRateLimit.test.ts | 6 | Bloqueo tras 3 fallos de usuario e IP | CP-03 |
| rutas_integracion.test.ts | 8 | Tipos inválidos, listados con stock, formato del token | CP-44, CP-69, CP-73 |
| seed.test.ts | 1 | Contraseña inicial del administrador y seed idempotente | Ninguno (instalación) |
| validacion.test.ts | 8 | Paginación y límite de exportación | CP-49, CP-86 |
| vencimiento_arranque.test.ts | 1 | Marcado de lotes vencidos al arrancar la API | CP-52 |

Fuente: Elaboración propia a partir de `analisis/11_resultados_pruebas_automatizadas.md`, Tabla 8.

Una prueba automatizada aprobada no sustituye al caso funcional: el caso verifica además lo que la
persona ve en la pantalla.

### 3.3 Casos de hallazgos abiertos

Los casos marcados con **"Hallazgo abierto H-XX"** describen el comportamiento correcto según la
corrección propuesta en `analisis/12_plan_correcciones.md`. **Se espera que fallen** en el commit
`bdf1187` y que pasen cuando se corrija el hallazgo. Su resultado "Fallido" no cuenta como defecto nuevo
ni impide cumplir los criterios de salida, siempre que se registre con el hallazgo correspondiente en la
columna "Defecto" del registro de ejecución.

## 4. Entorno de pruebas

| Elemento | Valor |
|----------|-------|
| Equipo | Equipo de desarrollo con Windows 11 Home y Docker Desktop: procesador Intel Core i5-13420H (13.ª generación), 16 GB de memoria RAM |
| Código | Commit `bdf1187` (el código de `backend/` y `frontend/` no cambia en la rama `docs/documentacion`). Para verificar una corrección, el commit que la contenga |
| Servicios | `docker compose up --build`: `farmag_db` (PostgreSQL 16), `farmag_api` (Node.js 20, `TZ=America/Guatemala`), `farmag_web` (Vite, `FRONTEND_TARGET=development`) |
| Acceso | `http://localhost:5173` para la interfaz y `http://localhost:3000/api` para las peticiones directas. Para la captura por QR desde un teléfono, `http://<IP del equipo>:5173` (ver CP-77) |
| Navegador | Chromium 130 de Playwright 1.48.2, sin interfaz, en la computadora (ejecución del 2026-10-21). Para la captura no se usó un teléfono físico: se simuló con un contexto de Chromium de 390 × 844 (CP-77); la prueba con un teléfono real queda pendiente |
| Herramientas | `curl` para peticiones directas, `psql` o Prisma Studio para preparar y consultar datos, un lector de códigos de barras USB si está disponible (si no, se escribe el código y se pulsa Enter) |
| Base de datos | Base de desarrollo recreada con `docker compose down -v` y `docker compose up --build` antes del ciclo, con los datos de `datos_prueba.md`. No se usa la base de la municipalidad |
| Internet | Necesario solo para CP-21 (OpenFDA) |

Fuente: Elaboración propia.

**Fecha de referencia.** Los datos usan fechas relativas al día de ejecución (hoy, hoy + 20 días…).
Como el criterio de vencimiento depende del día, todos los casos de vencimiento se ejecutan el mismo
día en que se cargan los datos.

**Contadores en memoria.** Los límites de inicio de sesión (RN-72) se guardan en memoria: se reinician
con `docker compose restart api`. Los casos CP-03 y CP-04 se ejecutan al final de su sesión o con un
reinicio posterior, para no bloquear a los demás casos.

## 5. Criterios de entrada

1. El entorno de la sección 4 está levantado y `GET /api/health` responde.
2. `npm test` en el contenedor `api` aprueba las 53 pruebas.
3. Los datos de `datos_prueba.md` están cargados y comprobados (sección 6 de ese documento).
4. Existen las cuentas de prueba de ambos roles.
5. Los casos de `casos_prueba.md` están revisados por el responsable de la documentación.

## 6. Criterios de salida

1. Se ejecutó el 100 % de los casos de prioridad Alta y al menos el 90 % de los de prioridad Media.
2. No queda abierto ningún defecto de severidad Crítica ni Alta que no corresponda a un hallazgo ya
   registrado con su corrección planificada.
3. Todo caso Fallido tiene un defecto asociado (H-XX existente o uno nuevo agregado a
   `analisis/hallazgos_defectos.md`).
4. Los casos Bloqueados tienen la causa anotada en el registro.
5. `npm test` aprueba las 53 pruebas al terminar el ciclo.
6. El registro de ejecución está completo (todos los casos con resultado, estado y evidencia).

## 7. Severidad de los defectos

| Severidad | Criterio | Ejemplo |
|-----------|----------|---------|
| Crítica | Pérdida o corrupción de datos de inventario o de dispensaciones, descuento incorrecto de stock, acceso a funciones o datos sin permiso, o el sistema no se puede usar | Se dispensa un lote vencido; una dispensación se registra sin stock suficiente; el Encargado da de baja un lote |
| Alta | Una función principal produce un resultado incorrecto visible para el usuario, sin alternativa razonable | Un reporte incluye registros fuera del rango de fechas (H-46) |
| Media | Defecto funcional con alternativa, o error de trazabilidad | Error 500 en lugar de un mensaje de validación; auditoría sin dirección IP (H-35) |
| Baja | Mensaje inexacto, defecto cosmético o que solo ocurre con una petición directa a la API | Mensaje "otro medicamento" para el mismo medicamento (H-31) |

Fuente: Elaboración propia, con los criterios de prioridad de `analisis/12_plan_correcciones.md`.

La prioridad de un caso de prueba (Alta, Media, Baja) sigue la prioridad del requerimiento que verifica
(capítulo 4, sección 4.2) y sube a Alta cuando el caso verifica una regla crítica de la sección 2.1.

## 8. Roles

| Rol | Responsable | Funciones |
|-----|-------------|-----------|
| Responsable de pruebas | Audias Guevara | Prepara el plan, los casos y los datos; revisa el registro; decide si se cumplen los criterios de salida |
| Ejecutor | Claude Code, bajo supervisión de Audias Guevara: casos API por peticiones HTTP (2026-10-20) y casos de interfaz automatizados con Playwright (2026-10-21) | Carga los datos, ejecuta los casos, llena el registro y adjunta la evidencia |
| Desarrolladores | Daniel Reyes (Inventario, Admin, Reportes), Jorge Vargas (Dispensación), Audias Guevara (Catálogos) | Analizan y corrigen los defectos de su módulo según `analisis/12_plan_correcciones.md` |
| Usuario de validación | [COMPLETAR: persona de la Farmacia Municipal que valida los flujos, si participa] | Ejecuta los casos de dispensación y entradas con su forma real de trabajo |

Fuente: Elaboración propia.

## 9. Evidencia

Por cada caso ejecutado se guarda en `pruebas/evidencia/` (carpeta que se crea al ejecutar):
captura de pantalla del resultado, salida de `curl` cuando el caso usa la API y, si aplica, el resultado
de la consulta a la base. El nombre del archivo empieza con el ID del caso (`CP-15_respuesta.txt`).
Las capturas no deben mostrar contraseñas ni tokens completos.

## 10. Cronograma

[COMPLETAR: fechas de preparación, ejecución, corrección y reejecución]
