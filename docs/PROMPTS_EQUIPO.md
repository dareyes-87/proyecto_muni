# Prompts Iniciales para el Equipo FarmaRH

Cada compañero debe copiar su prompt completo y pegarlo como primer mensaje en un nuevo chat de Claude. Esto le da a Claude todo el contexto necesario para trabajar en su módulo.

---

## PROMPT PARA JORGE VARGAS (Módulo de Dispensación)

> Copia todo lo que está dentro del bloque de abajo y pégalo en un nuevo chat de Claude:

```
Actúa como ingeniero de software senior. Soy Jorge Vargas, parte de un equipo de 3 personas (Daniel Reyes, Audias Guevara y yo) desarrollando el sistema FarmaRH para la Farmacia Municipal de Gualán, Zacapa, Guatemala.

El sistema gestiona el inventario y la dispensación gratuita de medicamentos (beneficencia). Corre en Docker Compose con 3 contenedores (PostgreSQL 16, Express API con Prisma ORM, React con Vite + Tailwind). Todo en red local LAN, sin servicios en la nube.

MI MÓDULO ASIGNADO: Dispensación Gratuita (backend + frontend completo)

El proyecto base ya está creado por Daniel. Yo debo clonar el repo, levantar Docker, y empezar a implementar mi módulo. El repo está en: https://github.com/dareyes-87/proyecto_muni.git

ARCHIVOS QUE ME CORRESPONDEN:
- backend/src/routes/dispensacion.routes.ts (ya tiene stubs con TODO)
- backend/src/services/dispensacion.service.ts (crear)
- frontend/src/pages/Dispensacion.tsx (crear)
- frontend/src/pages/Beneficiarios.tsx (crear)

LO QUE DEBO IMPLEMENTAR:

1. BENEFICIARIOS (CRUD):
   - POST /api/dispensacion/beneficiarios → Registrar beneficiario (nombre_completo requerido, dpi recomendado pero opcional y único, telefono, direccion, observaciones)
   - GET /api/dispensacion/beneficiarios/buscar?q=texto → Búsqueda por DPI (exacta) o nombre (parcial, autocompletado)
   - GET /api/dispensacion/beneficiarios/:id → Detalle con historial de dispensaciones
   - PUT /api/dispensacion/beneficiarios/:id → Editar datos

2. DISPENSACIÓN (la parte más crítica):
   - POST /api/dispensacion/despachar → Registrar dispensación completa
   - GET /api/dispensacion/historial → Historial con filtros (fecha, beneficiario, medicamento)
   - GET /api/dispensacion/:id → Detalle de una dispensación

LÓGICA CRÍTICA DEL ENDPOINT POST /despachar:
El endpoint recibe: { beneficiarioId, observaciones, items: [{ medicamentoId, cantidad }] }

Debe usar transacciones Prisma con bloqueo de filas para evitar problemas de concurrencia (4 usuarios simultáneos). El flujo es:
1. Abrir $transaction de Prisma
2. Para cada item, obtener lotes del medicamento con estado DISPONIBLE, ordenados por fecha_vencimiento ASC (FIFO), usando SELECT ... FOR UPDATE ($queryRaw)
3. Verificar que hay stock suficiente sumando cantidad_actual de todos los lotes
4. Descontar cantidad_actual del lote más próximo a vencer. Si un lote no alcanza, continuar con el siguiente
5. Si cantidad_actual de un lote llega a 0, cambiar estado a AGOTADO
6. Crear registro en tabla dispensaciones
7. Crear registros en detalle_dispensaciones CON SNAPSHOTS (nombre_medicamento_snapshot, presentacion_snapshot, concentracion_snapshot tomados del medicamento actual)
8. Registrar en log_auditoria
9. Devolver en la respuesta el stock actualizado de los medicamentos dispensados

Si el stock no alcanza, la transacción hace rollback y responde con error indicando el stock real disponible.

FRONTEND - Página de Dispensación (flujo):
1. Buscar beneficiario por DPI o nombre (input con autocompletado)
2. Si no existe, botón para registrar nuevo beneficiario (modal)
3. Al seleccionar beneficiario, mostrar su historial reciente (últimas 5 dispensaciones)
4. Agregar medicamentos: por escaneo de código de barras (el lector actúa como teclado, escribe el código y presiona Enter) O por búsqueda manual (input con autocompletado). Usar endpoint GET /api/catalogos/medicamentos/barcode/:codigo y GET /api/catalogos/medicamentos/buscar?q=texto
5. Para cada medicamento, mostrar stock disponible y semáforo de vencimiento (verde >90 días, amarillo 30-90, rojo <30)
6. Campo de observaciones (texto libre, ej: "Receta Dr. García, hipertensión")
7. Botón confirmar → llama POST /despachar
8. Si el backend responde con error de stock, mostrar mensaje claro con stock real
9. Si éxito, mostrar toast y actualizar stock en pantalla

FRONTEND - Página de Beneficiarios:
- Tabla con todos los beneficiarios (nombre, DPI, teléfono, última dispensación)
- Búsqueda por nombre o DPI
- Click en un beneficiario → ver historial completo de dispensaciones
- Botón para registrar nuevo beneficiario

CONVENCIONES:
- Commits en español: "feat: endpoint de dispensación con FIFO"
- Mi rama: feature/dispensacion
- Usar toast para feedback (react-hot-toast ya está instalado)
- Toda modificación de datos debe llamar registrarAuditoria() del middleware/audit.ts
- El API client ya está en frontend/src/api/client.ts con JWT interceptor

IMPORTANTE: Antes de empezar a codear, lee el archivo CLAUDE.md en la raíz del proyecto y el archivo docs/FarmaRH_Especificacion_Tecnica_v1.md para el contexto completo. Después de cada sesión de trabajo, actualiza mi sección en CLAUDE.md con lo que completé.

Mi sistema operativo es Windows. Debo tener instalado: Docker Desktop, Git, Node.js LTS, VS Code.

Empecemos. Primero guíame para clonar el repo y verificar que Docker levanta correctamente, después arrancamos con la implementación del módulo de dispensación.
```

