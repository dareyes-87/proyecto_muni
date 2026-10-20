# Registro de ejecución de las pruebas funcionales

> Se llena durante la ejecución de `casos_prueba.md`. No se anotan resultados que no se hayan
> observado: un caso no ejecutado queda con la fila vacía.

## Datos del ciclo

| Campo | Valor |
|-------|-------|
| Ciclo | [COMPLETAR: número de ciclo, p. ej. 1] |
| Commit probado | [COMPLETAR: hash del commit; `bdf1187` para el primer ciclo] |
| Fecha de carga de datos ("hoy" de los cálculos) | [COMPLETAR] |
| Ejecutor | [COMPLETAR] |
| Navegador y versión | [COMPLETAR] |
| Teléfono y navegador (CP-77) | [COMPLETAR] |
| `npm test` antes del ciclo | [COMPLETAR: aprobadas / total] |
| `npm test` después del ciclo | [COMPLETAR: aprobadas / total] |

## Instrucciones

- **Estado:** Aprobado (el resultado obtenido coincide con el esperado), Fallido (no coincide) o
  Bloqueado (no se pudo ejecutar; anotar la causa en "Resultado obtenido").
- **Defecto:** para un caso Fallido, el hallazgo de `analisis/hallazgos_defectos.md`. Los 14 casos de
  hallazgos abiertos (CP-07, CP-08, CP-16, CP-26, CP-29, CP-32, CP-43, CP-49, CP-71, CP-78, CP-79,
  CP-82, CP-88, CP-91) ya tienen su H-XX; si otro caso falla, se agrega un hallazgo nuevo con el
  siguiente número libre y se anota aquí.
- **Evidencia:** nombre del archivo en `pruebas/evidencia/` (captura, salida de `curl` o consulta).
- **Orden de ejecución sugerido**, por dependencias de datos:
  1. CP-55 (base vacía), luego cargar `datos_prueba.md` y ejecutar los ajustes SQL de QA-V-HOY y
     QA-V-AGO.
  2. CU-01 y CU-02, salvo CP-03 y CP-04.
  3. CU-03 a CU-08 (CP-17 antes de CP-20 a CP-24 y de CP-33; CP-86 queda para el final).
  4. CP-50, CP-51, CP-44 a CP-49.
  5. CP-53 (sin reiniciar la API), CU-13, CP-63 a CP-70, CU-16, CP-60 a CP-62.
  6. CP-52 (reinicio de la API), CP-54, CU-17, CU-18 (sin CP-86), CU-19.
  7. CP-71, CP-81, CP-82, CP-91 (ajustes de `created_at`).
  8. CP-03, CP-04 y, al final, CP-86 (carga de 5001 lotes).

## Registro

| ID | Fecha | Resultado obtenido | Estado | Defecto (H-XX) | Evidencia |
|----|-------|--------------------|--------|----------------|-----------|
| CP-01 | | | | | |
| CP-02 | | | | | |
| CP-03 | | | | | |
| CP-04 | | | | | |
| CP-05 | | | | | |
| CP-06 | | | | | |
| CP-07 | | | | H-47 (esperado) | |
| CP-08 | | | | H-10 (esperado) | |
| CP-09 | | | | | |
| CP-10 | | | | | |
| CP-11 | | | | | |
| CP-12 | | | | | |
| CP-13 | | | | | |
| CP-14 | | | | | |
| CP-15 | | | | | |
| CP-16 | | | | H-15 (esperado) | |
| CP-17 | | | | | |
| CP-18 | | | | | |
| CP-19 | | | | | |
| CP-20 | | | | | |
| CP-21 | | | | | |
| CP-22 | | | | | |
| CP-23 | | | | | |
| CP-24 | | | | | |
| CP-25 | | | | | |
| CP-26 | | | | H-31 (esperado) | |
| CP-27 | | | | | |
| CP-28 | | | | | |
| CP-29 | | | | H-42 (esperado) | |
| CP-30 | | | | | |
| CP-31 | | | | | |
| CP-32 | | | | H-42 (esperado) | |
| CP-33 | | | | | |
| CP-34 | | | | | |
| CP-35 | | | | | |
| CP-36 | | | | | |
| CP-37 | | | | | |
| CP-38 | | | | | |
| CP-39 | | | | | |
| CP-40 | | | | | |
| CP-41 | | | | | |
| CP-42 | | | | | |
| CP-43 | | | | H-48 (esperado) | |
| CP-44 | | | | | |
| CP-45 | | | | | |
| CP-46 | | | | | |
| CP-47 | | | | | |
| CP-48 | | | | | |
| CP-49 | | | | H-43 (esperado) | |
| CP-50 | | | | | |
| CP-51 | | | | | |
| CP-52 | | | | | |
| CP-53 | | | | | |
| CP-54 | | | | | |
| CP-55 | | | | | |
| CP-56 | | | | | |
| CP-57 | | | | | |
| CP-58 | | | | | |
| CP-59 | | | | | |
| CP-60 | | | | | |
| CP-61 | | | | | |
| CP-62 | | | | | |
| CP-63 | | | | | |
| CP-64 | | | | | |
| CP-65 | | | | | |
| CP-66 | | | | | |
| CP-67 | | | | | |
| CP-68 | | | | | |
| CP-69 | | | | | |
| CP-70 | | | | | |
| CP-71 | | | | H-45 (esperado) | |
| CP-72 | | | | | |
| CP-73 | | | | | |
| CP-74 | | | | | |
| CP-75 | | | | | |
| CP-76 | | | | | |
| CP-77 | | | | | |
| CP-78 | | | | H-38 (esperado) | |
| CP-79 | | | | H-35 (esperado) | |
| CP-80 | | | | | |
| CP-81 | | | | | |
| CP-82 | | | | H-46 (esperado) | |
| CP-83 | | | | | |
| CP-84 | | | | | |
| CP-85 | | | | | |
| CP-86 | | | | | |
| CP-87 | | | | | |
| CP-88 | | | | H-44 (esperado) | |
| CP-89 | | | | | |
| CP-90 | | | | | |
| CP-91 | | | | H-46 (esperado) | |
| CP-92 | | | | | |

## Resumen del ciclo

| Prioridad | Casos | Ejecutados | Aprobados | Fallidos | Fallidos por hallazgo ya registrado | Bloqueados |
|-----------|------:|-----------:|----------:|---------:|------------------------------------:|-----------:|
| Alta | 38 | | | | | |
| Media | 40 | | | | | |
| Baja | 14 | | | | | |
| **Total** | **92** | | | | | |

Defectos nuevos registrados en el ciclo: [COMPLETAR]

¿Se cumplen los criterios de salida de `plan_pruebas.md`, sección 6? [COMPLETAR: Sí/No y motivo]

| Rol | Nombre | Fecha |
|-----|--------|-------|
| Ejecutor | [COMPLETAR] | [COMPLETAR] |
| Responsable de pruebas | Audias Guevara | [COMPLETAR] |
