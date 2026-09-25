# 03 — Documento original de requerimientos

> Fase: Extracción. Documento de hechos con fuente; no es texto final de la tesis.
> Archivo analizado: `docs/proyecto_farmacia_original.md` (799 líneas). Fecha de extracción: 2026-09-25.
> Resuelve P-09.
> **Nota de numeración (R-03, 2026-09-25):** los códigos CU-01 a CU-37 que aparecen en este archivo
> son los del documento original; en la tesis se citan como **CUO-01 a CUO-37** (ver
> `00_lineamientos.md`, sección de identificadores).

---

## 1. Qué es el documento

Según su contenido, es un **análisis de requerimientos** del sistema. El título de su primera
sección es "1. Análisis de Requerimientos" (fuente: docs/proyecto_farmacia_original.md, línea 1).
Contiene cinco partes:
1. Análisis de requerimientos: descripción general, problema, objetivos, alcance e interesados (líneas 1–157).
2. Identificación de entidades del modelo de datos (líneas 159–265).
3. Flujos de operación (líneas 267–386).
4. Casos de uso CU-01 a CU-37 (líneas 388–698).
5. Transcripción de una entrevista con el cliente (líneas 700–800).

El documento describe un alcance **mayor** que el implementado: incluye un módulo de **venta
directa con tickets**, además de la dispensación gratuita (líneas 7–12). La especificación técnica
v1 posterior dejó ese módulo fuera de la fase 1 (fuente: docs/FarmaG_Especificacion_Tecnica_v1.md,
líneas 14–15 y 378–390).

## 2. Autor y fecha según Git

Salida de `git log --follow --format="%h %an %ad %s" --date=short -- docs/proyecto_farmacia_original.md`:

| Commit | Autor Git | Fecha | Mensaje |
|--------|-----------|-------|---------|
| `7d431a5` | dareyes-87 | 2026-06-27 | feat: setup inicial del proyecto FarmaRH - Docker, Prisma, Auth, Layout |
| `63b9be0` | dareyes-87 | 2026-07-19 | fix: formato de fecha, espaciado de PDF, y cambio de nombre FarmaRH a FarmaG |

- El archivo se agregó al repositorio en el commit inicial de configuración del 2026-06-27, con
  el usuario de Git `dareyes-87`. El único cambio posterior fue el cambio de nombre de marca
  FarmaRH → FarmaG del 2026-07-19 (según CLAUDE.md, sesión 2026-07-20, se hizo un reemplazo
  global de "FarmaRH" en todo el repositorio).
- Git registra quién **subió** el archivo, no quién lo **redactó**. [COMPLETAR: autoría real del
  documento original y fecha de redacción, si difieren del commit].

## 3. Resumen por secciones

### 3.1 Problema planteado

- La farmacia "opera actualmente de forma manual, sin herramientas digitales para el control de
  inventario", lo que genera pérdida de información, dificultad para auditar existencias y falta
  de trazabilidad en las dispensaciones (línea 5).
- Problemas enumerados (líneas 16–24): no se conocen las existencias en tiempo real; no hay
  trazabilidad de a quién se entregan los medicamentos gratuitos; no hay registros auditables de
  ventas y cobros; es difícil generar reportes para las autoridades; hay riesgo de pérdidas por
  vencimiento; no hay un flujo controlado de ticket-pago-entrega; no existe log de auditoría.

### 3.2 Necesidades (objetivos)

- **Objetivo general:** sistema web para la gestión integral del inventario y la dispensación, que
  controle entradas, salidas, ventas mediante tickets y dispensaciones gratuitas, con reportes por
  rol y área (línea 30).
- **Objetivos específicos 1–8** (líneas 34–48): inventario con alertas de stock mínimo y
  vencimiento; ventas por tickets con estados; dispensación gratuita con registro de beneficiario;
  3 roles (Administrador, Farmacéutico/Cajero, Encargado de Beneficencia); reportes y dashboards
  por área; log de auditoría; anulaciones de tickets con reintegro de stock; devoluciones con plazo
  de 1 semana.
