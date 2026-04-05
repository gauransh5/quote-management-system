/**
 * Prisma client singleton with the PrismaPg driver adapter.
 *
 * Prisma v7 requires a driver adapter for all databases (it no longer
 * bundles the Rust query engine). We use @prisma/adapter-pg which wraps
 * the standard `pg` Node.js driver.
 *
 * In development, Next.js hot-reloads modules which would create multiple
 * Prisma Client instances. This pattern stores the client on `globalThis`
 * so it persists across hot reloads.
 *
 * Equivalent to a Spring @Bean / singleton-scoped DataSource.
 */
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function makePrisma() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof makePrisma> | undefined;
};

export const prisma = globalForPrisma.prisma ?? makePrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
