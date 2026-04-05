import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hash = await bcrypt.hash("admin123", 10);
  const user = await prisma.user.upsert({
    where: { email: "admin" },
    update: {},
    create: {
      email: "admin",
      passwordHash: hash,
      name: "Admin",
      role: "ADMIN",
      active: true,
    },
  });
  console.log("Admin user created:", user.id, user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