- **Solicitud textual del Alcalde** (línea 735): "TENER UN CONTROL DE INVENTARIO DE MEDICINA. PARTE
  QUE SE REGALA Y PARTE DE LA FARMACIA DE LA QUE SE VENDE. CONTROL DE LO QUE SALE Y ENTRA DE LA
  FARMACIA. TANTO PAGADO COMO NO PAGADO." Su análisis frase por frase está en las líneas 741–770.

### 3.3 Requerimientos o funcionalidades pedidas

- **Alcance "dentro"** (líneas 52–105): control de inventario; entradas por compras o donaciones;
  salidas por ventas y dispensación gratuita; flujo de tickets; usuarios y roles; reportes y
  dashboards por área; log de auditoría; anulaciones; devoluciones de 1 semana; registro básico de
  beneficiarios; alertas de vencimiento configurables.
- **Entidades previstas** (líneas 163–265): usuarios, medicamentos (con **precio de venta**),
  inventario, entradas, detalle_entradas, tickets, detalle_tickets, historial_tickets, anulaciones,
  devoluciones, beneficiarios, proveedores, roles, categorias, motivos_anulacion, log_auditoria.
- **Flujos** (líneas 269–386):
  - Venta con ticket en tres pasos: pedido, pago en ventanilla y entrega.
  - Estados PENDIENTE / COMPLETADO / ANULADO.
  - Anulación automática a las 12 h y anulación manual con 7 motivos predefinidos.
  - Modificación parcial de tickets.
  - Dispensación gratuita en 4 pasos.
  - Devoluciones en ambas modalidades.
- **Casos de uso CU-01 a CU-37** en seis módulos (líneas 419–698): Inventario (CU-01–05), Ventas
  (CU-06–13), Dispensación gratuita (CU-14–18), Reportes y dashboards (CU-19–27), Administración y
  seguridad (CU-28–34), Procesos automáticos (CU-35–37).
- **Requerimientos complementarios** identificados por el equipo (líneas 774–800); entre ellos,
  alertas de vencimiento con umbrales de **30 y 15 días** (línea 792) e "interfaz web accesible
  desde cualquier dispositivo con navegador" (línea 800).

> Nota: los identificadores CU-XX de este documento original son **del documento original**. Según
> los lineamientos, los códigos CU de la tesis se asignarán en la fase de requerimientos; hay que
> decidir si se reutiliza esta numeración → ver P-13.

### 3.4 Restricciones

- "El sistema NO manejará dinero en efectivo ni transacciones financieras directas" (línea 12).
- **Fuera del alcance** (líneas 52–105): integración con sistemas del MSPAS, expediente clínico,
  facturación electrónica certificada, app móvil nativa, control de otros recursos municipales,
  recursos humanos, cobro de dinero (se hace en ventanilla), integración con el sistema de
  ventanilla.
- El modelo de datos debía seguir la tercera forma normal (3FN) (línea 163).
- Pendientes declarados en el propio documento:
  - El flujo detallado de beneficencia estaba "pendiente de confirmación con la administración
    municipal": criterios de elegibilidad, límites por persona o periodo, autorizaciones y
    presupuesto mensual (línea 380).
  - El proceso de anulación en ventanilla con devolución de dinero estaba "pendiente de definir"
    (línea 386).

### 3.5 Datos de la farmacia o la municipalidad

- Institución: Farmacia Municipal de Gualán, Zacapa (línea 5).
- Dos modalidades de operación en la misma farmacia: dispensación gratuita (beneficencia) y venta
  directa con precio fijado por la municipalidad; el cobro se hace en la ventanilla municipal
  (líneas 7–10).
- Interesados (líneas 107–157):
  - Patrocinador/cliente: Alcalde Municipal de Gualán.
  - Usuarios primarios: Farmacéutico/Cajero y Encargado de Beneficencia.
  - Usuario administrativo: personal administrativo.
  - Beneficiario: paciente o ciudadano.
  - Operador externo: ventanilla municipal.
