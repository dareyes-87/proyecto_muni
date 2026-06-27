# FarmaRH — Especificación Técnica Consolidada v1.0

**Proyecto:** Sistema de Gestión de Farmacia Municipal — Beneficencia
**Cliente:** Municipalidad de Gualán, Zacapa, Guatemala
**Equipo:** Daniel Reyes, Jorge Vargas, Audias Guevara
**Fecha:** 26 de junio de 2026

---

## 1. Visión General

Sistema web local para la gestión del inventario y dispensación gratuita de medicamentos en la Farmacia Municipal de Gualán. El sistema opera en la red local (LAN) de la municipalidad sin depender de servicios en la nube.

**Enfoque Fase 1:** Exclusivamente la farmacia de beneficencia (medicamento gratuito).
**Escalabilidad futura:** La arquitectura permite agregar un módulo de ventas al público sin reescribir el sistema.

---

## 2. Stack Tecnológico

| Capa | Tecnología | Justificación |
|------|-----------|---------------|
| Frontend | React + Vite + Tailwind CSS | Ecosistema maduro, un solo lenguaje (JS/TS) |
| Backend | Node.js + Express + Prisma ORM | Migraciones como código, queries type-safe |
| Base de datos | PostgreSQL 16 | Transacciones ACID, bloqueo a nivel de fila, FIFO |
| Contenedores | Docker Compose (3 servicios) | Portabilidad garantizada dev → producción |
| Servidor web | Nginx (sirve frontend + proxy reverso) | Ligero, escucha en puerto 80 de la LAN |
| Librerías UI | TanStack Table, Recharts | Tablas con filtros, gráficos para dashboard |

### 2.1 Arquitectura Docker Compose

