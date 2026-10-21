# Diagramas UML y de arquitectura — FarmaG

> Fase: Diagramas (`00_lineamientos.md`, sección "Diagramas"). Fecha: 2026-10-20.
> Rama: `docs/documentacion`. Código dibujado: commit `bdf1187` (sin cambios de código hasta `dede5c4`).

## Organización

- `fuentes/`: código PlantUML, un archivo `.puml` por diagrama, nombre `<capitulo>_<tipo>_<nombre>.puml`.
- `imagenes/`: PNG exportado de cada fuente, con el mismo nombre.
- Estilo: blanco y negro (`skinparam monochrome true`), sin sombras, 150 dpi, apto para imprimir.
- Etiquetas en español. Cada `.puml` indica en su encabezado los archivos de análisis y de código que
  se usaron.

### Cómo regenerar las imágenes

Desde `docs/documentacion/diagramas` (Git Bash en Windows):

```bash
MSYS_NO_PATHCONV=1 docker run --rm -e PLANTUML_LIMIT_SIZE=16384 \
  -v "$(pwd -W):/data" plantuml/plantuml \
  -tpng -charset UTF-8 -o /data/imagenes "/data/fuentes/*.puml"
```

En Linux o macOS, usar `-v "$(pwd):/data"` y omitir `MSYS_NO_PATHCONV=1`. Para solo comprobar la
sintaxis: `... plantuml/plantuml -checkonly -charset UTF-8 "/data/fuentes/*.puml"`.

## Numeración de casos de uso en los diagramas

Los diagramas usan los 19 casos de uso de `analisis/08_casos_uso_candidatos.md` **sin** el CU-11
original ("Configurar umbrales de vencimiento"), que solo existe en la API y no tiene pantalla (H-22,
D-24). Para que la numeración sea corrida, los casos posteriores se renumeraron **solo dentro de los
diagramas**:

Tabla 1.
Equivalencia entre los casos de uso candidatos y los de los diagramas

| CU en `08_casos_uso_candidatos.md` | CU en los diagramas | Nombre |
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
| CU-11 | — (excluido, H-22) | Configurar umbrales de vencimiento |
| CU-12 | CU-11 | Actualizar lotes vencidos |
| CU-13 | CU-12 | Consultar panel de alertas |
| CU-14 | CU-13 | Gestionar beneficiarios |
| CU-15 | CU-14 | Consultar historial de beneficiario |
| CU-16 | CU-15 | Dispensar medicamentos |
| CU-17 | CU-16 | Registrar evidencia fotográfica de la dispensación |
| CU-18 | CU-17 | Consultar reportes |
| CU-19 | CU-18 | Exportar reportes |
| CU-20 | CU-19 | Consultar bitácora de auditoría |

Fuente: Elaboración propia.

Si en la fase de requerimientos se decide conservar los números de `08_casos_uso_candidatos.md`, basta
con reemplazar las etiquetas `CU-11` a `CU-19` en los `.puml` de los capítulos 4 y 5 según esta tabla.

## Lista de diagramas

El número de figura sugerido supone que los capítulos 1 a 3 no tienen figuras; si las tienen, se
desplaza toda la numeración (es corrida en todo el documento, según los lineamientos).

Tabla 2.
Diagramas generados

