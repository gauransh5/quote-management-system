/**
 * Prisma client singleton.
 *
 * In development, Next.js hot-reloads modules which would create multiple
 * Prisma Client instances. This pattern stores the client on `globalThis`
 * so it persists across hot reloads.
 *
 * Equivalent to a Spring @Bean / singleton-scoped DataSource.
 */
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
