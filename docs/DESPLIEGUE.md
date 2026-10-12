# Despliegue seguro

## Cómo llega un cambio al servidor

La PC de la municipalidad corre `auto-update.cmd` cada 30 minutos: `git pull origin main` y, si hubo
cambios, `docker compose up -d --build`. **Todo lo que entra a `main` queda en producción en máximo
30 minutos**, sin que nadie lo revise en sitio y sin acceso remoto para corregirlo.

## Qué hace el backend al arrancar

`backend/docker-entrypoint.sh` (lo usa el `Dockerfile`):

1. Espera a la base de datos.
2. Saca un respaldo `backups/predeploy_*.dump` y lo verifica. **Si no puede respaldar, no toca el
   esquema.**
3. Aplica solo las migraciones de `backend/prisma/migrations/` (`prisma migrate deploy`).
4. Corre el seed (idempotente; si falla, no impide el arranque).
5. Arranca la API. Ningún paso borra datos por su cuenta: si algo falla, la API arranca con el esquema
   que ya había y lo deja anotado en `backups/ESTADO_ARRANQUE.txt`.

**Primera vez en una base que ya existía** (creada con el antiguo `db push`, como la del servidor):
compara la base con `schema.prisma`. Si coinciden, la registra como migración `0_init` (baseline). Si
no, intenta solo cambios que no borran datos y vuelve a comparar. Si alinearla requiere borrar algo,
**no lo hace** y escribe `ATENCION` en `ESTADO_ARRANQUE.txt`.

## Cómo cambiar el esquema

```bash
# 1. Editar backend/prisma/schema.prisma
# 2. Generar la migración (con el sistema levantado en local):
docker compose exec api npx prisma migrate dev --name agregar_campo_x
# 3. Revisar el SQL generado en backend/prisma/migrations/<fecha>_agregar_campo_x/migration.sql
# 4. Commitear schema.prisma y la carpeta de la migración juntos, en un PR
```

- Un cambio a `schema.prisma` **sin** migración falla en el workflow (trabajo `esquema`).
- Si la migración tiene `DROP TABLE`, `DROP COLUMN`, cambios de tipo o `DELETE`, el workflow avisa.
  Eliminar datos es válido cuando el equipo lo decidió (como quitar proveedores y origen), pero queda
  escrito en el SQL y se revisa en el PR antes de que el servidor lo aplique.
- Una migración ya mergeada **no se edita**: se corrige con una nueva.
- Antes de un cambio destructivo, conviene que exista un respaldo reciente (el arranque saca uno, pero
  verifica `backups/ULTIMO_RESPALDO.txt` si tienes forma de verlo).

## Workflow "Despliegue seguro" (GitHub Actions)

Corre en cada push y en cada PR a `main` (`.github/workflows/despliegue-seguro.yml`):

| Trabajo | Qué comprueba |
| --- | --- |
| `esquema` | `schema.prisma` y las migraciones coinciden; avisa de migraciones que borran datos |
| `compilacion` | `tsc` del backend y `npm run build` del frontend |
| `despliegue` | Levanta la versión anterior **con datos**, hace lo mismo que `auto-update.cmd` con la nueva, y comprueba que los datos no cambiaron, que hay respaldos restaurables, que la API responde y que sobrevive un reinicio. Se prueba sin `.env` y con el `.env` de ejemplo |
| `instalacion` | Instalación desde cero con la versión nueva |

### Activar la protección de `main` (una sola vez, lo hace el dueño del repo)

GitHub → **Settings → Branches → Add branch ruleset / protection rule** para `main`:

- Require a pull request before merging (1 aprobación).
- Require status checks to pass: `esquema`, `compilacion`, `despliegue (sin-env)`,
  `despliegue (env-de-ejemplo)`, `instalacion`.
- Bloquear force push y borrado de la rama.

Sin esto, cualquiera con permiso de escritura puede seguir haciendo push directo a `main`.

## Si `ESTADO_ARRANQUE.txt` dice ATENCION o ERROR

- **ATENCION … requiere borrar datos**: la base del servidor no coincide con `schema.prisma` y
  alinearla borraría algo. Hay que escribir una migración explícita para ese caso.
- **SIN RESPALDO**: no se pudo escribir en `backups/` o `pg_dump` falló; el esquema no se tocó.
- **falló migrate deploy**: una migración dio error. Prisma la marca como fallida y no aplicará otras
  hasta resolverla (`npx prisma migrate resolve`), por eso el workflow `despliegue` debe pasar antes
  de mergear cualquier migración.
