# 08 — Casos de uso

> Actualizado al commit bdf1187 el 2026-10-20 (extracción original: 194f8fb, 2026-09-25).

> Fase: Extracción (parte 3 de 4). Casos de uso de la tesis derivados de `07_flujos_modulos.md`.
> Rama: `docs/documentacion`.
> **Numeración final y oficial: CU-01 a CU-19.** Es la misma que usan los diagramas
> (`diagramas/README.md`, Tabla 1) y la que tomarán el Capítulo 4 (tablas de casos de uso) y el
> Capítulo 8 (casos de prueba). Según `00_lineamientos.md`, una vez asignado un código no se
> renumera. La propuesta anterior (CU-01 a CU-20, con el CU-11 "Configurar umbrales de vencimiento")
> queda solo como referencia en la sección 2.

## Criterios aplicados

- Un caso de uso (CU) = un objetivo completo del usuario, no una pantalla ni un endpoint.
- Las operaciones CRUD de un mismo catálogo se agrupan en un solo CU ("Gestionar …").
- Solo se incluye lo implementado **y usable desde la interfaz o por el proceso automático**
  (lineamientos, sección de identificadores; R-03). Por eso se excluyó "Configurar umbrales de
  vencimiento": solo existe en la API, sin pantalla (H-22, D-24).
- Los casos de uso del documento original se citan como **CUO-XX** (`03_documento_original.md`, §4).
- Actores (los mismos de `diagramas/fuentes/04_casos_uso_general.puml`):
  - **Encargado de Beneficencia** (rol `ENCARGADO_BENEFICENCIA`).
  - **Administrador** (rol `ADMIN`). Especializa al Encargado: hereda todos sus casos de uso y
    agrega los exclusivos.
  - **Persona con el celular**: quien toma las fotos desde el teléfono, sin sesión (solo CU-16).
  - **Sistema**: proceso automático (solo CU-11).
- Según R-09 la operación real se hace con una cuenta Administrador; según R-07 el Encargado debe
  tener acceso a los reportes (hoy solo por API, H-20).

## 1. Lista de casos de uso

| CU | Nombre | Actor(es) | Módulo | CUO relacionados | Flujo en 07_flujos_modulos.md |
|----|--------|-----------|--------|------------------|-------------------------------|
| CU-01 | Iniciar y cerrar sesión | Encargado de Beneficencia, Administrador | Autenticación | CUO-34 | §1 |
| CU-02 | Gestionar usuarios | Administrador | Usuarios | CUO-28 | §2 |
| CU-03 | Gestionar medicamentos | Administrador (registrar, editar, activar/desactivar, foto); Encargado de Beneficencia (consultar) | Catálogos | CUO-29 | §3 (3a, 3b, 3c) y §4 paso 3 |
| CU-04 | Gestionar códigos de barras | Administrador; Encargado de Beneficencia (consultar) | Catálogos | CUO-29 | §3 (3d) |
| CU-05 | Gestionar categorías | Administrador; Encargado de Beneficencia (consultar) | Catálogos | CUO-31 | §3 (3e) |
| CU-06 | Gestionar ubicaciones | Administrador; Encargado de Beneficencia (consultar) | Catálogos | — | §3 (3f) |
| CU-07 | Registrar entrada de medicamentos | Encargado de Beneficencia, Administrador | Entradas | CUO-01 | §4 (flujo principal) |
| CU-08 | Importar inventario desde Excel | Administrador | Entradas | CUO-01 | §4 ("Importar desde Excel") |
| CU-09 | Consultar inventario | Encargado de Beneficencia, Administrador | Inventario | CUO-02, CUO-05 | §5 (pasos 1–3) |
| CU-10 | Dar de baja lote | Administrador | Inventario | — (alternativa al ajuste manual de CUO-03, excluido por R-05) | §5 (pasos 4–5) |
| CU-11 | Actualizar lotes vencidos | Sistema | Inventario | CUO-37 | §5 ("Vencimiento automático") |
| CU-12 | Consultar panel de alertas | Encargado de Beneficencia, Administrador | Dashboard | CUO-04, CUO-05, CUO-23, CUO-25, CUO-36, CUO-37 | §11 |
| CU-13 | Gestionar beneficiarios | Encargado de Beneficencia, Administrador | Beneficiarios | CUO-15 | §7 (pasos 1–3 y "Editar") |
| CU-14 | Consultar historial de beneficiario | Encargado de Beneficencia, Administrador | Beneficiarios | CUO-16 | §7 (paso 4) |
| CU-15 | Dispensar medicamentos | Encargado de Beneficencia, Administrador | Dispensación | CUO-14 | §6 |
| CU-16 | Registrar evidencia fotográfica de la dispensación | Encargado de Beneficencia, Administrador (en la computadora); Persona con el celular | Captura de evidencia | — | §8 |
| CU-17 | Consultar reportes | Administrador; Encargado de Beneficencia (según R-07; hoy solo por API, H-20) | Reportes | CUO-18, CUO-19, CUO-21, CUO-26 | §9 (pasos 1–2) |
| CU-18 | Exportar reportes | Administrador | Reportes | CUO-27 | §9 (paso 3) |
| CU-19 | Consultar bitácora de auditoría | Administrador | Auditoría | CUO-33 | §10 |

