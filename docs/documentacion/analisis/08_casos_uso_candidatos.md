# 08 — Casos de uso candidatos

> Fase: Extracción (parte 3 de 4). **Propuesta** de casos de uso de la tesis, derivada de
> `07_flujos_modulos.md`; queda sujeta a revisión del responsable antes de la fase de
> requerimientos.
> Fecha: 2026-09-25. Rama: `docs/documentacion`.

## Criterios aplicados

- Un caso de uso (CU) = un objetivo completo del usuario, no una pantalla ni un endpoint.
- Las operaciones CRUD de un mismo catálogo se agrupan en un solo CU ("Gestionar …").
- Solo se incluye lo implementado (lineamientos, sección de identificadores; R-03).
- Los casos de uso del documento original se citan como **CUO-XX** (`03_documento_original.md`, §4).
- Actores según los roles del backend y R-07 a R-09: **Administrador** (rol `ADMIN`),
  **Encargado de Beneficencia** (rol `ENCARGADO_BENEFICENCIA`), **Sistema** (proceso automático).
  Según R-09 la operación real se hace con una cuenta Administrador; según R-07 el Encargado debe
  tener acceso a los reportes.

## 1. Lista de casos de uso candidatos

| CU | Nombre | Actor(es) | Módulo | CUO relacionados | Flujo en 07_flujos_modulos.md |
|----|--------|-----------|--------|------------------|-------------------------------|
| CU-01 | Iniciar y cerrar sesión | Administrador, Encargado de Beneficencia | Autenticación | CUO-34 | §1 |
| CU-02 | Gestionar usuarios | Administrador | Usuarios | CUO-28 | §2 |
| CU-03 | Gestionar medicamentos | Administrador (registrar, editar, activar/desactivar, foto); Encargado de Beneficencia (consultar) | Catálogos | CUO-29 | §3 (3a, 3b, 3c) y §4 paso 3 |
| CU-04 | Gestionar códigos de barras | Administrador; Encargado de Beneficencia (consultar) | Catálogos | CUO-29 | §3 (3d) |
| CU-05 | Gestionar categorías | Administrador; Encargado de Beneficencia (consultar) | Catálogos | CUO-31 | §3 (3e) |
| CU-06 | Gestionar ubicaciones | Administrador; Encargado de Beneficencia (consultar) | Catálogos | — | §3 (3f) |
| CU-07 | Registrar entrada de medicamentos | Administrador, Encargado de Beneficencia | Entradas | CUO-01 | §4 (flujo principal) |
| CU-08 | Importar inventario desde Excel | Administrador | Entradas | CUO-01 | §4 ("Importar desde Excel") |
| CU-09 | Consultar inventario | Administrador, Encargado de Beneficencia | Inventario | CUO-02, CUO-05 | §5 (pasos 1–2) |
| CU-10 | Dar de baja lote | Administrador | Inventario | — (alternativa al ajuste manual de CUO-03, excluido por R-05) | §5 (pasos 3–4) |
| CU-11 | Configurar umbrales de vencimiento | Administrador | Inventario | CUO-32 | §5 ("Configurar umbrales"); **solo existe en la API, sin pantalla (H-22)** |
| CU-12 | Actualizar lotes vencidos | Sistema | Inventario | CUO-37 | §5 ("Vencimiento automático") |
| CU-13 | Consultar panel de alertas | Administrador, Encargado de Beneficencia | Dashboard | CUO-04, CUO-05, CUO-23, CUO-25, CUO-36 | §11 |
| CU-14 | Gestionar beneficiarios | Administrador, Encargado de Beneficencia | Beneficiarios | CUO-15 | §7 (pasos 1–3 y "Editar") |
| CU-15 | Consultar historial de beneficiario | Administrador, Encargado de Beneficencia | Beneficiarios | CUO-16 | §7 (paso 4) |
| CU-16 | Dispensar medicamentos | Administrador, Encargado de Beneficencia | Dispensación | CUO-14 | §6 |
| CU-17 | Registrar evidencia fotográfica de la dispensación | Administrador, Encargado de Beneficencia (desde la computadora o el celular) | Captura de evidencia | — | §8 |
| CU-18 | Consultar reportes | Administrador; Encargado de Beneficencia (según R-07; hoy solo por API, H-20) | Reportes | CUO-18, CUO-19, CUO-21, CUO-26 | §9 (pasos 1–2) |
| CU-19 | Exportar reportes | Administrador | Reportes | CUO-27 | §9 (paso 3) |
| CU-20 | Consultar bitácora de auditoría | Administrador | Auditoría | CUO-33 | §10 |

**Total: 20 casos de uso candidatos.**

Observaciones:
- CU-03 y CU-04 podrían fusionarse ("Gestionar medicamentos" con sus códigos de barras); se
  proponen separados porque los códigos tienen su propio modal, sus propias reglas (RN-46, RN-47) y
  su propio registro de auditoría (`codigo_barras`).
- CU-11 cumple el objetivo solo mediante llamadas directas a la API. Si la tesis solo documenta
  lo usable desde la interfaz, habría que excluirlo o señalarlo como pendiente (H-22, D-24).
- CU-12 incluye también la eliminación diaria de tokens de captura vencidos (mismo proceso
  automático, svc/vencimiento.service.ts, líneas 37–46).