---

## PROMPT PARA AUDIAS GUEVARA (Módulo de Catálogos)

> Copia todo lo que está dentro del bloque de abajo y pégalo en un nuevo chat de Claude:

```
Actúa como ingeniero de software senior. Soy Audias Guevara, parte de un equipo de 3 personas (Daniel Reyes, Jorge Vargas y yo) desarrollando el sistema FarmaRH para la Farmacia Municipal de Gualán, Zacapa, Guatemala.

El sistema gestiona el inventario y la dispensación gratuita de medicamentos (beneficencia). Corre en Docker Compose con 3 contenedores (PostgreSQL 16, Express API con Prisma ORM, React con Vite + Tailwind). Todo en red local LAN, sin servicios en la nube.

MI MÓDULO ASIGNADO: Catálogos Base (backend + frontend completo)

El proyecto base ya está creado por Daniel. Yo debo clonar el repo, levantar Docker, y empezar a implementar mi módulo. El repo está en: https://github.com/dareyes-87/proyecto_muni.git

ARCHIVOS QUE ME CORRESPONDEN:
- backend/src/routes/catalogos.routes.ts (ya tiene stubs con TODO)
- frontend/src/pages/Catalogos/Medicamentos.tsx (crear)
- frontend/src/pages/Catalogos/Categorias.tsx (crear)
- frontend/src/pages/Catalogos/Proveedores.tsx (crear)
- frontend/src/pages/Catalogos/Ubicaciones.tsx (crear)

LO QUE DEBO IMPLEMENTAR:

1. MEDICAMENTOS (CRUD + búsqueda):
   - GET /api/catalogos/medicamentos → Listar con paginación (page, limit), incluir códigos de barras y categoría
   - GET /api/catalogos/medicamentos/buscar?q=texto → Autocompletado por nombre genérico o comercial (ILIKE '%texto%')
   - GET /api/catalogos/medicamentos/barcode/:codigo → Buscar por código de barras exacto, devolver medicamento con stock actual
   - POST /api/catalogos/medicamentos → Crear medicamento. IMPORTANTE: antes de crear, buscar similitudes en nombre_generico + presentacion + concentracion. Si hay coincidencias, devolver advertencia con los medicamentos similares (pero no bloquear, dejar que el frontend decida)
   - PUT /api/catalogos/medicamentos/:id → Editar medicamento (solo ADMIN). Registrar en auditoría qué campo cambió, valor anterior y nuevo

2. CÓDIGOS DE BARRAS:
   - POST /api/catalogos/medicamentos/:id/codigos → Agregar código de barras a un medicamento. Validar que el código no exista ya en otro medicamento
   - DELETE /api/catalogos/codigos/:id → Eliminar código de barras (solo ADMIN)

3. CATEGORÍAS (CRUD simple):
   - GET /api/catalogos/categorias → Listar todas
   - POST /api/catalogos/categorias → Crear (nombre único)
   - PUT /api/catalogos/categorias/:id → Editar

4. PROVEEDORES/DONANTES (CRUD):
   - GET /api/catalogos/proveedores → Listar con filtro por tipo (INSTITUCION, PERSONA)
   - POST /api/catalogos/proveedores → Crear
   - PUT /api/catalogos/proveedores/:id → Editar

5. UBICACIONES/ESTANTES (CRUD):
   - GET /api/catalogos/ubicaciones → Listar todas
   - POST /api/catalogos/ubicaciones → Crear (código único: "A", "B", "BOD")
   - PUT /api/catalogos/ubicaciones/:id → Editar (solo ADMIN)

MODELO DE DATOS (ya en Prisma schema):
- Medicamento tiene: nombreGenerico, nombreComercial (opcional), presentacion, concentracion (opcional), unidadMedida, categoriaId, stockMinimo, activo
- Un medicamento puede tener N códigos de barras (tabla codigos_barras)
- CodigoBarras tiene: codigo (único), descripcion (opcional), medicamentoId
- Categoría tiene: nombre (único), descripcion
- Proveedor tiene: nombre, tipo (INSTITUCION/PERSONA), contacto, notas, activo
- Ubicacion tiene: codigo (único), descripcion

FRONTEND - Página de Medicamentos:
- Tabla con columnas: nombre genérico, nombre comercial, presentación, concentración, categoría, stock mínimo, códigos de barras, estado
- Búsqueda en tiempo real (filtro por nombre)
- Botón "Nuevo Medicamento" → formulario/modal con autocompletado que detecta duplicados
- Click en medicamento → modal de edición
- Dentro del detalle: sección de códigos de barras (listar, agregar, eliminar)
- Usar TanStack Table para la tabla (@tanstack/react-table ya está instalado)

FRONTEND - Páginas de Categorías, Proveedores, Ubicaciones:
- Tablas simples con CRUD
- Formulario inline o modal para crear/editar
- Botón de activar/desactivar en proveedores (soft delete)

CONVENCIONES:
- Commits en español: "feat: CRUD completo de medicamentos"
- Mi rama: feature/catalogos
- Usar toast para feedback (react-hot-toast ya está instalado)
- Toda modificación de datos debe llamar registrarAuditoria() del middleware/audit.ts
- El API client ya está en frontend/src/api/client.ts con JWT interceptor
- Solo ADMIN puede crear/editar catálogos. ENCARGADO_BENEFICENCIA solo puede consultar (GET)

IMPORTANTE: Antes de empezar a codear, lee el archivo CLAUDE.md en la raíz del proyecto y el archivo docs/FarmaRH_Especificacion_Tecnica_v1.md para el contexto completo. Después de cada sesión de trabajo, actualiza mi sección en CLAUDE.md con lo que completé.

Mi sistema operativo es Windows. Debo tener instalado: Docker Desktop, Git, Node.js LTS, VS Code.

Empecemos. Primero guíame para clonar el repo y verificar que Docker levanta correctamente, después arrancamos con la implementación del módulo de catálogos.
```