**Total: 19 casos de uso.**

Observaciones:
- CU-03 y CU-04 se mantienen separados porque los códigos tienen su propio modal, sus propias
  reglas (RN-46, RN-47) y su propio registro de auditoría (`codigo_barras`).
- CU-07 incluye el alta de un medicamento nuevo desde la misma pantalla (CU-03, solo
  Administrador).
- CU-11 incluye también la eliminación de tokens de captura vencidos (mismo proceso automático,
  svc/vencimiento.service.ts, líneas 23–38). Corre a las 00:05 y al arrancar la API.
- CU-16 se separa de CU-15 porque es opcional (RN-18), puede hacerse en otro dispositivo, sin
  sesión y hasta 30 minutos después, y tiene su propio objetivo (dejar constancia de receta y
  entrega). En los diagramas es una extensión de CU-15.
- "Cerrar sesión" se incluye en CU-01 porque solo borra la sesión del navegador (no hay endpoint).
- La configuración de umbrales de vencimiento (RN-25) no es caso de uso: se documenta como
  funcionalidad de la API sin interfaz (H-22, D-24). Si en el futuro se agrega su pantalla, se le
  asignará el siguiente número libre (CU-20), sin renumerar los actuales.

## 2. Equivalencia con la propuesta anterior

Tabla de correspondencia entre la propuesta del 2026-09-25 (20 candidatos) y la numeración final.
Los diagramas ya usaban la numeración final (`diagramas/README.md`, Tabla 1).

| CU en la propuesta anterior (2026-09-25) | CU final | Nombre |
|-----|-----|--------|
| CU-01 | CU-01 | Iniciar y cerrar sesión |
| CU-02 | CU-02 | Gestionar usuarios |
| CU-03 | CU-03 | Gestionar medicamentos |
| CU-04 | CU-04 | Gestionar códigos de barras |
| CU-05 | CU-05 | Gestionar categorías |
| CU-06 | CU-06 | Gestionar ubicaciones |
| CU-07 | CU-07 | Registrar entrada de medicamentos |
| CU-08 | CU-08 | Importar inventario desde Excel |
| CU-09 | CU-09 | Consultar inventario |
| CU-10 | CU-10 | Dar de baja lote |
| CU-11 | — (excluido: sin pantalla, H-22) | Configurar umbrales de vencimiento |
| CU-12 | CU-11 | Actualizar lotes vencidos |
| CU-13 | CU-12 | Consultar panel de alertas |
| CU-14 | CU-13 | Gestionar beneficiarios |
| CU-15 | CU-14 | Consultar historial de beneficiario |
| CU-16 | CU-15 | Dispensar medicamentos |
| CU-17 | CU-16 | Registrar evidencia fotográfica de la dispensación |
| CU-18 | CU-17 | Consultar reportes |
| CU-19 | CU-18 | Exportar reportes |
| CU-20 | CU-19 | Consultar bitácora de auditoría |

Referencias a la numeración anterior que quedan en documentos fechados antes de esta actualización
(por ejemplo P-20 en `preguntas_abiertas.md`, que cita CU-03, CU-07 y CU-08) no cambian de
significado: esos tres números coinciden en ambas numeraciones.

## 3. Ficha de cada caso de uso

Datos para las tablas "Caso de uso #X" del Capítulo 4 y para los casos de prueba del Capítulo 8.
El actor principal es quien inicia el caso; "Encargado de Beneficencia" incluye al Administrador por
herencia. Las reglas remiten a `06_reglas_negocio.md`; los flujos normal y alternativo están en la
sección de `07_flujos_modulos.md` indicada en la tabla 1.

