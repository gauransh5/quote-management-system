/**
 * Extend NextAuth's default types to include our custom fields (id, role, title).
 * Without this, TypeScript would complain when accessing session.user.role.
 */
import type { Role } from "../generated/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: Role;
      title: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
    title: string | null;
  }
}