- CU-17 se separa de CU-16 porque es opcional (RN-18), puede hacerse en otro dispositivo, sin
  sesión y hasta 30 minutos después, y tiene su propio objetivo (dejar constancia de receta y
  entrega).
- "Cerrar sesión" se incluye en CU-01 porque solo borra la sesión del navegador (no hay endpoint).

## 2. Matriz de trazabilidad CUO → CU

Fuente de los nombres y la clasificación: `03_documento_original.md`, §4 (filas 1–37).
Leyenda: **CU-XX** = cubierto (total o parcialmente); **Excluido (R-XX)** = fuera del alcance por
decisión documentada; **No aplica (R-06)** = innecesario por regla de negocio.

| CUO | Nombre en el documento original | Cobertura en la tesis | Observación |
|-----|---------------------------------|-----------------------|-------------|
| CUO-01 | Registrar entrada de medicamentos | CU-07, CU-08 | Parcial: sin proveedor ni origen (R-01) |
| CUO-02 | Consultar inventario | CU-09 | — |
| CUO-03 | Actualizar stock manualmente | Excluido (R-05) | La baja de lote completo (CU-10) es la única corrección disponible |
| CUO-04 | Visualizar alertas de stock mínimo | CU-13 | — |
| CUO-05 | Visualizar alertas de vencimiento | CU-13, CU-09 | Semáforo en inventario y alertas en el Dashboard |
| CUO-06 | Registrar venta y generar ticket | Excluido (R-04) | — |
| CUO-07 | Consultar pedidos pendientes | Excluido (R-04) | — |
| CUO-08 | Confirmar entrega / completar ticket | Excluido (R-04) | — |
| CUO-09 | Modificar ticket (anulación parcial) | Excluido (R-04) | — |
| CUO-10 | Anular ticket manualmente | Excluido (R-04) | — |
| CUO-11 | Reimprimir ticket | Excluido (R-04) | — |
| CUO-12 | Registrar devolución de venta | Excluido (R-04) | — |
| CUO-13 | Consultar ventas del día (propias) | Excluido (R-04) | — |
| CUO-14 | Registrar dispensación gratuita | CU-16 | — |
| CUO-15 | Registrar / buscar beneficiario | CU-14 | — |
| CUO-16 | Ver historial de beneficiario | CU-15 | — |
| CUO-17 | Registrar devolución de beneficencia | No aplica (R-06) | — |
| CUO-18 | Consultar dispensaciones del día (propias) | CU-18 | Parcial: el reporte filtra por fecha, no por usuario (R-08) |
| CUO-19 | Reporte de movimientos de inventario | CU-18 | Parcial: reportes separados de entradas, inventario, por vencer, bajas y dispensaciones |
| CUO-20 | Reporte de ventas | Excluido (R-04) | — |
| CUO-21 | Reporte de beneficencia (día/mes/año) | CU-18 | Filtro por rango de fechas |
| CUO-22 | Dashboard de ventas | Excluido (R-04) | — |
| CUO-23 | Dashboard de beneficencia | CU-13 | Parcial: un solo Dashboard general, sin gráficos |
| CUO-24 | Dashboard diario propio (ventas) | Excluido (R-04) | — |
| CUO-25 | Dashboard diario propio (beneficencia) | CU-13 | Parcial: conteos globales, no del usuario |
| CUO-26 | Historial con filtros para Farmacéutico / Enc. Beneficencia | CU-18 | Parcial: pantalla solo para ADMIN (H-20, R-07) |
| CUO-27 | Exportar reportes a PDF | CU-19 | También exporta a Excel |
| CUO-28 | Gestionar usuarios | CU-02 | — |
| CUO-29 | Gestionar catálogo de medicamentos | CU-03, CU-04 | — |
| CUO-30 | Gestionar catálogo de proveedores | Excluido (R-01) | — |
| CUO-31 | Gestionar catálogo de categorías | CU-05 | — |
| CUO-32 | Configurar umbrales de alertas de vencimiento | CU-11 | Sin pantalla (H-22) |
| CUO-33 | Consultar log de auditoría | CU-20 | — |
| CUO-34 | Iniciar / cerrar sesión | CU-01 | — |
| CUO-35 | Anular tickets pendientes tras 12 horas | Excluido (R-04) | — |
| CUO-36 | Generar alertas de stock mínimo (automático) | CU-13 | Parcial: se calculan al consultar, sin proceso automático |
| CUO-37 | Generar alertas de vencimiento de 30 y 15 días | CU-12, CU-13 | Parcial: umbrales por defecto 30/90; el proceso automático solo marca `VENCIDO` |

**Resumen:** cubiertos = **22** (CUO-01, 02, 04, 05, 14, 15, 16, 18, 19, 21, 23, 25, 26, 27, 28, 29,
31, 32, 33, 34, 36, 37; de ellos 9 parcialmente: 01, 18, 19, 23, 25, 26, 32, 36, 37) ·
excluidos = **14** (R-04: 12 — CUO-06 a 13, 20, 22, 24, 35; R-01: CUO-30; R-05: CUO-03) ·
no aplica = **1** (R-06: CUO-17). Total 37.

CU sin CUO de origen (funcionalidad agregada durante el desarrollo): CU-06 (ubicaciones), CU-08
(importación Excel, relacionado con CUO-01), CU-10 (baja de lote) y CU-17 (evidencia fotográfica).