### CU-01 Iniciar y cerrar sesión

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** la cuenta existe y está activa; la combinación usuario + IP no está bloqueada y
  la IP no superó 20 solicitudes de inicio de sesión en los últimos 10 minutos.
- **Postcondición:** (iniciar) sesión abierta con un JWT válido 8 h mientras la cuenta siga activa,
  `ultimo_acceso` actualizado, menú filtrado por rol y `LOGIN` registrado; ante un fallo, intento
  contado y, si el usuario existe, auditado. (cerrar) sesión borrada del navegador.
- **Reglas:** RN-56, RN-57, RN-61, RN-72, RN-73.

### CU-02 Gestionar usuarios

- **Actor principal:** Administrador.
- **Precondición:** sesión iniciada con rol ADMIN.
- **Postcondición:** usuario creado, editado, activado o desactivado, o contraseña restablecida;
  el cambio de rol o la desactivación rigen desde la siguiente petición del usuario afectado;
  operación registrada (`CREAR`, `EDITAR`, `ACTIVAR` o `DESACTIVAR` / `usuario`).
- **Reglas:** RN-58, RN-59, RN-60, RN-61, RN-62, RN-69, RN-73.

### CU-03 Gestionar medicamentos

- **Actor principal:** Administrador (el Encargado de Beneficencia solo consulta). Interviene el
  servicio externo OpenFDA cuando se consulta un código de barras al registrar.
- **Precondición:** sesión iniciada (rol ADMIN para registrar, editar, activar/desactivar o subir
  foto); para registrar, al menos una categoría activa.
- **Postcondición:** medicamento registrado (o advertencia de posibles duplicados sin registro),
  editado, activado o desactivado, o con foto WebP nueva; operación registrada (`CREAR` / `EDITAR`
  `medicamento`). Un medicamento inactivo sigue visible en el catálogo y deja de estar disponible
  para entradas y dispensación.
- **Reglas:** RN-27, RN-43, RN-44, RN-45, RN-48, RN-49, RN-63, RN-77.

### CU-04 Gestionar códigos de barras

- **Actor principal:** Administrador (el Encargado de Beneficencia solo consulta).
- **Precondición:** sesión ADMIN; el medicamento existe.
- **Postcondición:** código (recortado y único en el sistema) vinculado al medicamento, o código
  eliminado físicamente; operación registrada (`CREAR` / `ELIMINAR` `codigo_barras`).
- **Reglas:** RN-46, RN-47, RN-64.

### CU-05 Gestionar categorías

- **Actor principal:** Administrador (el Encargado de Beneficencia solo consulta).
- **Precondición:** sesión ADMIN.
- **Postcondición:** categoría creada, editada, activada o desactivada, con nombre único; operación
  registrada (`CREAR` / `EDITAR` `categoria`).
- **Reglas:** RN-50, RN-63.

### CU-06 Gestionar ubicaciones

- **Actor principal:** Administrador (el Encargado de Beneficencia solo consulta).
- **Precondición:** sesión ADMIN.
- **Postcondición:** ubicación creada o editada, con código único; operación registrada (`CREAR` /
  `EDITAR` `ubicacion`). Las ubicaciones no se desactivan ni se eliminan.
- **Reglas:** RN-51, RN-64.

### CU-07 Registrar entrada de medicamentos

- **Actor principal:** Encargado de Beneficencia (también el Administrador, que además puede dar de
  alta un medicamento nuevo desde la misma pantalla).
- **Precondición:** sesión iniciada; los medicamentos de la entrada existen y están activos; las
  fechas de vencimiento son posteriores a hoy.
- **Postcondición:** una entrada con uno o más lotes en `DISPONIBLE` y `cantidadActual` igual a la
  cantidad recibida, en una sola transacción; el stock dispensable aumenta; `CREAR` / `entrada`
  registrado. Si un lote no cumple, no se registra ninguno.
- **Reglas:** RN-01, RN-08, RN-47, RN-52, RN-71.

### CU-08 Importar inventario desde Excel

- **Actor principal:** Administrador.
- **Precondición:** sesión ADMIN; archivo `.xlsx` de hasta 10 MB con las 11 columnas de la
  plantilla en la fila 1.
- **Postcondición:** por cada fila importada, una entrada y un lote `DISPONIBLE`, y, si hacía falta,
  categoría, ubicación, medicamento y código de barras nuevos; las filas con error y las omitidas
  por lote existente no dejan registros; resumen con errores y avisos; auditoría `CREAR` de cada
  entrada y entidad creada.
