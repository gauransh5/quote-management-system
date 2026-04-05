/**
 * Database seed script — creates an initial admin user for testing.
 *
 * Run with: npx tsx prisma/seed.ts
 *
 * The password is hashed with bcrypt before storing.
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await bcrypt.hash("admin123", 12);

  const admin = await prisma.user.upsert({
    where: { email: "admin@bosssecurity.ca" },
    update: {},
    create: {
      email: "admin@bosssecurity.ca",
      passwordHash,
      name: "Admin User",
      title: "System Administrator",
      role: "ADMIN",
    },
  });

  console.log("Seeded admin user:", admin.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
