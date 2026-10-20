# Datos de prueba

> Datos para ejecutar `casos_prueba.md` en el entorno de `plan_pruebas.md`, sección 4. Todos son
> ficticios: los nombres de personas son genéricos ("Beneficiario Prueba Uno"), los DPI son números de
> 13 dígitos que empiezan con ceros y no corresponden a ninguna persona, los correos usan el dominio
> reservado `example.com` y los códigos de barras `779…` son inventados. El único código real es el de
> OpenFDA de CP-21, que identifica un producto y no a una persona. Ninguna fotografía debe mostrar una
> receta, un rostro ni un documento reales.
>
> Todos los medicamentos, lotes y archivos llevan el prefijo QA para distinguirlos. Se cargan en la base
> de desarrollo recreada para el ciclo; nunca en la base de la municipalidad.

## 1. Usuarios

| Usuario | Nombre completo | Rol | Correo | Uso |
|---------|-----------------|-----|--------|-----|
| `admin` | (el del seed) | Administrador | — | Operaciones del Administrador |
| `qa_admin2` | Administrador Prueba | Administrador | `qa_admin2@example.com` | Segunda sesión de Administrador |
| `qa_encargado` | Encargado Prueba | Encargado de Beneficencia | `qa_encargado@example.com` | Operación diaria y permisos (CP-15) |
| `qa_temporal` | Temporal Prueba | Encargado de Beneficencia | — | Desactivación y bloqueo de inicio de sesión (CP-03, CP-06) |
| `qa_nuevo` | Usuario Prueba Nuevo | Encargado de Beneficencia | `qa_nuevo@example.com` | Se crea durante CP-09 |

Fuente: Elaboración propia.

Las contraseñas las define el ejecutor al crear las cuentas (8 caracteres o más) y no se anotan en el
repositorio ni en la evidencia. La contraseña de `admin` es la de `ADMIN_INITIAL_PASSWORD` o la que el
seed imprimió en los logs de `api` (`CLAUDE.md`, sección "Comandos").

## 2. Catálogos

**Categorías.** Se usan las 13 del seed (Analgésico, Antibiótico, Antihipertensivo, Antidiabético,
Antiinflamatorio, Antihistamínico, Antipirético, Vitamina/Suplemento, Gastrointestinal, Dermatológico,
Respiratorio, Oftálmico, Otro) y se crean:

| Categoría | Estado | Uso |
|-----------|--------|-----|
| QA Categoría Inactiva | Inactiva (crear y desactivar) | CP-43 |
| QA Carga | Activa (la crea la importación de `carga_5001.xlsx`) | CP-86 |

Fuente: Elaboración propia.

**Ubicaciones.** Las 7 del seed (A, B, C, D, E, F, BOD) y `QA-01` (Estante de prueba 1).

**Medicamentos.** Se registran como Administrador desde Registrar entrada ("Nuevo medicamento") o por
la API; los códigos de barras se agregan en Catálogos (CU-04).

| Clave | Nombre genérico | Presentación | Concentración | Unidad | Categoría | Stock mínimo | Código de barras | Estado |
|-------|-----------------|--------------|---------------|--------|-----------|-------------:|------------------|--------|
| M1 | QA Paracetamol | Tableta | 500 mg | Tableta | Analgésico | 10 | 7790000000011 | Activo |
| M2 | QA Loratadina | Tableta | 10 mg | Tableta | Antihistamínico | 1 | — | Activo |
| M3 | QA Omeprazol | Cápsula | 20 mg | Cápsula | Gastrointestinal | 10 | — | Activo |
| M4 | QA Metformina | Tableta | 850 mg | Tableta | Antidiabético | 10 | — | Activo |
| M5 | QA Amoxicilina | Cápsula | 500 mg | Cápsula | Antibiótico | 5 | — | Activo |
| M6 | QA Ibuprofeno | Tableta | 400 mg | Tableta | Antiinflamatorio | 5 | 7790000000028 | Activo |
| M7 | QA Salbutamol | Inhalador | 100 mcg | Inhalador | Respiratorio | 10 | — | Activo, sin lotes |
| M8 | QA Ranitidina | Tableta | 150 mg | Tableta | Gastrointestinal | 10 | — | Inactivo (desactivar después de cargar su lote) |
| M9 | QA Cetirizina | Tableta | 10 mg | Tableta | Antihistamínico | 10 | — | Activo |
| M10 | QA Enalapril | Tableta | 10 mg | Tableta | Antihipertensivo | 10 | 7790000000035 | Activo |