- **Reglas:** RN-01, RN-08, RN-53, RN-54, RN-55, RN-63, RN-71, RN-75.

### CU-09 Consultar inventario

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** sesión iniciada.
- **Postcondición:** ninguna (solo lectura). Se muestra, por medicamento activo, el stock
  dispensable, el semáforo del próximo vencimiento y la bandera de stock bajo; el detalle muestra
  todos los lotes.
- **Reglas:** RN-02, RN-22, RN-23, RN-24, RN-28, RN-71.

### CU-10 Dar de baja lote

- **Actor principal:** Administrador.
- **Precondición:** sesión ADMIN; el lote existe y no está `DADO_DE_BAJA`.
- **Postcondición:** lote en `DADO_DE_BAJA` (irreversible), fuera del stock y presente en el reporte
  "Dados de baja"; `BAJA` / `lote` registrado con el estado y la cantidad anteriores y el motivo, si
  se escribió.
- **Reglas:** RN-05, RN-06, RN-07.

### CU-11 Actualizar lotes vencidos

- **Actor principal:** Sistema (proceso automático).
- **Precondición:** la API está en ejecución; se cumple la hora programada (00:05 en la zona del
  servidor) o la API acaba de arrancar.
- **Postcondición:** todo lote `DISPONIBLE` con fecha de vencimiento hoy o anterior queda en
  `VENCIDO`; los tokens de captura vencidos quedan eliminados. No se registra auditoría (D-18).
- **Reglas:** RN-04, RN-41, RN-71.

### CU-12 Consultar panel de alertas

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** sesión iniciada.
- **Postcondición:** ninguna (solo lectura). Se muestran los indicadores del día y las alertas de
  stock bajo, próximos a vencer y vencidos sin baja, calculadas en el momento.
- **Reglas:** RN-22, RN-28, RN-29.

### CU-13 Gestionar beneficiarios

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** sesión iniciada.
- **Postcondición:** beneficiario registrado o editado, con DPI único si se indicó; operación
  registrada (`CREAR` / `EDITAR` `Beneficiario`). No se puede desactivar (H-29).
- **Reglas:** RN-30, RN-31, RN-32, RN-33, RN-34, RN-65.

### CU-14 Consultar historial de beneficiario

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** sesión iniciada; el beneficiario existe.
- **Postcondición:** ninguna (solo lectura). Se muestran sus dispensaciones con los *snapshots* de
  los medicamentos, quién atendió, el estado de evidencia y las fotos (cargadas con sesión).
- **Reglas:** RN-17, RN-21, RN-42, RN-76.

### CU-15 Dispensar medicamentos

- **Actor principal:** Encargado de Beneficencia (también el Administrador).
- **Precondición:** sesión iniciada; beneficiario existente y activo; al menos un medicamento activo
  con stock dispensable (lotes `DISPONIBLE` no vencidos).
- **Postcondición:** una dispensación con un detalle por lote usado y sus *snapshots*; lotes
  descontados en orden FIFO por vencimiento (en `AGOTADO` los que llegan a 0); `DISPENSAR`
  registrado; se ofrece registrar la evidencia (CU-16). Si el stock no alcanza o persiste un
  conflicto de concurrencia, no se registra nada. La dispensación no se puede editar, anular ni
  devolver.
- **Reglas:** RN-03, RN-09, RN-10, RN-11, RN-12, RN-13, RN-14, RN-15, RN-16, RN-17, RN-18, RN-19,
  RN-20, RN-21, RN-24, RN-47, RN-71, RN-74.

### CU-16 Registrar evidencia fotográfica de la dispensación

- **Actor principal:** Encargado de Beneficencia (también el Administrador), desde la computadora.
  Actor secundario: Persona con el celular (sin sesión).
- **Precondición:** dispensación registrada cuya evidencia no está completa; token de captura
  vigente (30 min); para la vía QR, celular en la misma red que el servidor.
- **Postcondición:** hasta dos fotos (una `RECETA` y una `EVIDENCIA_ENTREGA`) guardadas en WebP y
  accesibles solo con sesión; al completar las dos, token usado y fotos ya no reemplazables;
  auditoría `CREAR` / `TokenCaptura` y `CREAR` / `FotoDispensacion`. Si se omite, la dispensación
  queda "Sin evidencia". Una foto equivocada no se puede corregir después de completar las dos (P-24).
