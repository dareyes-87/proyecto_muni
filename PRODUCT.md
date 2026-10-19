# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Encargada de beneficencia** (rol `ENCARGADO_BENEFICENCIA`): dispensa medicamentos gratuitos a beneficiarios en un escritorio de la Farmacia Municipal de Gualán, con gente esperando. Personal con poca experiencia técnica; usa teclado y pistola de código de barras.
- **Administrador** (rol `ADMIN`): gestiona inventario, entradas, catálogos, usuarios, auditoría y reportes.
- Hasta 4 usuarios simultáneos. Equipos de escritorio Windows 10/11, Intel i5, 16 GB RAM, red local con rendimiento decente.
- El celular se usa **solo** para la captura de fotos de evidencia (ruta pública `/captura/:token` vía QR); el resto del sistema no se usa en móvil.

## Product Purpose

FarmaG es el sistema de gestión de inventario y dispensación gratuita de medicamentos de la Farmacia Municipal de Gualán, Zacapa, Guatemala. Existe para que la farmacia sepa qué stock tiene (por lote y vencimiento), dispense rápido y sin errores (FIFO, sin doble gasto) y deje trazabilidad completa (auditoría, evidencia fotográfica, reportes). Éxito: dispensaciones ágiles, inventario confiable, y cuentas que la municipalidad puede auditar.

## Positioning

Hecho a la medida de una farmacia municipal de beneficencia: dispensación gratuita (no ventas), stock por lote con semáforo de vencimiento, evidencia fotográfica de receta y entrega tomada con el celular vía QR, y auditoría inmutable. Un POS comercial o un sistema genérico de inventario no cubre ese flujo.

## Operating Context

- Flujo central: buscar beneficiario (DPI/nombre) → escanear/buscar medicamentos → confirmar → fotos de evidencia desde el celular.
- Entradas de inventario con lotes, escáner de barras, importación masiva desde Excel y autocompletado OpenFDA.
- Reportes con exportación PDF/Excel institucional. Despliegue en servidor de la municipalidad (Docker Compose, migraciones versionadas).

## Capabilities and Constraints

- Stack existente: React 18 + Vite + Tailwind + TypeScript; Express + Prisma + PostgreSQL. Componentes UI en `frontend/src/components/ui/`.
- Interfaz solo en español (Guatemala); sin internacionalización por ahora. Fechas `dd/mm/aaaa HH:mm`, 24 h.
- El stock mostrado nunca es de confianza; el backend re-verifica al confirmar.
- Fuera de fase 1: ventas con tickets, devoluciones, multi-tienda, integración con trámites municipales.

## Brand Commitments

- Identidad de la Municipalidad de Gualán, vinculante: logo (`backend/src/assets/logo-municipalidad.png`) y paleta azul `#0089C6` / `#006EAE` / `#003D8B` / `#88C8E4` con dorado `#FFE000` solo como acento. Nombre del producto: **FarmaG**.
- El semáforo de vencimiento (verde/ámbar/rojo/gris) es semántico, no de marca.

## Evidence on Hand

- Especificación técnica en `docs/FarmaG_Especificacion_Tecnica_v1.md`; historial de decisiones en `CLAUDE.md`.
- No hay testimonios, métricas de uso ni investigación de usuarios documentados; no inventarlos.

## Product Principles

1. **Velocidad sobre ceremonia en el mostrador:** el flujo de dispensación se hace con teclado y pistola, sin pasos innecesarios.
2. **Nada de errores silenciosos con medicamentos:** vencimiento, stock insuficiente y confirmaciones deben ser inequívocos.
3. **Trazabilidad por defecto:** cada acción que modifica datos queda auditada y es visible.
4. **Sobrio e institucional:** herramienta de trabajo para una oficina municipal, no un producto de consumo.
5. **Personal no técnico primero:** lenguaje claro en español, sin jerga.

## Accessibility & Inclusion

Sin requisitos especiales declarados; aplicar buenas prácticas generales (WCAG AA razonable).