Fuente: Elaboración propia.

Medicamentos que se crean durante los casos: QA Diclofenaco (CP-17), QA Clotrimazol (CP-38), QA Ácido
Fólico y QA Sales de Rehidratación (CP-39), QA Nistatina (CP-42).

Códigos de barras sin registrar, para los casos negativos: `7790000000042` (se agrega y elimina en
CP-24), `7790000000059` (CP-38), `7790000000066` (lo vincula la importación de CP-39) y
`7790000000099` (nunca se registra). Código real para OpenFDA: `00303789205353` (CP-21).

## 3. Lotes

Se registran con una o varias entradas manuales (CU-07) como `qa_encargado`. "hoy + N" se calcula el
día de la carga. Los lotes marcados con (SQL) se registran con hoy + 1, porque el sistema no acepta una
fecha de hoy ni anterior, y se ajustan después con las consultas de la sección 5.

| Lote | Medicamento | Cantidad | Vencimiento | Ubicación | Costo unitario | Uso |
|------|-------------|---------:|-------------|-----------|---------------:|-----|
| QA-F-A | M1 QA Paracetamol | 5 | hoy + 20 | A | 0.25 | FIFO (CP-64) |
| QA-F-B | M1 QA Paracetamol | 10 | hoy + 60 | A | 0.25 | FIFO; lote repetido (CP-42) |
| QA-F-C | M1 QA Paracetamol | 10 | hoy + 200 | B | 0.25 | FIFO |
| QA-S-30 | M2 QA Loratadina | 2 | hoy + 30 | C | — | Semáforo (CP-45) |
| QA-S-31 | M2 QA Loratadina | 2 | hoy + 31 | C | — | Semáforo |
| QA-S-90 | M2 QA Loratadina | 2 | hoy + 90 | C | — | Semáforo |
| QA-S-91 | M2 QA Loratadina | 2 | hoy + 91 | C | — | Semáforo |
| QA-O-1 | M3 QA Omeprazol | 9 | hoy + 300 | D | — | Stock bajo (CP-46) |
| QA-MF-1 | M4 QA Metformina | 10 | hoy + 300 | D | — | Stock igual al mínimo (CP-46, CP-65) |
| QA-V-HOY | M5 QA Amoxicilina | 4 | hoy (SQL) | E | 1.00 | Lote vencido sin marcar (CP-52, CP-53) |
| QA-V-OK | M5 QA Amoxicilina | 6 | hoy + 100 | E | 1.00 | CP-53 |
| QA-V-AGO | M5 QA Amoxicilina | 1 (SQL: 0, agotado) | ayer (SQL) | E | 1.00 | Lote agotado que no debe cambiar (CP-52) |
| QA-C-1 | M6 QA Ibuprofeno | 20 | hoy + 300 | F | — | Concurrencia (CP-67) |
| QA-R-1 | M8 QA Ranitidina | 10 | hoy + 300 | F | — | Medicamento inactivo (CP-37, CP-69) |
| QA-B-1 | M9 QA Cetirizina | 10 | hoy + 150 | BOD | 0.80 | Baja (CP-50) |
| QA-B-2 | M9 QA Cetirizina | 5 | hoy + 180 | BOD | 0.80 | Baja cancelada (CP-51) |
| QA-EN-1 | M10 QA Enalapril | 50 | hoy + 400 | A | — | Dispensación y evidencia (CP-63 y CU-16) |

Fuente: Elaboración propia.

## 4. Beneficiarios y archivos

**Beneficiarios.**

