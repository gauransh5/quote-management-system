/**
 * /api/templates/[id]
 *
 * GET    — Get single template with items (any authenticated user).
 * PATCH  — Update template name and/or items (admin only). Replaces all items.
 * DELETE — Delete template and its items (admin only).
 *
 * Responses:
 *   GET 200    — { data: QuoteTemplate }
 *   PATCH 200  — { data: QuoteTemplate }
 *   DELETE 200 — { success: true }
 *   400        — Validation error
 *   401        — Not authenticated
 *   403        — Not admin (PATCH/DELETE only)
 *   404        — Template not found
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

const templateItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0).default(0),
  itemType: z.enum(["standard", "hourly"]).default("standard"),
  sortOrder: z.number().int().default(0),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).optional(),
  items: z.array(templateItemSchema).min(1).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const template = await prisma.quoteTemplate.findUnique({
    where: { id },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: template });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.quoteTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, items } = parsed.data;

  // If items provided, replace all existing items atomically
  const template = await prisma.$transaction(async (tx) => {
    if (items) {
      await tx.quoteTemplateItem.deleteMany({ where: { templateId: id } });
    }
    return tx.quoteTemplate.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(items
          ? {
              items: {
                create: items.map((item, idx) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  itemType: item.itemType,
                  sortOrder: item.sortOrder ?? idx,
                })),
              },
            }
          : {}),
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });
  });

  return NextResponse.json({ data: template });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.quoteTemplate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Items cascade-deleted via schema onDelete: Cascade
  await prisma.quoteTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