```
┌─────────────────────────────────────────────────┐
│              Red LAN Municipalidad              │
│                                                 │
│   PC Encargada ──┐                              │
│   PC Admin ──────┤──► http://192.168.x.x ──►┐  │
│   PC Benefic. ───┘                           │  │
│                                              │  │
│   ┌──────── Máquina Servidor ───────────┐    │  │
│   │  Docker Compose                     │◄───┘  │
│   │                                     │       │
│   │  ┌─────────┐  ┌─────────┐  ┌─────┐ │       │
│   │  │  nginx  │─►│   api   │─►│ db  │ │       │
│   │  │ :80     │  │ :3000   │  │:5432│ │       │
│   │  │(React   │  │(Express)│  │(PG) │ │       │
│   │  │ build)  │  │         │  │     │ │       │
│   │  └─────────┘  └─────────┘  └─────┘ │       │
│   └─────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

- **nginx**: Sirve los archivos estáticos del frontend (build de React) y actúa como proxy reverso para las peticiones `/api/*` hacia el backend.
- **api**: Servidor Express con Prisma ORM. Maneja toda la lógica de negocio.
- **db**: PostgreSQL 16 con volumen persistente en disco.

### 2.2 Acceso en Red Local

- El contenedor Nginx escucha en el puerto 80 de la máquina host.
- Cualquier computadora en la misma LAN accede escribiendo la IP del servidor en el navegador: `http://192.168.x.x`.
- No se requiere dominio, certificado SSL ni configuración de router.
- El acceso se restringe mediante autenticación del sistema (usuario + contraseña), no por configuración de red.

### 2.3 Máquina de Desarrollo

| Dato | Valor |
|------|-------|
| Equipo | HP EliteBook 850 G5 |
| RAM | 16 GB |
| CPU | Intel i7-8650U (8 hilos) |
| Disco | 512 GB |
| SO | Fedora Linux 44 |
| Kernel | 7.0.12-201.fc44.x86_64 |

Más que suficiente para correr los 3 contenedores de Docker simultáneamente con margen de sobra.

---

## 3. Módulos del Sistema (Fase 1)

### 3.1 Módulo de Autenticación y Usuarios

**Roles:**

| Rol | Descripción |
|-----|-------------|
| Administrador | Acceso total. Gestiona usuarios, catálogos, entradas, reportes, auditoría. Puede dispensar si es necesario. |
| Encargado de Beneficencia | Dispensa medicamentos, registra beneficiarios, consulta inventario (solo lectura), registra entradas de inventario, ve sus propias dispensaciones. |

**Funcionalidades:**
- Login con usuario y contraseña (hash bcrypt).
- Solo el admin crea usuarios. No hay auto-registro.
- Activar/desactivar cuentas (no se eliminan, se desactivan).
- Registro de último acceso por usuario.
- Sesiones con JWT y expiración configurable.

### 3.2 Módulo de Catálogos Base

#### 3.2.1 Medicamentos

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK auto-generado |
| nombre_generico | VARCHAR(200) | Requerido. Ej: "Acetaminofén" |
| nombre_comercial | VARCHAR(200) | Opcional. Ej: "Tylenol" |
| presentacion | VARCHAR(100) | Ej: "Tableta", "Jarabe", "Inyectable" |
| concentracion | VARCHAR(100) | Ej: "500mg", "250mg/5ml" |
| unidad_medida | VARCHAR(50) | Ej: "Tableta", "Frasco", "Ampolla" |
| categoria_id | FK → categorias | Clasificación terapéutica |
| stock_minimo | INTEGER | Umbral para alerta de stock bajo |
| activo | BOOLEAN | Para desactivar sin eliminar |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última modificación |

**Regla de edición:** El admin puede editar cualquier campo. El sistema registra en auditoría qué cambió, valor anterior y valor nuevo.

**Prevención de duplicados:** Al crear un medicamento nuevo, el sistema busca similitudes en nombre genérico + presentación + concentración y advierte si hay coincidencias.

**Autocompletado:** Al escribir, el sistema sugiere medicamentos existentes para evitar duplicados por error de tipeo.

#### 3.2.2 Códigos de Barras

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| medicamento_id | FK → medicamentos | Un medicamento puede tener N códigos |
| codigo | VARCHAR(50) | Código de barras (EAN-13, UPC, etc.) |
| descripcion | VARCHAR(200) | Opcional. Ej: "Laboratorio XYZ" |

**Regla:** Un medicamento puede tener múltiples códigos de barras (diferentes laboratorios). Al escanear cualquiera de ellos, el sistema identifica el mismo medicamento.

#### 3.2.3 Categorías

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| nombre | VARCHAR(100) | Ej: "Analgésico", "Antibiótico" |
| descripcion | VARCHAR(300) | Opcional |

#### 3.2.4 Proveedores / Donantes

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| nombre | VARCHAR(200) | Nombre de la institución o persona |
| tipo | ENUM | "INSTITUCION" o "PERSONA" |
| contacto | VARCHAR(200) | Teléfono, email, etc. |
| notas | TEXT | Observaciones libres |
| activo | BOOLEAN | |

#### 3.2.5 Ubicaciones (Estantes)

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| codigo | VARCHAR(10) | Ej: "A", "B", "C", "E-1" |
| descripcion | VARCHAR(200) | Ej: "Estante izquierdo, nivel superior" |

### 3.3 Módulo de Inventario

#### 3.3.1 Entradas

Cada ingreso de medicamento (por donación o compra con presupuesto) genera un registro de entrada.

**Tabla `entradas`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| proveedor_id | FK → proveedores | Quién suministró |
| origen | ENUM | "DONACION" o "PRESUPUESTO_MUNICIPAL" |
| usuario_id | FK → usuarios | Quién registró |
| observaciones | TEXT | Notas opcionales |
| created_at | TIMESTAMP | Fecha/hora de registro |

**Tabla `detalle_entradas` (lotes):**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| entrada_id | FK → entradas | Agrupación de lotes por entrada |
| medicamento_id | FK → medicamentos | |
| cantidad | INTEGER | Unidades ingresadas |
| cantidad_actual | INTEGER | Unidades restantes (se descuenta con FIFO) |
| numero_lote | VARCHAR(50) | Número del fabricante (viene en la caja) |
| fecha_vencimiento | DATE | Obligatorio |
| costo_unitario | DECIMAL(10,2) | Solo para PRESUPUESTO_MUNICIPAL |
| ubicacion_id | FK → ubicaciones | Estante donde se colocó |
| estado | ENUM | "DISPONIBLE", "AGOTADO", "VENCIDO", "DADO_DE_BAJA" |

#### 3.3.2 Lógica FIFO

Al dispensar un medicamento, el sistema selecciona automáticamente el lote con la **fecha de vencimiento más próxima** (no necesariamente el más antiguo por fecha de entrada). Esto garantiza que los medicamentos que están por vencer se usen primero, reduciendo pérdidas.

#### 3.3.3 Inventario Unificado con Origen

No existen dos inventarios separados. Hay **un solo inventario** donde cada lote tiene un campo `origen` que indica si llegó por donación o por presupuesto municipal. Esto permite:
- Ver el stock total de cada medicamento sin importar el origen.
- Filtrar y reportar por origen cuando sea necesario.
- Refleja la realidad operativa: toda la medicina está en la misma oficina y estantes.

#### 3.3.4 Control de Vencimiento

**Proceso automático (cron job diario):**
1. El sistema revisa todos los lotes con estado "DISPONIBLE".
2. Si `fecha_vencimiento <= hoy`, cambia el estado a "VENCIDO".
3. Los lotes vencidos dejan de aparecer en búsquedas de dispensación.
4. Permanecen visibles en el inventario con indicador visual hasta que el admin registre la baja física.

**Semáforo visual en toda la interfaz:**

| Color | Condición | Significado |
|-------|-----------|-------------|
| 🟢 Verde | Más de 90 días para vencer | Sin riesgo |
| 🟡 Amarillo | Entre 30 y 90 días | Atención — priorizar uso |
| 🔴 Rojo | Menos de 30 días | Urgente — vence pronto |
| ⚫ Negro/Gris | Vencido | No dispensable |

**Configuración:** Los umbrales de días (30, 90) son editables por el administrador.

#### 3.3.5 Alertas

Las alertas se muestran en el dashboard al iniciar sesión:
- **Stock bajo:** Medicamentos cuyo stock total está por debajo del `stock_minimo` configurado.
- **Próximos a vencer:** Lotes dentro de los umbrales amarillo y rojo.
- **Vencidos sin baja:** Lotes marcados como vencidos que aún no se han dado de baja físicamente.

Adicionalmente, al dispensar un medicamento, si el lote seleccionado (FIFO) está en zona amarilla o roja, se muestra un aviso visual en la pantalla de dispensación.

### 3.4 Módulo de Dispensación Gratuita

#### 3.4.1 Beneficiarios

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| nombre_completo | VARCHAR(300) | Requerido |
| dpi | VARCHAR(13) | Recomendado. Identificador único si se proporciona |
| telefono | VARCHAR(20) | Opcional |
| direccion | VARCHAR(300) | Opcional |
| observaciones | TEXT | Notas libres (ej: "Paciente diabético") |
| activo | BOOLEAN | |
| created_at | TIMESTAMP | |

**Búsqueda de beneficiario:** Por DPI (búsqueda exacta) o por nombre (búsqueda parcial). Si no existe, se registra en el momento.

#### 3.4.2 Dispensaciones

**Tabla `dispensaciones`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| beneficiario_id | FK → beneficiarios | A quién se entregó |
| usuario_id | FK → usuarios | Quién dispensó |
| observaciones | TEXT | Ej: "Receta del Dr. García, hipertensión" |
| created_at | TIMESTAMP | Fecha/hora de entrega |

**Tabla `detalle_dispensaciones`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| dispensacion_id | FK → dispensaciones | |
| lote_id | FK → detalle_entradas | De qué lote salió (trazabilidad) |
| medicamento_id | FK → medicamentos | |
| cantidad | INTEGER | Unidades entregadas |
| nombre_medicamento_snapshot | VARCHAR(300) | Nombre al momento de dispensar (inmutable) |
| presentacion_snapshot | VARCHAR(100) | Presentación al momento de dispensar |
| concentracion_snapshot | VARCHAR(100) | Concentración al momento de dispensar |

**Snapshots:** Los campos `*_snapshot` guardan los datos del medicamento tal como estaban al momento de la dispensación. Si después alguien corrige el nombre en el catálogo, el historial de dispensaciones conserva los datos originales. Esto es crítico para auditoría.

#### 3.4.3 Flujo de Dispensación

```
1. Encargada busca beneficiario (por DPI o nombre)
   ├── Si existe → selecciona
   │   └── Sistema muestra historial reciente del beneficiario
   │       (qué medicamentos recibió, cuándo, cuánto)
   └── Si no existe → registra nuevo beneficiario

2. Agrega medicamentos al despacho
   ├── Escanea código de barras (lector actúa como teclado)
   └── O busca por nombre (autocompletado)

3. Por cada medicamento:
   ├── Sistema muestra stock disponible
   ├── Sistema selecciona lote FIFO automáticamente
   ├── Si lote próximo a vencer → aviso visual
   └── Encargada indica cantidad

4. Encargada escribe observaciones (opcional)
   Ej: "Receta Dr. García", "Tratamiento mensual diabetes"

5. Confirma dispensación
   ├── Transacción atómica en BD
   ├── SELECT ... FOR UPDATE sobre lotes (bloqueo)
   ├── Verifica stock real en ese instante
   │   ├── Si alcanza → descuenta y confirma
   │   └── Si no alcanza → rechaza con mensaje claro
   └── Registra en log de auditoría
```

### 3.5 Módulo de Reportes

Todos los reportes son consultables en pantalla y exportables a **PDF** y **Excel (.xlsx)**.

| Reporte | Filtros | Contenido |
|---------|---------|-----------|
| Dispensaciones | Rango de fecha, beneficiario, medicamento | Detalle de cada entrega con beneficiario, medicamentos, cantidades, código de barras, usuario que dispensó |
| Consumo por medicamento | Rango de fecha, categoría | Ranking de medicamentos más dispensados, cantidades totales |
| Inventario actual | Categoría, origen, estado | Stock de cada medicamento por lote, fecha de vencimiento, ubicación, código de barras, semáforo |
| Medicamentos por vencer | Umbral de días (30, 60, 90) | Lotes ordenados por proximidad de vencimiento, código de barras |
| Historial de beneficiario | Beneficiario específico | Todas las dispensaciones de esa persona con fechas y medicamentos |
| Entradas por proveedor | Rango de fecha, proveedor, origen | Detalle de cada entrada, lotes, cantidades, costos |
| Medicamentos dados de baja | Rango de fecha | Lotes vencidos o dados de baja, cantidad perdida, costo (si aplica) |

**Código de barras en reportes:** Se incluye como valor numérico (texto), no como imagen escaneable.

### 3.6 Módulo de Auditoría

**Tabla `log_auditoria`:**

| Campo | Tipo | Notas |
|-------|------|-------|
| id | UUID | PK |
| usuario_id | FK → usuarios | Quién realizó la acción |
| accion | VARCHAR(50) | "CREAR", "EDITAR", "DISPENSAR", "BAJA", etc. |
| entidad | VARCHAR(50) | "medicamento", "beneficiario", "lote", etc. |
| entidad_id | UUID | ID del registro afectado |
| datos_anteriores | JSONB | Estado previo (null si es creación) |
| datos_nuevos | JSONB | Estado nuevo (null si es eliminación) |
| ip_address | VARCHAR(45) | IP desde donde se hizo la acción |
| created_at | TIMESTAMP | Fecha/hora exacta |

**Qué se audita:** Toda acción que modifique datos — creación, edición, dispensación, cambio de estado de lotes, activación/desactivación de usuarios, cambio de configuración de alertas.

---

## 4. Concurrencia y Manejo de Conflictos

### 4.1 Problema

4 usuarios simultáneos comparten el mismo inventario. Si Caja A y Caja B despachan el mismo medicamento al mismo tiempo, el stock debe mantenerse consistente.

### 4.2 Solución: Dos Capas

**Capa 1 — Transacciones PostgreSQL (integridad garantizada):**

```sql
BEGIN;
  -- Bloquea los lotes del medicamento para escritura
  SELECT * FROM detalle_entradas
  WHERE medicamento_id = $1
    AND estado = 'DISPONIBLE'
    AND cantidad_actual > 0
  ORDER BY fecha_vencimiento ASC  -- FIFO por vencimiento
  FOR UPDATE;

  -- Verifica que hay stock suficiente
  -- Si hay: descuenta de cantidad_actual
  -- Si no hay: lanza error, ROLLBACK automático
COMMIT;
```

Mientras una transacción tiene el bloqueo, cualquier otra transacción sobre los mismos lotes espera hasta que termine la primera. No hay forma de que el stock quede negativo o inconsistente.

**Capa 2 — Verificación optimista en frontend (mejor experiencia):**

1. Al abrir la pantalla de dispensación, el frontend muestra el stock actual.
2. Al confirmar, el backend re-verifica el stock real.
3. Si cambió desde que se abrió la pantalla, el backend responde con el stock actualizado y un mensaje: "El stock de [medicamento] cambió. Stock actual: X. ¿Desea continuar?"
4. Tras cada dispensación exitosa, la respuesta del API incluye el stock actualizado para refrescar la pantalla automáticamente.

---

## 5. Fuera de Fase 1 (Escalabilidad Futura)

Estas funcionalidades **no se construyen** en la primera versión, pero la arquitectura las soporta sin reescritura:

| Funcionalidad | Qué se necesitaría agregar |
|--------------|---------------------------|
| Módulo de ventas con tickets | Nueva tabla `tickets` con estados, nuevo flujo, nuevo rol "Farmacéutico/Cajero" |
| Devoluciones | Tabla de devoluciones, flujo inverso de FIFO |
| Dashboard con gráficos avanzados | Vistas adicionales con Recharts sobre los mismos datos |
| Alertas de tratamientos recurrentes | Query sobre historial de dispensaciones por beneficiario + cron job |
| Exportación con código de barras visual | Librería de generación de imágenes de barras en reportes PDF |
| Super Admin multi-tienda | Tabla de tiendas + filtro por tienda en todo el sistema |
| Integración con sistema de trámites municipal | API REST para comunicación entre sistemas |

---

## 6. Consideraciones Legales

El sistema almacena datos personales sensibles (DPI, historial implícito de medicamentos/diagnósticos). Conforme al Decreto 57-2008 (Ley de Acceso a la Información Pública de Guatemala), se debe incluir en el documento de entrega del proyecto una cláusula que establezca:

- Que la Municipalidad de Gualán es responsable del uso y protección de los datos almacenados en el sistema.
- Que los datos se usan exclusivamente para el control de dispensación de medicamentos.
- Que el equipo de desarrollo entrega el sistema como herramienta, sin retener acceso ni copias de los datos operativos.

---

## 7. Estructura de Carpetas del Proyecto

```
farma-rh/
├── docker-compose.yml
├── .env.example
│
├── backend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos completo
│   │   └── seed.ts                # Datos iniciales (admin, categorías, ubicaciones)
│   └── src/
│       ├── server.ts              # Entry point Express
│       ├── config/
│       │   └── env.ts             # Variables de entorno
│       ├── middleware/
│       │   ├── auth.ts            # JWT validation
│       │   ├── audit.ts           # Log automático de acciones
│       │   └── errorHandler.ts
│       ├── routes/
│       │   ├── auth.routes.ts
│       │   ├── medicamentos.routes.ts
│       │   ├── inventario.routes.ts
│       │   ├── dispensacion.routes.ts
│       │   ├── beneficiarios.routes.ts
│       │   ├── reportes.routes.ts
│       │   ├── catalogos.routes.ts
│       │   └── auditoria.routes.ts
│       ├── services/
│       │   ├── auth.service.ts
│       │   ├── inventario.service.ts
│       │   ├── dispensacion.service.ts   # Lógica FIFO + transacciones
│       │   ├── reportes.service.ts
│       │   └── vencimiento.service.ts    # Cron job de vencimientos
│       ├── utils/
│       │   ├── pdf.ts             # Generación de reportes PDF
│       │   └── excel.ts           # Generación de reportes Excel
│       └── types/
│           └── index.ts
│
├── frontend/
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── api/                   # Cliente HTTP (axios/fetch)
│       ├── components/
│       │   ├── ui/                # Componentes genéricos (botón, modal, tabla)
│       │   ├── layout/            # Sidebar, header, footer
│       │   └── shared/            # BarcodeInput, AlertBadge, SemaforoVencimiento
│       ├── pages/
│       │   ├── Login.tsx
│       │   ├── Dashboard.tsx
│       │   ├── Inventario.tsx
│       │   ├── Dispensacion.tsx
│       │   ├── Beneficiarios.tsx
│       │   ├── Reportes.tsx
│       │   ├── Catalogos/
│       │   │   ├── Medicamentos.tsx
│       │   │   ├── Categorias.tsx
│       │   │   ├── Proveedores.tsx
│       │   │   └── Ubicaciones.tsx
│       │   ├── Usuarios.tsx
│       │   └── Auditoria.tsx
│       ├── hooks/                 # Custom hooks
│       ├── context/               # AuthContext, AlertContext
│       ├── utils/
│       └── types/
│
└── docs/
    ├── especificacion_tecnica.md  # Este documento
    ├── modelo_datos.md
    └── manual_usuario.md
```

---

## 8. Próximos Pasos

1. **Instalar Docker y Docker Compose** en la máquina de desarrollo (Fedora 44).
2. **Inicializar el proyecto** con la estructura de carpetas, Dockerfiles y docker-compose.yml.
3. **Definir el schema de Prisma** completo basado en las tablas de este documento.
4. **Crear el seed** con datos iniciales: usuario admin, categorías predefinidas, ubicaciones de estantes.
5. **Desarrollar módulo por módulo** en este orden:
   - Autenticación → Catálogos → Inventario → Dispensación → Reportes → Auditoría
6. **Probar la concurrencia** con dos navegadores abiertos simultáneamente.
7. **Preparar la instalación** en la máquina de la municipalidad.
