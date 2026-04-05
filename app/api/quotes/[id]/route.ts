/**
 * /api/quotes/[id]
 *
 * GET — Get full quote details (with items, request, user).
 * PUT — Update quote: items, notes, customer info. Recalculates totals.
 *
 * PUT body:
 *   {
 *     items: [{ description, quantity, unitPrice, sortOrder?, itemType?, schedule? }],
 *     notes?: string,
 *     customerName?: string,
 *     customerEmail?: string,
 *     customerPhone?: string,
 *     taxRate?: number,   // GST %
 *     pstRate?: number   // PST %
 *   }
 * For itemType "hourly", schedule is [{ startDate, startTime, endDate?, endTime? }];
 * server computes quantity (total hours) from schedule. Only DRAFT quotes can be edited.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { totalHoursFromSchedule } from "@/lib/schedule-hours";
import { z } from "zod/v4";

const scheduleRowSchema = z.object({
  startDate: z.string(),
  startTime: z.string(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
});

const updateQuoteSchema = z.object({
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().min(0),
      unitPrice: z.number().min(0),
      sortOrder: z.number().int().optional(),
      itemType: z.enum(["standard", "hourly"]).optional(),
      schedule: z.array(scheduleRowSchema).optional(),
    })
  ),
  notes: z.string().optional(),
  customerName: z.string().min(1).optional(),
  customerEmail: z.email().optional(),
  customerPhone: z.string().optional(),
  taxRate: z.number().min(0).max(100).optional(),
  pstRate: z.number().min(0).max(100).optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      request: true,
      user: {
        select: { id: true, name: true, title: true, photoUrl: true },
      },
      signature: true,
    },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  return NextResponse.json({ data: quote });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be edited" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const parsed = updateQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;
  const taxRate = data.taxRate ?? Number(quote.taxRate);
  const pstRate = data.pstRate ?? Number(quote.pstRate ?? 0);

  // Resolve quantity and subtotal per item (server-side). Hourly: quantity = total hours from schedule.
  const resolvedItems = data.items.map((item) => {
    const isHourly = item.itemType === "hourly" && item.schedule && item.schedule.length > 0;
    const quantity = isHourly ? totalHoursFromSchedule(item.schedule) : item.quantity;
    const subtotal = quantity * item.unitPrice;
    return {
      ...item,
      quantity,
      subtotal,
    };
  });

  const subtotal = resolvedItems.reduce((sum, item) => sum + item.subtotal, 0);
  const taxAmount = subtotal * (taxRate / 100);
  const pstAmount = subtotal * (pstRate / 100);
  const total = subtotal + taxAmount + pstAmount;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.quoteItem.deleteMany({ where: { quoteId: id } });

    if (data.items.length > 0) {
      await tx.quoteItem.createMany({
        data: resolvedItems.map((item, index) => ({
          quoteId: id,
          itemType: item.itemType ?? "standard",
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          subtotal: item.subtotal,
          schedule: item.itemType === "hourly" && item.schedule ? item.schedule : null,
          sortOrder: item.sortOrder ?? index,
        })),
      });
    }

    return tx.quote.update({
      where: { id },
      data: {
        subtotal,
        taxRate,
        taxAmount,
        pstRate,
        pstAmount,
        total,
        notes: data.notes ?? quote.notes,
        customerName: data.customerName ?? quote.customerName,
        customerEmail: data.customerEmail ?? quote.customerEmail,
        customerPhone: data.customerPhone ?? quote.customerPhone,
      },
      include: {
        items: { orderBy: { sortOrder: "asc" } },
      },
    });
  });

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/quotes/[id]
 *
 * Deletes a draft quote and its items, freeing the QuoteRequest so it
 * shows as "NEW REQUEST" again in the list. Only DRAFT quotes can be deleted.
 * Finalised or accepted quotes cannot be deleted.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const quote = await prisma.quote.findUnique({ where: { id } });
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be deleted" },
      { status: 400 }
    );
  }

  await prisma.quote.delete({ where: { id } });

  return NextResponse.json({ message: "Quote deleted" });
}