| Nombre completo | DPI | Teléfono | Dirección | Uso |
|-----------------|-----|----------|-----------|-----|
| Beneficiario Prueba Uno | 0000000000001 | 5555-0001 | Dirección de prueba 1 | FIFO, historial (CP-60, CP-64) |
| Beneficiario Prueba Dos | 0000000000002 | 5555-0002 | Dirección de prueba 2 | Evidencia (CP-61, CP-63, CU-16) |
| Beneficiario Prueba Tres | — | — | — | Sin dispensaciones (CP-59, CP-62) |
| Beneficiario Prueba Cuatro | 0000000000004 | 5555-0004 | — | Se crea en CP-56 |
| Beneficiario Prueba Cinco | — | — | — | Se crea en CP-70 |

Fuente: Elaboración propia.

**Imágenes** (carpeta local del ejecutor, fuera del repositorio):

| Archivo | Contenido | Uso |
|---------|-----------|-----|
| `receta.jpg`, `receta2.jpg` | Foto de una hoja con el texto "RECETA DE PRUEBA", menos de 5 MB | CP-72, CP-75, CP-76, CP-79 |
| `entrega.png` | Foto de una caja de medicamento vacía, menos de 5 MB | CP-72, CP-75, CP-76 |
| `foto_medicamento.jpg` | Foto de una caja de medicamento, menos de 5 MB | CP-20 |
| `grande.jpg` | Cualquier foto JPG de más de 5 MB | CP-22, CP-74 |
| `documento.pdf` | Cualquier PDF pequeño | CP-22, CP-74 |
| `falso.jpg` | Archivo de texto renombrado a `.jpg` | CP-22, CP-74 |

Fuente: Elaboración propia.

**Archivos de Excel** (partir de la plantilla que entrega el sistema, CP-39; columnas `nombreGenerico`,
`nombreComercial`, `presentacion`, `concentracion`, `unidadMedida`, `categoria`, `codigoBarras`,
`cantidad`, `numeroLote`, `fechaVencimiento`, `ubicacion`):

| Archivo | Filas de datos |
|---------|----------------|
| `import_valida.xlsx` | Fila 2: QA Ácido Fólico, Tableta, 5 mg, Tableta, QA Importada, `7790000000066`, 100, QA-I-1, hoy + 365, QA-IMP. Fila 3: QA Ácido Fólico, Tableta, 5 mg, Tableta, QA Importada, —, 50, QA-I-2, hoy + 400, A. Fila 4: QA Sales de Rehidratación, Sobre, 27.9 g, Sobre, Gastrointestinal, —, 40, QA-I-3, hoy + 500, B |
| `import_errores.xlsx` | Filas 2 y 3: dos lotes válidos de QA Ácido Fólico (QA-I-4, QA-I-5). Fila 4: cantidad 12.5. Fila 5: fecha 31/02/2027. Fila 6: fecha de hoy |
| `import_sin_columnas.xlsx` | La plantilla sin la columna `fechaVencimiento`, con una fila de datos |
| `import_vacia.xlsx` | Solo la fila de encabezados |
| `no_excel.xlsx` | Archivo de texto renombrado a `.xlsx` |
| `import_repetidos.xlsx` | Fila 2: QA Paracetamol, Tableta, 500 mg, lote QA-F-B con la misma fecha cargada. Fila 3: QA Ranitidina, lote QA-R-2. Fila 4: QA Nistatina, Suspensión, 100000 UI/ml, Frasco, Otro, código `7790000000011`, lote QA-N-1 |
| `import_h48.xlsx` | QA Paracetamol, Tableta, 500 mg, categoría QA Categoría Inactiva, lote QA-H48-1, 10 unidades, hoy + 250 |
| `carga_5001.xlsx` | 5001 filas de QA Carga, Tableta, 1 mg, Tableta, categoría QA Carga, 1 unidad, lotes QA-CARGA-0001 a QA-CARGA-5001 (rellenar la serie en Excel), hoy + 365. Se importa al final del ciclo, para CP-86 |

