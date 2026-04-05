/**
 * /api/products
 *
 * GET  — List all active products (any authenticated user).
 * POST — Create a new product (admin only).
 *
 * Request body (POST, JSON):
 *   { name, sku?, description?, category?, defaultPrice?, unit? }
 *
 * Responses:
 *   GET  200 — { data: Product[] }
 *   POST 201 — { data: Product }
 *   POST 400 — Validation error
 *   401 — Not authenticated
 *   403 — Not admin (POST only)
 *   409 — SKU already exists
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

const createProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  defaultPrice: z.number().min(0).optional(),
  unit: z.enum(["unit", "hour", "month", "day"]).default("unit"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({
    data: products.map((p) => ({
      ...p,
      defaultPrice: p.defaultPrice ? Number(p.defaultPrice) : null,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createProductSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  if (data.sku) {
    const existing = await prisma.product.findUnique({
      where: { sku: data.sku },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A product with this SKU already exists" },
        { status: 409 }
      );
    }
  }

  const product = await prisma.product.create({
    data: {
      name: data.name,
      sku: data.sku ?? null,
      description: data.description ?? null,
      category: data.category ?? null,
      defaultPrice: data.defaultPrice ?? null,
      unit: data.unit,
    },
  });

  return NextResponse.json(
    {
      data: {
        ...product,
        defaultPrice: product.defaultPrice ? Number(product.defaultPrice) : null,
      },
    },
    { status: 201 }
  );
}
