/**
 * POST /api/quotes/[id]/accept
 *
 * Called from the public quote page when a customer accepts.
 * No auth required (public endpoint — accessed via token-based page).
 *
 * - Validates that the quote is in FINALISED status.
 * - Stores the typed signature (name, title, IP, timestamp).
 * - Updates quote status to ACCEPTED.
 * - Sends notification emails to admin and the sales rep.
 *
 * Body: { signedBy: string, signedByTitle?: string }
 *
 * Responses:
 *   200 — Accepted: { message }
 *   400 — Validation or status error
 *   404 — Quote not found
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendAcceptedEmails } from "@/lib/email";
import { z } from "zod/v4";
import { QUOTE_STATUS, AUDIT_ACTION } from "@/lib/constants";

const acceptSchema = z.object({
  signedBy: z.string().min(1, "Name is required"),
  signedByTitle: z.string().optional(),
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
        user: { select: { name: true, email: true, title: true } },
      },
    });

    if (!quote) {
      return NextResponse.json({ error: "Quote not found" }, { status: 404 });
    }

    if (quote.status === QUOTE_STATUS.ACCEPTED) {
      return NextResponse.json(
        { error: "This quote has already been accepted" },
        { status: 400 }
      );
    }

    const acceptableStatuses = [QUOTE_STATUS.FINALISED, QUOTE_STATUS.CHANGES_REQUESTED];
    if (!acceptableStatuses.includes(quote.status as any)) {
      return NextResponse.json(
        { error: "This quote cannot be accepted in its current state" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const parsed = acceptSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { signedBy, signedByTitle } = parsed.data;
    const ipAddress =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      null;

    await prisma.$transaction(async (tx) => {
      await tx.signature.create({
        data: {
          quoteId: id,
          signedBy,
          signedByTitle: signedByTitle ?? null,
          ipAddress,
          emailVerified: false,
        },
      });

      await tx.quote.update({
        where: { id },
        data: {
          status: QUOTE_STATUS.ACCEPTED,
          acceptedAt: new Date(),
        },
      });

      await tx.auditLog.create({
        data: {
          quoteId: id,
          action: AUDIT_ACTION.QUOTE_ACCEPTED,
          metadata: { signedBy, signedByTitle, ipAddress },
          ipAddress,
        },
      });
    });

    try {
      await sendAcceptedEmails({
        quoteNumber: quote.quoteNumber,
        quoteId: id,
        customerName: quote.customerName,
        signedBy,
        acceptedAt: new Date(),
        salesRepName: quote.user.name,
        salesRepEmail: quote.user.email,
        total: Number(quote.total),
      });
    } catch (emailError) {
      console.error("Failed to send acceptance emails:", emailError);
    }

    return NextResponse.json({ message: "Quote accepted successfully" });
  } catch (error) {
    console.error("Accept error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