- Entrevista (líneas 702–729): reunión inicial presencial de levantamiento de requerimientos con el
  Alcalde Municipal de Gualán y el equipo de desarrollo, en un "periodo estimado" del "primer
  trimestre 2026". [COMPLETAR: fecha exacta de la reunión y nombres de los participantes, si se
  van a citar en la tesis].
- El documento no trae datos cuantitativos de la farmacia (volumen de medicamentos,
  dispensaciones diarias, número de empleados o presupuesto). [COMPLETAR: si se requieren datos
  cuantitativos para los antecedentes].

---

## 4. Funcionalidades pedidas vs. implementadas

Criterio: **Sí** = implementada en el código actual; **Parcial** = implementada con alcance menor o
distinto al pedido; **No** = sin implementación en el código. Los módulos de ventas, devoluciones y
tickets figuran como "Fuera de Fase 1" en la especificación técnica v1 (fuente:
docs/FarmaG_Especificacion_Tecnica_v1.md, líneas 378–390).

| # | Funcionalidad pedida en el documento original | ¿Implementada? | Dónde está en el código |
|---|-----------------------------------------------|----------------|-------------------------|
| 1 | CU-01 Registrar entrada de medicamentos (línea 434; entradas vinculadas a proveedor, línea 192) | Parcial | `POST /api/inventario/entradas` (backend/src/routes/inventario.routes.ts, línea 50); frontend/src/pages/Entradas.tsx. Registra entradas con lotes, pero **sin proveedor ni origen** (cambio intencional de diseño, ver D-01 a D-03). La permiten ambos roles, no solo el Administrador. |
| 2 | CU-02 Consultar inventario (línea 439) | Sí | `GET /api/inventario` (inventario.routes.ts, línea 167); frontend/src/pages/Inventario.tsx |
| 3 | CU-03 Actualizar stock manualmente (línea 444) | No | No existe un ajuste manual de cantidad. Lo único que se acerca es dar de baja un lote completo: `PUT /api/inventario/lotes/:id/baja`, solo ADMIN (inventario.routes.ts, líneas 421–447). |
| 4 | CU-04 Visualizar alertas de stock mínimo (línea 454) | Sí | `GET /api/inventario/alertas` (inventario.routes.ts, línea 247; stock bajo en línea 310); frontend/src/pages/Dashboard.tsx |
| 5 | CU-05 Visualizar alertas de vencimiento (línea 459) | Sí | `GET /api/inventario/alertas` (inventario.routes.ts, líneas 247–346); semáforo en backend/src/services/inventario.service.ts; Dashboard.tsx |
| 6 | CU-06 Registrar venta y generar ticket (línea 478) | Excluida del alcance (R-04) | Sin módulo de ventas ni tabla de tickets (backend/prisma/schema.prisma) |
| 7 | CU-07 Consultar pedidos pendientes (línea 483) | Excluida del alcance (R-04) | Ídem |
| 8 | CU-08 Confirmar entrega / completar ticket (línea 488) | Excluida del alcance (R-04) | Ídem |
| 9 | CU-09 Modificar ticket (anulación parcial) (línea 493) | Excluida del alcance (R-04) | Ídem |
| 10 | CU-10 Anular ticket manualmente (línea 498) | Excluida del alcance (R-04) | Ídem |
| 11 | CU-11 Reimprimir ticket (línea 503) | Excluida del alcance (R-04) | Ídem |
| 12 | CU-12 Registrar devolución de venta (línea 508) | Excluida del alcance (R-04) | Sin modelo ni endpoint de devoluciones |
| 13 | CU-13 Consultar ventas del día (propias) (línea 513) | Excluida del alcance (R-04) | Sin módulo de ventas |
| 14 | CU-14 Registrar dispensación gratuita (línea 532) | Sí | `POST /api/dispensacion/despachar` (backend/src/routes/dispensacion.routes.ts, línea 133); backend/src/services/dispensacion.service.ts; frontend/src/pages/Dispensacion.tsx |
| 15 | CU-15 Registrar / buscar beneficiario (línea 537) | Sí | `POST /api/dispensacion/beneficiarios`, `GET /beneficiarios/buscar`, `PUT /beneficiarios/:id` (dispensacion.routes.ts, líneas 24, 35 y 86); frontend/src/pages/Beneficiarios.tsx |
| 16 | CU-16 Ver historial de beneficiario (línea 542) | Sí | `GET /api/dispensacion/beneficiarios/:id` (dispensacion.routes.ts, línea 74); Beneficiarios.tsx |
| 17 | CU-17 Registrar devolución de beneficencia (línea 547) | No | Sin modelo ni endpoint de devoluciones |
| 18 | CU-18 Consultar dispensaciones del día (propias) (línea 552) | Parcial | `GET /api/dispensacion/historial` filtra por rango de fechas y beneficiario, **no por usuario** (dispensacion.routes.ts, línea 183; dispensacion.service.ts, líneas 287–314), y ninguna página del frontend lo consume. El Dashboard muestra "Dispensaciones hoy" como conteo global de todos los usuarios (inventario.routes.ts, línea 293; Dashboard.tsx, línea 110). |
| 19 | CU-19 Reporte de movimientos de inventario (línea 571) | Parcial | No hay un reporte unificado de "movimientos"; hay reportes separados de entradas, inventario actual, por vencer, bajas y dispensaciones (backend/src/routes/reportes.routes.ts, líneas 28–122) |
| 20 | CU-20 Reporte de ventas (línea 576) | Excluida del alcance (R-04) | Sin módulo de ventas |
| 21 | CU-21 Reporte de beneficencia con filtro día/mes/año (línea 581) | Sí | `GET /api/reportes/dispensaciones` con rango de fechas, beneficiario y medicamento (reportes.routes.ts, línea 28); frontend/src/pages/Reportes.tsx. El filtro es un rango de fechas, no selectores de día/mes/año. |
| 22 | CU-22 Dashboard de ventas (línea 586) | Excluida del alcance (R-04) | Sin módulo de ventas |
| 23 | CU-23 Dashboard de beneficencia (línea 591) | Parcial | Un solo Dashboard general con indicadores (dispensaciones de hoy, beneficiarios, alertas), sin separar por área, sin gráficos y sin filtros día/mes/año (Dashboard.tsx; inventario.routes.ts, líneas 247–346) |
| 24 | CU-24 Dashboard diario propio (ventas) (línea 596) | Excluida del alcance (R-04) | Sin módulo de ventas |
| 25 | CU-25 Dashboard diario propio (beneficencia) (línea 601) | Parcial | El Dashboard es el mismo para todos los roles y sus conteos son globales, no del usuario (inventario.routes.ts, línea 293) |
| 26 | CU-26 Historial con filtros para Farmacéutico / Enc. Beneficencia (línea 606) | Parcial | Los `GET` de reportes son accesibles para ambos roles en el backend (reportes.routes.ts, líneas 28–122, solo `authMiddleware`), pero la página `/reportes` está restringida a ADMIN en el frontend (frontend/src/App.tsx, línea 77). El Encargado solo ve el historial por beneficiario (Beneficiarios.tsx). |
| 27 | CU-27 Exportar reportes a PDF (línea 616) | Sí | `GET /api/reportes/exportar/:tipo/:formato`, solo ADMIN (reportes.routes.ts, línea 377); backend/src/utils/pdf.ts. Además exporta a Excel (backend/src/utils/excel.ts). |
| 28 | CU-28 Gestionar usuarios (línea 635) | Sí | backend/src/routes/usuarios.routes.ts (líneas 11, 34, 81, 121; solo ADMIN); frontend/src/pages/Usuarios.tsx |
| 29 | CU-29 Gestionar catálogo de medicamentos (línea 640) | Sí | backend/src/routes/catalogos.routes.ts (p. ej. `POST /medicamentos`, línea 225); frontend/src/pages/Catalogos/Medicamentos.tsx; frontend/src/components/MedicamentoFormModal.tsx |
| 30 | CU-30 Gestionar catálogo de proveedores (línea 645) | No | Eliminado del esquema y del código (cambio intencional de diseño, ver D-01) |
| 31 | CU-31 Gestionar catálogo de categorías (línea 650) | Sí | catalogos.routes.ts (líneas 461–509); frontend/src/pages/Catalogos/Categorias.tsx |
| 32 | CU-32 Configurar umbrales de alertas de vencimiento (línea 655) | Sí | `GET`/`PUT /api/inventario/configuracion`; el PUT es solo ADMIN (inventario.routes.ts, líneas 472–537) |
| 33 | CU-33 Consultar log de auditoría (línea 660) | Sí | `GET /api/auditoria`, solo ADMIN (backend/src/routes/auditoria.routes.ts, línea 9); frontend/src/pages/Auditoria.tsx |
| 34 | CU-34 Iniciar / cerrar sesión (línea 665) | Sí | `POST /api/auth/login` (backend/src/routes/auth.routes.ts, línea 13); el cierre de sesión es solo del lado del cliente (frontend/src/context/AuthContext.tsx, línea 50). El valor `LOGOUT` del enum de auditoría no se registra en ningún lugar del backend. |
| 35 | CU-35 Anular tickets pendientes tras 12 horas (línea 684) | Excluida del alcance (R-04) | Sin módulo de ventas |
| 36 | CU-36 Generar alertas de stock mínimo (automático) (línea 689) | Parcial | Las alertas se calculan cuando se consulta `GET /api/inventario/alertas` (inventario.routes.ts, línea 247); no hay un proceso automático que las genere o notifique |
| 37 | CU-37 Generar alertas de vencimiento de 30 y 15 días (línea 694; configurables, línea 792) | Parcial | Umbrales configurables, pero con valores por defecto de **30 (rojo) y 90 (amarillo)** días, no 30 y 15 (backend/prisma/seed.ts, líneas 85–101; backend/src/services/inventario.service.ts, líneas 22–33). El cron diario solo marca lotes como `VENCIDO`, no genera alertas (backend/src/services/vencimiento.service.ts, líneas 9–35). |
| 38 | Rol Farmacéutico/Cajero (objetivo 4, línea 40; entidad roles, líneas 245–247) | Excluida del alcance (R-04) | El enum `Rol` solo tiene `ADMIN` y `ENCARGADO_BENEFICENCIA`, y no existe una tabla `roles` (schema.prisma, líneas 14–17) |
| 39 | Precio de venta en el catálogo de medicamentos (línea 182) | Excluida del alcance (R-04) | `Medicamento` no tiene campo de precio (schema.prisma, líneas 55–76) |
| 40 | Interfaz web accesible desde cualquier dispositivo con navegador (línea 800) | Sí | SPA React servida por Vite o nginx en la red local (docker-compose.yml; frontend/Dockerfile) |

**Totales (40 funcionalidades):** Implementadas = 15 · Parciales = 8 · Excluidas del alcance (R-04) = 14 · No implementadas = 3.

Nota: la fila 17 (CU-17, devolución de beneficencia) se dejó como "No" porque R-04 excluye las devoluciones de la farmacia de venta y esta corresponde a la dispensación gratuita. Pendiente de confirmar por el responsable.

Funcionalidades implementadas que **no** pedía el documento original (solo como referencia):
- Evidencia fotográfica por QR (`FotoDispensacion`, `TokenCaptura`).
- Lotes con FIFO por vencimiento y control de concurrencia.
- Snapshots en `DetalleDispensacion`.
- Ubicaciones (estantes) y códigos de barras con escáner.
- Importación masiva desde Excel y autocompletado con OpenFDA.

(fuente: backend/prisma/schema.prisma, líneas 78–99 y 185–240; CLAUDE.md, sesiones 2026-08-04 y 2026-08-06)
