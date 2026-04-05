/**
 * /api/users
 *
 * GET  — List all users (admin only).
 * POST — Create a new user (admin only).
 *
 * Request body (POST, JSON):
 *   { email, password, name, title?, role? }
 *
 * Responses:
 *   GET  200 — { data: User[] }
 *   POST 201 — { data: User }
 *   POST 400 — Validation error
 *   401 — Not authenticated
 *   403 — Not admin
 *   409 — Email already exists
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const createUserSchema = z.object({
  email: z.email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(1, "Name is required"),
  title: z.string().optional(),
  role: z.enum(["ADMIN", "SALES"]).default("SALES"),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 } as const;
  if (session.user.role !== "ADMIN")
    return { error: "Forbidden", status: 403 } as const;
  return { session } as const;
}

export async function GET() {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      role: true,
      photoUrl: true,
      active: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existing) {
    return NextResponse.json(
      { error: "A user with this email already exists" },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(data.password, 12);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      name: data.name,
      title: data.title ?? null,
      role: data.role,
    },
    select: {
      id: true,
      email: true,
      name: true,
      title: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: user }, { status: 201 });
}