| Fig. sugerida | Archivo | Tipo | Qué muestra | Fuente principal (análisis · código) |
|---|---|---|---|---|
| 1 | `04_casos_uso_general.puml` | Casos de uso | Los 19 casos de uso agrupados por módulo con sus 4 actores (el Administrador especializa al Encargado). | 08_casos_uso_candidatos.md, 05_seguridad_roles.md §4 · backend/src/routes/*.ts (`requireRole`), frontend/src/App.tsx |
| 2 | `04_casos_uso_autenticacion.puml` | Casos de uso | CU-01 con iniciar/cerrar sesión, validación de credenciales y bloqueo por intentos. | 05_seguridad_roles.md §1 · routes/auth.routes.ts, middleware/ipRateLimit.ts, middleware/loginRateLimit.ts |
| 3 | `04_casos_uso_usuarios.puml` | Casos de uso | CU-02 con crear, editar, restablecer contraseña y activar/desactivar. | 07_flujos_modulos.md §2 · routes/usuarios.routes.ts |
| 4 | `04_casos_uso_catalogos.puml` | Casos de uso | CU-03 a CU-06: medicamentos (duplicados, OpenFDA, foto), códigos de barras, categorías y ubicaciones. | 07_flujos_modulos.md §3 · routes/catalogos.routes.ts, components/MedicamentoFormModal.tsx |
| 5 | `04_casos_uso_entradas.puml` | Casos de uso | CU-07 registro manual con escaneo y alta de medicamento; CU-08 importación Excel. | 07_flujos_modulos.md §4 · routes/inventario.routes.ts, pages/Entradas.tsx |
| 6 | `04_casos_uso_inventario.puml` | Casos de uso | CU-09 consulta y detalle, CU-10 baja de lote y CU-11 proceso automático de vencimiento. | 07_flujos_modulos.md §5 · routes/inventario.routes.ts, services/vencimiento.service.ts |
| 7 | `04_casos_uso_dashboard.puml` | Casos de uso | CU-12 panel de alertas y navegación a la acción sugerida. | 07_flujos_modulos.md §11 · pages/Dashboard.tsx, GET /api/inventario/alertas |
| 8 | `04_casos_uso_beneficiarios.puml` | Casos de uso | CU-13 búsqueda, registro y edición; CU-14 historial con fotos. | 07_flujos_modulos.md §7 · routes/dispensacion.routes.ts, pages/Beneficiarios.tsx |
| 9 | `04_casos_uso_dispensacion.puml` | Casos de uso | CU-15 con búsqueda de beneficiario, agregado de medicamentos, confirmación FIFO y extensión a CU-16. | 07_flujos_modulos.md §6 · services/dispensacion.service.ts, pages/Dispensacion.tsx |
| 10 | `04_casos_uso_captura.puml` | Casos de uso | CU-16 con token QR, subida desde el celular o la PC y omisión de fotos. | 07_flujos_modulos.md §8 · routes/captura.routes.ts, pages/Captura.tsx |
| 11 | `04_casos_uso_reportes.puml` | Casos de uso | CU-17 consulta con filtros y CU-18 exportación a PDF o Excel. | 07_flujos_modulos.md §9 · routes/reportes.routes.ts, pages/Reportes.tsx |
| 12 | `04_casos_uso_auditoria.puml` | Casos de uso | CU-19 bitácora con filtros y detalle de cambios. | 07_flujos_modulos.md §10 · routes/auditoria.routes.ts, pages/Auditoria.tsx |
| 13 | `05_actividad_login.puml` | Actividad | Inicio de sesión con límite por IP, bloqueo por usuario + IP y auditoría de fallos. | 05_seguridad_roles.md §1.1 · routes/auth.routes.ts, middleware/*RateLimit.ts, pages/Login.tsx |
| 14 | `05_actividad_registrar_entrada.puml` | Actividad | Registro manual de una entrada con uno o varios lotes y sus validaciones. | 07_flujos_modulos.md §4, 06_reglas_negocio.md RN-52 · routes/inventario.routes.ts (POST /entradas), pages/Entradas.tsx |
| 15 | `05_actividad_importar_excel.puml` | Actividad | Importación por Excel: validación de archivo y filas, transacción por fila, lotes omitidos y resumen. | 04_api.md §2.4.1, 06_reglas_negocio.md RN-53 a RN-55 · routes/inventario.routes.ts (POST /importar-excel) |
| 16 | `05_actividad_dispensar.puml` | Actividad | Dispensación completa: beneficiario, medicamentos, confirmación, descuento FIFO y reintento por conflicto. | 07_flujos_modulos.md §6, 06_reglas_negocio.md RN-09 a RN-19 · services/dispensacion.service.ts (despachar), pages/Dispensacion.tsx |
| 17 | `05_actividad_captura_evidencia.puml` | Actividad | Evidencia fotográfica por QR, desde la PC u omitida. | 07_flujos_modulos.md §8, 06_reglas_negocio.md RN-35 a RN-40 · services/dispensacion.service.ts, pages/Captura.tsx |
| 18 | `05_secuencia_login.puml` | Secuencia | Mensajes entre navegador, API, limitadores en memoria, bcrypt/JWT y PostgreSQL al iniciar sesión. | 05_seguridad_roles.md §1, 04_api.md §2.1 · routes/auth.routes.ts, context/AuthContext.tsx |
| 19 | `05_secuencia_dispensar.puml` | Secuencia | Navegador → API → servicio → PostgreSQL con transacción Serializable, `FOR UPDATE`, FIFO sin vencidos y reintento. | 04_api.md §2.5, 06_reglas_negocio.md RN-09 a RN-17 · services/dispensacion.service.ts, routes/dispensacion.routes.ts |
| 20 | `05_secuencia_captura_qr.puml` | Secuencia | Generación del token, consulta periódica de la PC y subida pública desde el celular. | 04_api.md §2.5–2.6, 05_seguridad_roles.md §6 · routes/captura.routes.ts, services/dispensacion.service.ts |
| 21 | `05_clases_dominio.puml` | Clases | 14 entidades con atributos clave, 4 enumeraciones, relaciones y cardinalidad. | 02_modelo_datos.md · backend/prisma/schema.prisma |
| 22 | `05_estados_lote.puml` | Estados | DISPONIBLE, AGOTADO, VENCIDO y DADO_DE_BAJA con sus eventos y condiciones. | 07_flujos_modulos.md §12.1 · routes/inventario.routes.ts, services/dispensacion.service.ts, services/vencimiento.service.ts |
| 23 | `05_estados_token_captura.puml` | Estados | Token Vigente, Vencido y Usado, y su eliminación por el mantenimiento diario. | 07_flujos_modulos.md §12.2 · services/dispensacion.service.ts, services/vencimiento.service.ts |
| 24 | `05_estados_usuario.puml` | Estados | Usuario Activo e Inactivo, transiciones por el administrador y efecto en el inicio de sesión. | 07_flujos_modulos.md §12.3 · routes/usuarios.routes.ts, middleware/auth.ts |
| 25 | `05_er_modelo_datos.puml` | Entidad-relación | Las 14 tablas con PK, FK, únicos y cardinalidad en notación pata de gallo. | 02_modelo_datos.md · schema.prisma, prisma/migrations/0_init/migration.sql |
| 26 | `05_componentes.puml` | Componentes | Páginas y cliente API del frontend; rutas, middleware, servicios y utilidades del backend; Prisma, PostgreSQL, archivos y OpenFDA. | 01_stack_y_estructura.md, 04_api.md §1.1 · backend/src/server.ts e imports de routes/ y services/ |
| 27 | `05_despliegue.puml` | Despliegue | Servidor con Docker y los contenedores db, api, web y backup, puertos, volúmenes, red local y clientes; nota con las diferencias del modo desarrollo. | 01_stack_y_estructura.md · docker-compose.prod.yml, docker-compose.yml, backend/Dockerfile, frontend/nginx.conf |

Fuente: Elaboración propia.

Rutas de código abreviadas: `routes/`, `services/`, `middleware/` = `backend/src/...`; `pages/`,
`components/`, `context/` = `frontend/src/...`.

## Versión 2 (documento final)

Los diagramas anteriores miden de 2,500 a 3,500 px de ancho y, a 15 cm en el Word, su texto no se
lee. Para el documento final se usan 6 diagramas simplificados con prefijo `v2_` (fuentes en
`fuentes/v2_<nombre>.puml`, imágenes en `imagenes/v2_<nombre>.png`). Los diagramas anteriores se
conservan como detalle de referencia.

Reglas aplicadas: unos 15 elementos como máximo, fuente Arial de 15 puntos, blanco y negro, sin
sombras, 150 dpi y tamaño máximo de 15 cm de ancho por 20 cm de alto. Se verificó armando un `.docx`
temporal con cada imagen a 15 cm de ancho (o a 20 cm de alto cuando el alto lo limita),
convirtiéndolo a PDF con `farmag-docx-lo:1` y calculando el tamaño de letra con las dimensiones en
píxeles y el tamaño dibujado en el PDF: ningún texto queda por debajo de 8 pt.

Tabla 3.
Diagramas de la versión 2

| Archivo | Tipo | Qué muestra | Píxeles | Tamaño en el documento | Letra mínima |
|---|---|---|---|---|---|
| `v2_casos_uso_general.puml` | Casos de uso | Los 4 actores relacionados con 5 paquetes; cada paquete lista los nombres cortos de sus casos (CU-01 a CU-19). | 776 × 1336 | 11.6 × 20.0 cm | 9.9 pt |
| `v2_actividad_dispensacion.puml` | Actividad | Flujo de alto nivel de la dispensación: 12 acciones y 3 decisiones, sin detalles técnicos. | 1207 × 1639 | 14.7 × 20.0 cm | 8.1 pt |
| `v2_secuencia_dispensacion.puml` | Secuencia | Usuario, interfaz web, API y base de datos en 12 mensajes, con la selección del lote que vence primero y el descuento del stock. | 1120 × 1041 | 15.0 × 13.9 cm | 8.9 pt |
| `v2_estados_lote.puml` | Estados | DISPONIBLE, AGOTADO, VENCIDO y DADO_DE_BAJA con el evento de cada transición. | 771 × 903 | 15.0 × 17.6 cm | 12.9 pt |
| `v2_entidad_relacion.puml` | Entidad-relación | Las 14 tablas con su clave primaria y las relaciones con cardinalidad (pata de gallo). | 1230 × 644 | 15.0 × 7.9 cm | 8.1 pt |
| `v2_despliegue.puml` | Despliegue | Servidor con Docker y sus contenedores web, api, db y backup; equipos cliente y celular en la red local. | 645 × 1082 | 11.9 × 20.0 cm | 12.3 pt |

Fuente: Elaboración propia.

Ninguno tuvo que dividirse. En el paquete "Seguridad" del diagrama de casos de uso, CU-02 es
exclusivo del Administrador; el detalle de permisos por caso está en `04_casos_uso_general.puml`.

## Diferencias entre el análisis (194f8fb) y el código dibujado (bdf1187)

`06_reglas_negocio.md`, `07_flujos_modulos.md` y `08_casos_uso_candidatos.md` se extrajeron del commit
`194f8fb`. Los diagramas muestran el comportamiento de `bdf1187`; estas son las diferencias encontradas
al dibujar, además de las ya registradas en `analisis/09_seguimiento_correcciones.md`:

| Tema | Análisis (194f8fb) | Código actual (bdf1187) | Fuente | Diagramas |
|------|--------------------|-------------------------|--------|-----------|
| Inicio de sesión | Sin límite de intentos; los fallos no se auditan (07 §1) | Límite por IP (20 en 10 min) y bloqueo usuario + IP (3 fallos, 5 min) → 429; fallos auditados si el usuario existe; un usuario inactivo cuenta como intento fallido; respuesta 401 incluye `intentosRestantes` | routes/auth.routes.ts, líneas 23–106 | Fig. 2, 13, 18, 24 |
| Usuario desactivado | Conserva el acceso hasta que expire el token (07 §12.3) | Cada petición protegida consulta la base; responde 401 "La cuenta ya no está activa" | middleware/auth.ts, líneas 39–55 | Fig. 24 |
| Cron de vencimiento | `< hoy`, solo a las 00:05 en UTC (07 §5, §12.1) | `<= hoy`, a las 00:05 de America/Guatemala **y** al arrancar la API | services/vencimiento.service.ts, líneas 7–50 | Fig. 6, 22 |
| Selección de lotes al dispensar | `estado = DISPONIBLE` y `cantidad_actual > 0` | Además `fecha_vencimiento > hoy` (excluye vencidos aún no marcados) | services/dispensacion.service.ts, líneas 213–222 | Fig. 16, 19, 22 |
| Conflicto de concurrencia | No descrito (07 §6) | Hasta 3 reintentos con espera de 10·n ms ante error de serialización; si persiste, 409 | services/dispensacion.service.ts, líneas 296–317 | Fig. 16, 19 |
| Fecha de vencimiento en entradas | Se acepta una fecha pasada (07 §4, H-34) | 400 si es hoy o anterior, en registro manual y en Excel | routes/inventario.routes.ts, líneas 64–73 y 655–658 | Fig. 14, 15, 22 |
| Importación Excel | Reutiliza medicamentos/categorías inactivos (H-33); sin control de lotes repetidos | Rechaza la fila si están inactivos; omite (aviso) un lote con el mismo medicamento, número y vencimiento creado antes de la importación; aviso general por códigos numéricos | routes/inventario.routes.ts, líneas 776–830 y 959–965 | Fig. 15 |
| Token de captura | `nanoid` de 10 caracteres; un token usado se puede regenerar (07 §12.2 #6) | `randomBytes(8)` en base64url (11 caracteres); no se genera si ya están las dos fotos (409), así que Usado no vuelve a Vigente | services/dispensacion.service.ts, líneas 435–484 | Fig. 10, 17, 20, 23 |
| Subida de fotos | No se audita; formato inválido → 500 (07 §8) | Se comprime a WebP, se audita `CREAR / FotoDispensacion` (sin IP, H-35); formato inválido → 400 | services/dispensacion.service.ts, líneas 576–643; routes/captura.routes.ts, líneas 23–94 | Fig. 17, 20 |
| Configurar umbrales (CU-11 original) | Caso de uso candidato | Sigue sin pantalla (H-22); se excluyó de los diagramas | frontend/src/api/inventario.ts, línea 65 | Tabla 1 |

Las diferencias de `09_seguimiento_correcciones.md` que también se reflejan en los diagramas (H-01,
H-02, H-09, H-10, H-12, H-14, H-21, H-33, H-34) no se repiten en esta tabla salvo donde el detalle
dibujado no figura allí. `06_reglas_negocio.md` y `07_flujos_modulos.md` siguen marcados como
"Pendiente de actualizar al commit bdf1187".