- **Reglas:** RN-18, RN-35, RN-36, RN-37, RN-38, RN-39, RN-40, RN-42, RN-69, RN-76, RN-77.

### CU-17 Consultar reportes

- **Actor principal:** Administrador (el Encargado de Beneficencia, según R-07, solo por API: H-20).
- **Precondición:** sesión iniciada (ADMIN para la pantalla).
- **Postcondición:** ninguna (solo lectura). Se muestra el reporte elegido, paginado, con los filtros
  aplicados.
- **Reglas:** RN-21, RN-66, RN-68.

### CU-18 Exportar reportes

- **Actor principal:** Administrador.
- **Precondición:** sesión ADMIN; el reporte con los filtros aplicados tiene como máximo 5000
  registros.
- **Postcondición:** archivo PDF o Excel descargado; `CREAR` / `reporte` registrado con el tipo, el
  formato y los filtros.
- **Reglas:** RN-67, RN-68, RN-69.

### CU-19 Consultar bitácora de auditoría

- **Actor principal:** Administrador.
- **Precondición:** sesión ADMIN.
- **Postcondición:** ninguna (solo lectura; la consulta no se audita).
- **Reglas:** RN-69, RN-70.

Reglas sin caso de uso propio: RN-25 (umbrales, solo API) y RN-26 (eliminada). RN-62 (práctica
operativa) se cita en CU-02.

## 4. Matriz de trazabilidad CUO → CU

Fuente de los nombres y la clasificación: `03_documento_original.md`, §4 (filas 1–37).
Leyenda: **CU-XX** = cubierto (total o parcialmente); **Solo API (H-22)** = implementado en el
backend sin interfaz, por lo que no tiene caso de uso; **Excluido (R-XX)** = fuera del alcance por
decisión documentada; **No aplica (R-06)** = innecesario por regla de negocio.

| CUO | Nombre en el documento original | Cobertura en la tesis | Observación |
|-----|---------------------------------|-----------------------|-------------|
| CUO-01 | Registrar entrada de medicamentos | CU-07, CU-08 | Parcial: sin proveedor ni origen (R-01) |
| CUO-02 | Consultar inventario | CU-09 | — |
| CUO-03 | Actualizar stock manualmente | Excluido (R-05) | La baja de lote completo (CU-10) es la única corrección disponible |
| CUO-04 | Visualizar alertas de stock mínimo | CU-12 | — |
| CUO-05 | Visualizar alertas de vencimiento | CU-12, CU-09 | Semáforo en inventario y alertas en el Dashboard |
| CUO-06 | Registrar venta y generar ticket | Excluido (R-04) | — |
| CUO-07 | Consultar pedidos pendientes | Excluido (R-04) | — |
| CUO-08 | Confirmar entrega / completar ticket | Excluido (R-04) | — |
| CUO-09 | Modificar ticket (anulación parcial) | Excluido (R-04) | — |
| CUO-10 | Anular ticket manualmente | Excluido (R-04) | — |
| CUO-11 | Reimprimir ticket | Excluido (R-04) | — |
| CUO-12 | Registrar devolución de venta | Excluido (R-04) | — |
| CUO-13 | Consultar ventas del día (propias) | Excluido (R-04) | — |
| CUO-14 | Registrar dispensación gratuita | CU-15 | — |
| CUO-15 | Registrar / buscar beneficiario | CU-13 | — |
| CUO-16 | Ver historial de beneficiario | CU-14 | — |
| CUO-17 | Registrar devolución de beneficencia | No aplica (R-06) | — |
| CUO-18 | Consultar dispensaciones del día (propias) | CU-17 | Parcial: el reporte filtra por fecha, no por usuario (R-08) |
| CUO-19 | Reporte de movimientos de inventario | CU-17 | Parcial: reportes separados de entradas, inventario, por vencer, bajas y dispensaciones |
| CUO-20 | Reporte de ventas | Excluido (R-04) | — |
| CUO-21 | Reporte de beneficencia (día/mes/año) | CU-17 | Filtro por rango de fechas |
| CUO-22 | Dashboard de ventas | Excluido (R-04) | — |
| CUO-23 | Dashboard de beneficencia | CU-12 | Parcial: un solo Dashboard general, sin gráficos |
| CUO-24 | Dashboard diario propio (ventas) | Excluido (R-04) | — |
| CUO-25 | Dashboard diario propio (beneficencia) | CU-12 | Parcial: conteos globales, no del usuario |
| CUO-26 | Historial con filtros para Farmacéutico / Enc. Beneficencia | CU-17 | Parcial: pantalla solo para ADMIN (H-20, R-07) |
| CUO-27 | Exportar reportes a PDF | CU-18 | También exporta a Excel |
| CUO-28 | Gestionar usuarios | CU-02 | — |
| CUO-29 | Gestionar catálogo de medicamentos | CU-03, CU-04 | — |
| CUO-30 | Gestionar catálogo de proveedores | Excluido (R-01) | — |
| CUO-31 | Gestionar catálogo de categorías | CU-05 | — |
| CUO-32 | Configurar umbrales de alertas de vencimiento | Solo API (H-22) | `PUT /api/inventario/configuracion` existe (RN-25) pero no hay pantalla; antes se proponía como CU-11 |
| CUO-33 | Consultar log de auditoría | CU-19 | — |
| CUO-34 | Iniciar / cerrar sesión | CU-01 | — |
| CUO-35 | Anular tickets pendientes tras 12 horas | Excluido (R-04) | — |
| CUO-36 | Generar alertas de stock mínimo (automático) | CU-12 | Parcial: se calculan al consultar, sin proceso automático |
| CUO-37 | Generar alertas de vencimiento de 30 y 15 días | CU-11, CU-12 | Parcial: umbrales por defecto 30/90; el proceso automático solo marca `VENCIDO` |