Fuente: Elaboración propia.

## 5. Ajustes con SQL

Se ejecutan con `docker compose exec db psql -U farmag -d farmag_db` (usuario y base según el `.env`
del entorno). Las columnas `created_at` y `expira_en` guardan la hora UTC sin zona; por eso las horas
de Guatemala se convierten con `AT TIME ZONE`.

```sql
-- Fecha de hoy en Guatemala (la base corre en UTC).
-- QA-V-HOY: vence hoy y sigue DISPONIBLE (CP-53; no reiniciar la API antes de ese caso).
UPDATE lotes SET fecha_vencimiento = (now() AT TIME ZONE 'America/Guatemala')::date
 WHERE numero_lote = 'QA-V-HOY';

-- QA-V-AGO: agotado y con fecha de ayer (CP-52).
UPDATE lotes SET fecha_vencimiento = (now() AT TIME ZONE 'America/Guatemala')::date - 1,
       cantidad_actual = 0, estado = 'AGOTADO'
 WHERE numero_lote = 'QA-V-AGO';

-- Enlace de captura vencido (CP-52, CP-73). <id> = id de la dispensación.
UPDATE tokens_captura SET expira_en = (now() AT TIME ZONE 'UTC') - interval '1 minute'
 WHERE dispensacion_id = '<id>';

-- Registro a una hora local dada (CP-71, CP-81, CP-82, CP-91).
-- Ejemplo: 19:00 de ayer en Guatemala. Cambiar la tabla (dispensaciones, entradas, log_auditoria),
-- el día (- 1 o - 0) y la hora ('10:00', '19:00', '23:30') según el caso.
UPDATE dispensaciones
   SET created_at = ((((now() AT TIME ZONE 'America/Guatemala')::date - 1) + time '19:00')
                     AT TIME ZONE 'America/Guatemala') AT TIME ZONE 'UTC'
 WHERE id = '<id>';
```

Para CP-71, CP-81, CP-82 y CP-91 se registra primero una dispensación (o entrada) normal de 1 unidad
de QA Enalapril y luego se cambia su `created_at` con la última consulta. Para el registro de auditoría
de CP-91 se toma el `id` de un registro de `log_auditoria` creado en el ciclo.

## 6. Petición simultánea (CP-67)

Desde Git Bash, con los tokens de `admin` y `qa_encargado` en `TA` y `TE` y los id de QA Ibuprofeno y de
los beneficiarios en `MED`, `B1` y `B2`:

```bash
URL=http://localhost:3000/api/dispensacion/despachar
curl -s -o r1.json -w "%{http_code}\n" -X POST $URL -H "Authorization: Bearer $TA" \
  -H "Content-Type: application/json" \
  -d "{\"beneficiarioId\":\"$B1\",\"items\":[{\"medicamentoId\":\"$MED\",\"cantidad\":15}]}" &
curl -s -o r2.json -w "%{http_code}\n" -X POST $URL -H "Authorization: Bearer $TE" \
  -H "Content-Type: application/json" \
  -d "{\"beneficiarioId\":\"$B2\",\"items\":[{\"medicamentoId\":\"$MED\",\"cantidad\":15}]}" &
wait; cat r1.json r2.json
```

## 7. Comprobación de la carga

Antes de empezar (criterio de entrada 3):

1. Inventario muestra los 10 medicamentos QA, con QA Ranitidina fuera de la lista por estar inactivo.
2. Stock: QA Paracetamol 25, QA Loratadina 8, QA Omeprazol 9, QA Metformina 10, QA Amoxicilina 6
   (después del ajuste SQL de QA-V-HOY), QA Ibuprofeno 20, QA Salbutamol 0, QA Cetirizina 15,
   QA Enalapril 50.
3. Los 3 usuarios de prueba existen, activos y con su rol.
4. Los 3 beneficiarios de prueba existen.
5. Se anotan en el registro de ejecución la fecha de carga y la fecha de hoy usada en los cálculos.

La base vacía, antes de esta carga, se usa para CP-55.
