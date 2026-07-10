import { PrismaClient } from "@prisma/client";

/**
 * Singleton Prisma Client. Next.js hot-reloads modules in dev, which would
 * otherwise create a new PrismaClient (and a new connection pool) on every
 * edit; caching it on `globalThis` avoids exhausting Neon's pooled
 * connection limit in local development.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
