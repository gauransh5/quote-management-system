/**
 * /api/products/[id]
 *
 * PATCH  — Update a product (admin only). Body: { name?, sku?, description?, category?, defaultPrice?, unit?, active?, sortOrder? }
 * DELETE — Soft-delete a product (set active: false). Admin only.
 *
 * Responses:
 *   PATCH  200 — { data: Product }
 *   PATCH  400 — Validation error
 *   PATCH  404 — Product not found
 *   PATCH  409 — SKU already in use
 *   DELETE 200 — { success: true }
 *   DELETE 404 — Product not found
 *   401 — Not authenticated
 *   403 — Not admin
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

const updateProductSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  sku: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  defaultPrice: z.number().min(0).optional().nullable(),
  unit: z.enum(["unit", "hour", "month", "day"]).optional(),
  active: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: "Unauthorized", status: 401 } as const;
  if (session.user.role !== "ADMIN")
    return { error: "Forbidden", status: 403 } as const;
  return { session } as const;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateProductSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.sku !== undefined && data.sku !== null && data.sku !== existing.sku) {
    const skuTaken = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (skuTaken) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 409 }
      );
    }
  }

  const product = await prisma.product.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.sku !== undefined && { sku: data.sku || null }),
      ...(data.description !== undefined && { description: data.description || null }),
      ...(data.category !== undefined && { category: data.category || null }),
      ...(data.defaultPrice !== undefined && { defaultPrice: data.defaultPrice }),
      ...(data.unit !== undefined && { unit: data.unit }),
      ...(data.active !== undefined && { active: data.active }),
      ...(data.sortOrder !== undefined && { sortOrder: data.sortOrder }),
    },
  });

  return NextResponse.json({
    data: {
      ...product,
      defaultPrice: product.defaultPrice ? Number(product.defaultPrice) : null,
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id } = await params;
  const existing = await prisma.product.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  await prisma.product.update({
    where: { id },
    data: { active: false },
  });

  return NextResponse.json({ success: true });
}
