// Cliente Prisma único y compartido por toda la aplicación (H-005).
//
// Antes cada ruta/servicio/middleware hacía `new PrismaClient()`, abriendo un
// pool de conexiones independiente por módulo (~11 pools). Con un solo cliente
// se usa un único pool, evitando el agotamiento de conexiones de PostgreSQL.
//
// El patrón con `globalThis` evita además que `tsx watch` cree un cliente nuevo
// en cada recarga en caliente durante el desarrollo.

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
