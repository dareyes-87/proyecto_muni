# ANEXO B

# INFORME DE PRUEBAS DE PENETRACIÓN

[COMPLETAR: se incorpora el informe de pruebas de penetración elaborado por \<integrante\>]

El informe se respalda en los documentos de la carpeta `docs/seguridad/` del repositorio, que se
presentan en la Tabla 200. Los documentos se elaboraron entre el 7 y el 8 de octubre de 2026 sobre el
entorno de desarrollo, antes de las correcciones integradas en los *pull requests* 4 a 9, por lo que
algunos datos ya no coinciden con el código del commit `bdf1187`. [COMPLETAR: autor de los informes
y si se elaboraron con asistencia de una herramienta de inteligencia artificial, para citarlos
correctamente].

Tabla 200.
Informes de seguridad que respaldan las pruebas de penetración

| Documento | Contenido |
|-----------|-----------|
| `SECURITY_PENTEST.md` | Informe principal de la auditoría ofensiva, con pruebas reales contra la API local |
| `SECURITY_TEST_MATRIX.md` | Matriz de 62 pruebas de seguridad con el resultado HTTP observado |
| `ATTACK_SURFACE.md` | Mapa de la superficie de ataque: rutas, roles, rutas públicas y puertos |
| `SECURITY_AUDIT.md` | Revisión según OWASP Top 10, subida de archivos, recorrido de directorios, secretos y dependencias |
| `SECURITY_FIXES.md` | Correcciones aplicadas durante la auditoría ofensiva, con su estado antes y después |
| `CIERRE_SEGURIDAD.md` | Cierre de los riesgos pendientes: límite de inicio de sesión por IP, cabeceras de producción y pruebas de regresión |
| `VERIFICACION_DIFERENCIAS_SEGURIDAD_MAIN.md` | Comparación de la rama de seguridad con la rama principal y pruebas de regresión |
| `REMAINING_SECURITY_RISKS.md` | Riesgos residuales aceptados o pendientes y lista mínima de verificación previa a producción |
| `AUDITORIA_COMPLETA.md` | Auditoría técnica del sistema (funcional, backend, frontend, base de datos, seguridad y despliegue) |

Fuente: Elaboración propia con base en la carpeta `docs/seguridad/` del repositorio.
