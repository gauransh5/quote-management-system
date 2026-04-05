/**
 * POST /api/quotes/[id]/request-changes
 *
 * Called from the public quote page when a customer wants to discuss
 * the quote further instead of accepting. Stores the comment and
 * sends a notification email to the sales rep and admin.
 *
 * Does NOT change the quote status — the quote stays FINALISED
 * and the customer can still accept later. The comment is stored
 * in an audit log entry for the sales rep to review.
 *
 * Body: { comment: string, customerName?: string }
 *
 * Responses:
 *   200 — { message }
 *   400 — Validation error or wrong status
 *   404 — Quote not found
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";
import { sendChangeRequestEmail } from "@/lib/email";
import { QUOTE_STATUS, AUDIT_ACTION } from "@/lib/constants";

const requestChangesSchema = z.object({
  comment: z.string().min(1, "Please provide details about the changes you'd like"),
  customerName: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status !== QUOTE_STATUS.FINALISED && quote.status !== QUOTE_STATUS.CHANGES_REQUESTED) {
      return NextResponse.json(
        { error: "Changes can only be requested on finalised quotes" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = requestChangesSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { comment, customerName } = parsed.data;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    await prisma.$transaction([
      prisma.quote.update({
        where: { id },
        data: { status: QUOTE_STATUS.CHANGES_REQUESTED },
      }),
      prisma.auditLog.create({
        data: {
          quoteId: id,
          action: AUDIT_ACTION.CHANGES_REQUESTED,
          metadata: {
            comment,
            customerName: customerName ?? quote.customerName,
            ipAddress,
          },
          ipAddress,
        },
      }),
    ]);

    try {
      await sendChangeRequestEmail({
        quoteNumber: quote.quoteNumber,
        quoteId: id,
        customerName: customerName ?? quote.customerName,
        comment,
        salesRepName: quote.user.name,
        salesRepEmail: quote.user.email,
      });
    } catch (emailError) {
      console.error("Failed to send change request email:", emailError);
    }

    return NextResponse.json({
      message: "Your feedback has been sent. The sales team will be in touch.",
    });
  } catch (error) {
    console.error("Request changes error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
