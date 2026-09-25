# Pendientes de la instalación real

El responsable confirmó que el sistema ya fue instalado en la Farmacia Municipal de Gualán y opera
en red local (confirmado por Audias Guevara, 2026-09-25; ver R-02 en `preguntas_abiertas.md`).
Los datos siguientes no se pueden obtener del repositorio y deben recopilarse en el sitio. Se usarán
principalmente en el Capítulo 7 (Transición).

No registrar contraseñas, secretos ni nombres de usuarios del sistema en este archivo.

| # | Dato por recopilar | Valor | Relacionado con |
|---|--------------------|-------|-----------------|
| 1 | Fecha de instalación y quién la realizó | [COMPLETAR: fecha de instalación y persona(s) que la realizaron] | R-02 |
| 2 | Equipo servidor: marca/modelo, procesador, RAM, disco, sistema operativo | [COMPLETAR: marca/modelo] · [COMPLETAR: procesador] · [COMPLETAR: RAM] · [COMPLETAR: disco] · [COMPLETAR: sistema operativo y versión] | — |
| 3 | Versión de Docker Desktop instalada | [COMPLETAR: versión de Docker Desktop (y de Docker Compose, con `docker compose version`)] | P-01, P-02 |
| 4 | Modo de ejecución usado (desarrollo, puerto 5173 / producción, puerto 80) | [COMPLETAR: valor de `FRONTEND_TARGET` en el `.env` de la instalación] | D-12, H-08, P-04 |
| 5 | Cómo acceden los usuarios (IP y puerto, número de equipos cliente) | [COMPLETAR: URL de acceso (IP:puerto)] · [COMPLETAR: número de equipos cliente] | P-04 |
| 6 | Si se cambiaron `JWT_SECRET` y `DB_PASSWORD` respecto a los valores por defecto | [COMPLETAR: Sí/No para cada uno, sin transcribir los valores] | P-06, H-03 |
| 7 | Si el equipo tiene firewall y qué puertos quedaron abiertos | [COMPLETAR: firewall activo Sí/No; puertos abiertos (80, 5173, 3000, 5432)] | P-12, H-04 |
| 8 | Lector de código de barras: marca/modelo y modo de conexión (USB/teclado) | [COMPLETAR: marca/modelo del lector] · [COMPLETAR: modo de conexión] | — |
| 9 | Si se configuró respaldo de la base de datos y con qué frecuencia | [COMPLETAR: respaldo configurado Sí/No; método; frecuencia; ubicación de las copias] | H-05 |
| 10 | Usuarios creados en producción (solo cantidad por rol) | [COMPLETAR: cantidad con rol ADMIN] · [COMPLETAR: cantidad con rol ENCARGADO_BENEFICENCIA] | — |
| 11 | Capacitación impartida al personal (fecha, duración, asistentes por puesto) | [COMPLETAR: fecha(s)] · [COMPLETAR: duración] · [COMPLETAR: número de asistentes por puesto] | — |