**Resumen:** cubiertos = **21** (CUO-01, 02, 04, 05, 14, 15, 16, 18, 19, 21, 23, 25, 26, 27, 28, 29,
31, 33, 34, 36, 37; de ellos 8 parcialmente: 01, 18, 19, 23, 25, 26, 36, 37) · solo API, sin caso de
uso = **1** (CUO-32, H-22) · excluidos = **14** (R-04: 12 — CUO-06 a 13, 20, 22, 24, 35; R-01:
CUO-30; R-05: CUO-03) · no aplica = **1** (R-06: CUO-17). Total 37.

CU sin CUO de origen (funcionalidad agregada durante el desarrollo): CU-06 (ubicaciones), CU-08
(importación Excel, relacionado con CUO-01), CU-10 (baja de lote) y CU-16 (evidencia fotográfica).

---

## Cambios respecto a la versión 194f8fb

| Tema | Antes (`194f8fb`, 2026-09-25) | Ahora (`bdf1187`, 2026-10-20) | Motivo |
|------|-------------------------------|-------------------------------|--------|
| Estado del documento | Propuesta de 20 casos de uso candidatos, sujeta a revisión | Numeración final y oficial CU-01 a CU-19 | Primer uso oficial de los códigos; coincide con los diagramas |
| CU-11 "Configurar umbrales de vencimiento" | Candidato, señalado como "solo API" | Excluido; RN-25 queda como funcionalidad de la API sin caso de uso | Sigue sin pantalla en `bdf1187` (H-22, D-24) |
| CU-12 a CU-20 | Numeración de la propuesta | Pasan a CU-11 a CU-19 (sección 2) | Numeración corrida tras excluir el CU-11 |
| Actores | Administrador, Encargado de Beneficencia, Sistema | Se agrega "Persona con el celular" y se explicita que el Administrador especializa al Encargado | Igual que `04_casos_uso_general.puml` |
| Fichas | No existían | Actor principal, precondición, postcondición y reglas por caso de uso (sección 3) | Insumo de las tablas del Cap. 4 y de los casos de prueba |
| Matriz CUO → CU | 22 cubiertos (CUO-32 → CU-11) | 21 cubiertos y CUO-32 "Solo API (H-22)" | Exclusión del CU-11 |
| CUO-37 | CU-12, CU-13 | CU-11, CU-12 | Renumeración |
| Comportamiento de los casos | Extraído de `194f8fb` | Refleja `bdf1187`: límite de intentos y cuenta activa en CU-01; fecha de vencimiento futura en CU-07 y CU-08; lotes repetidos e inactivos en CU-08; proceso al arrancar en CU-11; lotes vencidos excluidos y reintento por concurrencia en CU-15; token no regenerable con evidencia completa, WebP y fotos con sesión en CU-16; límite de 5000 en CU-18 | Diferencias de `diagramas/README.md` y `09_seguimiento_correcciones.md` |
