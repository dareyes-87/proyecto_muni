# Herramientas de IA para trabajar en FarmaG

Skills de Claude Code que el equipo usa en este proyecto: qué hace cada una, cuándo usarla y qué
cuidar. Las skills son **instrucciones** que Claude Code sigue, no código del sistema: nada de esto
se despliega al servidor.

> Están instaladas **de forma global** en la máquina de Daniel (`~/.claude/`). Quien quiera usarlas
> en su equipo debe instalarlas (ver "Instalación" al final). Si una skill no aparece al escribir
> `/`, no está instalada en esa máquina: trabaja sin ella, no la inventes.

## Cuál usar para qué

| Situación | Skill | Comando |
|---|---|---|
| Revisar una rama antes del PR (obligatorio) | ponytail | `/ponytail-review branch` |
| Auditoría general del código / deuda técnica | ponytail | `/ponytail-audit`, `/ponytail-debt` |
| Mejorar una pantalla o un flujo del personal | impeccable | `/impeccable critique <pantalla>` y luego `distill`, `clarify`, `harden`, `layout`, `audit` |
| Aclarar un cambio antes de programarlo | mattpocock | `/grill-with-docs` |
| Registrar vocabulario y decisiones del proyecto | mattpocock | `/grill-with-docs` (escribe `GLOSSARY.md` y ADRs en `docs/`) |
| Bug difícil o regresión | mattpocock | `/diagnosing-bugs` |
| Lógica nueva con pruebas primero | mattpocock | `/tdd` |
| Buscar módulos para simplificar | mattpocock | `/improve-codebase-architecture` |
| Aprender un concepto | mattpocock | `/teach` |
| Monitoreo, logs, alertas | addyosmani | `observability-and-instrumentation` (se activa sola) |
| Preparar una versión para el servidor | addyosmani | `shipping-and-launch` (se activa sola) |

Regla general: **diagnosticar antes de cambiar.** `critique`, `audit` y `grill-with-docs` primero;
los comandos que modifican código después, sobre una rama y en un PR pequeño.

## Reglas que ninguna skill cambia

1. **Nunca trabajar en `main`.** Lo que entra a `main` llega solo al servidor de la municipalidad en
   máximo 30 minutos. Todo va por rama → PR → los 6 checks del workflow "Despliegue seguro" → merge.
2. **El repo es público.** `PRODUCT.md`, `DESIGN.md`, `GLOSSARY.md`, los ADRs y `.impeccable/` se
   commitean: nada de nombres de beneficiarios, IPs, contraseñas ni datos del servidor.
3. **Los hallazgos de una skill son hipótesis.** Se verifican en el código antes de corregir.
4. **Un comando de diseño no toca lógica de negocio.** Si `impeccable` cambia cálculo de stock, FIFO
   de lotes, validaciones o rutas de la API, ese cambio se descarta.
5. **Decisiones del equipo que las skills no deben "corregir":**
   - Proveedores y procedencia se eliminaron a propósito (motivos legales; el sistema gestiona, no
     verifica stock físico).
   - Los usuarios no cambian su propia contraseña (las cuentas se heredan a futuros trabajadores).
   - No hay disco adicional para respaldos (la opción queda documentada en `docs/RESPALDOS.md`).
6. Ver `docs/DESPLIEGUE.md` antes de tocar `schema.prisma`, Docker o el workflow.

## Notas por skill

### impeccable (diseño de interfaz)
- Contexto del producto en `PRODUCT.md` (raíz). Sistema visual en `DESIGN.md` si se genera con
  `/impeccable document`.
- El detector sin IA sirve para medir antes y después: `npx impeccable detect frontend/src/`.
- El hook automático **no** está instalado (se instaló con `--no-hooks`). Telemetría apagada.
- `live` solo contra el entorno local, nunca contra el servidor de la municipalidad.
- No sustituye probar con el personal: cronometrar el flujo real antes y después de cada cambio.

### mattpocock
- Configurada por repo con `/setup-matt-pocock-skills` (gestor de tareas: GitHub Issues; documentos
  en `docs/`).

### addyosmani (solo dos skills)
- `shipping-and-launch` puede recomendar *trunk-based development*. Este proyecto prefiere ramas y
  versiones porque el servidor se actualiza solo y no hay acceso remoto para corregir.

### Pendiente: cloudflare/security-audit
- No instalada. Se usará más adelante, una vez, con salida **fuera del repo** (reportes de
  vulnerabilidades no se publican).

## Instalación (en otra máquina)

```bash
# ponytail
claude plugin marketplace add DietrichGebert/ponytail
claude plugin install ponytail@ponytail
# mattpocock
claude plugin install mattpocock-skills@claude-plugins-official
# impeccable
npx impeccable telemetry off
npx impeccable install --providers=claude --scope=global --no-hooks
# addyosmani (solo estas dos; -a claude-code es necesario)
npx skills add addyosmani/agent-skills --skill observability-and-instrumentation \
  --skill shipping-and-launch -g -a claude-code
```

Para que Claude Code no pida permiso cada vez que una skill lee sus instrucciones, en
`~/.claude/settings.json`:

```json
"permissions": { "allow": ["Read(~/.claude/skills/**)", "Read(~/.claude/plugins/**)"] }
```
