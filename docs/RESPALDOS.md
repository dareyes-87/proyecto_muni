# Respaldos automáticos de la base de datos

El servicio `backup` de `docker-compose.yml` guarda una copia completa de la base de datos
(`pg_dump`, formato personalizado) en la carpeta **`backups/`** de la PC donde corre el sistema.

| Qué | Valor por defecto | Cómo cambiarlo (en `.env`) |
| --- | --- | --- |
| Frecuencia | Al arrancar y luego cada 12 horas | `BACKUP_INTERVAL_HOURS` |
| Retención | 14 días | `BACKUP_KEEP_DAYS` |
| Nombre de archivo | `farmag_AAAAMMDD_HHMMSSZ.dump` (hora **UTC**: en Guatemala son 6 horas menos) | — |

Además, el backend saca un **respaldo previo** cada vez que arranca (en cada actualización y en
cada reinicio de la PC), antes de tocar el esquema: `backups/predeploy_AAAAMMDD_HHMMSSZ.dump`. Se
conservan los 10 más recientes (`PREDEPLOY_BACKUP_KEEP`). El resultado de cada arranque queda en
`backups/ESTADO_ARRANQUE.txt`. Ambos tipos de archivo se restauran igual (ver abajo).

Usa las mismas variables `DB_USER`, `DB_PASSWORD` y `DB_NAME` que el resto del sistema, así que
no necesita configuración nueva.

## Comprobar que funciona

En la carpeta `backups/`:

- `ULTIMO_RESPALDO.txt`: dice `OK <fecha>` o `ERROR <fecha>` del último intento.
- `historial_respaldos.log`: una línea por intento, con el tamaño del archivo si salió bien.
- Si un intento falla, el servicio lo reintenta a los 5 minutos y **no borra** los respaldos buenos.
- Cada archivo se verifica con `pg_restore -l` antes de aceptarlo; uno incompleto se descarta.

Desde una terminal en la carpeta del proyecto: `docker compose logs backup`.

## Restaurar un respaldo

> Solo en caso de pérdida o daño de datos. `--clean` **reemplaza** las tablas actuales por las del
> respaldo: todo lo registrado después de esa copia se pierde. Antes de restaurar, guarda una copia
> del estado actual si todavía es legible.

En PowerShell, desde `C:\proyecto_muni` (ajusta el nombre del archivo; si el `.env` define otro
`DB_USER` o `DB_NAME`, úsalos en lugar de `farmag` y `farmag_db`):

```powershell
docker compose stop api
docker cp .\backups\farmag_AAAAMMDD_HHMMSSZ.dump farmag_db:/tmp/restaurar.dump
docker exec farmag_db pg_restore -U farmag -d farmag_db --clean --if-exists --no-owner /tmp/restaurar.dump
docker exec farmag_db rm /tmp/restaurar.dump
docker compose start api
```

No uses `<` ni `>` de PowerShell para pasar el archivo: corrompe datos binarios. Por eso se usa `docker cp`.

## Límites

- Los respaldos están **en el mismo disco** que la base de datos. Protegen de un error de software
  o de borrado de datos, no de la falla o pérdida de la PC. Copia `backups/` a otro equipo o a un
  disco externo cada cierto tiempo.
- La carpeta `backend/uploads/` (fotos de medicamentos y de dispensaciones) **no** forma parte de
  estos respaldos; se copia aparte.
- Se conservan hasta 28 copias (14 días × 2 al día). Si la base de datos crece mucho, revisa el
  espacio libre del disco.
- Los respaldos contienen **datos personales** (DPI y datos de los beneficiarios, dispensaciones y
  bitácora de auditoría). Trátalos como información sensible: no los subas a servicios públicos ni
  los envíes por correo o chat, y guarda las copias externas en un lugar con acceso restringido.
- Un respaldo refleja el esquema de la base **en el momento en que se hizo**. Si un cambio de esquema
  elimina columnas o tablas (como ocurrió al quitar proveedores y origen), los respaldos posteriores
  ya no las tendrán; los anteriores sí. Conserva al menos un respaldo previo antes de cada cambio
  de esquema.
