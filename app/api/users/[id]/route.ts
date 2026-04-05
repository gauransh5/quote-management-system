/**
 * /api/users/[id]
 *
 * PATCH — Update a user (admin only). Body: { name?, email?, title?, role?, password?, active? }
 * DELETE — Soft-delete a user (set active: false). Admin only. Cannot delete self.
 *
 * Responses:
 *   PATCH 200 — { data: User }
 *   PATCH 400 — Validation error
 *   PATCH 404 — User not found
 *   PATCH 409 — Email already in use by another user
 *   DELETE 200 — { success: true }
 *   DELETE 403 — Cannot delete your own account
 *   DELETE 404 — User not found
 *   401 — Not authenticated
 *   403 — Not admin
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { z } from "zod/v4";

const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.email("Valid email is required").optional(),
  title: z.string().optional(),
  role: z.enum(["ADMIN", "SALES"]).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  active: z.boolean().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 } as const;
  if (session.user.role !== "ADMIN")
    return { error: "Forbidden", status: 403 } as const;
  return { session } as const;
}

const userSelect = {
  id: true,
  email: true,
  name: true,
  title: true,
  role: true,
  active: true,
  createdAt: true,
} as const;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await params;
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.email !== undefined && data.email !== existing.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: data.email },
    });
    if (emailTaken) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }
  }

  const updateData: {
    name?: string;
    email?: string;
    title?: string | null;
    role?: "ADMIN" | "SALES";
    active?: boolean;
    passwordHash?: string;
  } = {};

  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.title !== undefined) updateData.title = data.title || null;
  if (data.role !== undefined) updateData.role = data.role;
  if (data.active !== undefined) updateData.active = data.active;
  if (data.password !== undefined) {
    updateData.passwordHash = await bcrypt.hash(data.password, 12);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  return NextResponse.json({ data: user });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error },
      { status: auth.status }
    );
  }

  const { id } = await params;

  if (id === auth.session.user.id) {
    return NextResponse.json(
      { error: "You cannot delete your own account" },
      { status: 403 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.user.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
