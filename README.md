# FarmaRH — Sistema de Farmacia Municipal

Sistema web para la gestión de inventario y dispensación gratuita de medicamentos de la Farmacia Municipal de Gualán, Zacapa, Guatemala.

## Requisitos

- [Docker](https://docs.docker.com/get-docker/) y Docker Compose
- [Git](https://git-scm.com/)
- [Node.js 20 LTS](https://nodejs.org/) (para desarrollo local sin Docker)

## Inicio Rápido

```bash
# 1. Clonar el repositorio
git clone https://github.com/dareyes-87/proyecto_muni.git
cd proyecto_muni

# 2. Copiar variables de entorno
cp .env.example .env

# 3. Levantar los contenedores
docker compose up --build

# 4. Acceder al sistema
# Frontend: http://localhost:5173 (desarrollo)
# API:      http://localhost:3000/api/health
```

## Credenciales Iniciales

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| admin | admin2026 | Administrador |

**Cambiar la contraseña después del primer acceso.**

## Equipo de Desarrollo

| Integrante | Módulo |
|-----------|--------|
| Daniel Reyes | Inventario + Setup + Admin |
| Jorge Vargas | Dispensación |
| Audias Guevara | Catálogos |

## Documentación

- `docs/FarmaRH_Especificacion_Tecnica_v1.md` — Especificación técnica completa
- `CLAUDE.md` — Contexto del proyecto y estado de tareas por integrante
