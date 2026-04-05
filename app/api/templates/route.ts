/**
 * /api/templates
 *
 * GET  — List all templates with their items (any authenticated user).
 * POST — Create a new template (admin only).
 *
 * Request body (POST, JSON):
 *   { name: string, items: { description, quantity, unitPrice, itemType, sortOrder }[] }
 *
 * Responses:
 *   GET 200  — { data: QuoteTemplate[] }
 *   POST 201 — { data: QuoteTemplate }
 *   400      — Validation error
 *   401      — Not authenticated
 *   403      — Not admin (POST only)
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

const createTemplateSchema = z.object({
  name: z.string().min(1),
  items: z.array(templateItemSchema).min(1),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const templates = await prisma.quoteTemplate.findMany({
    include: { items: { orderBy: { sortOrder: "asc" } } },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: templates });
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
  const parsed = createTemplateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { name, items } = parsed.data;

  const template = await prisma.quoteTemplate.create({
    data: {
      name,
      items: {
        create: items.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemType: item.itemType,
          sortOrder: item.sortOrder ?? idx,
        })),
      },
    },
    include: { items: { orderBy: { sortOrder: "asc" } } },
  });

  return NextResponse.json({ data: template }, { status: 201 });
}
