/**
 * POST /api/quotes/[id]/finalise
 *
 * Finalises a draft quote:
 * - Generates a cryptographically random token (32 bytes, URL-safe)
 * - Builds the public link and default message for copy-to-clipboard
 * - Sets status to FINALISED and records finalisedAt timestamp
 *
 * Only DRAFT quotes with at least one item can be finalised.
 *
 * Response: { data: { token, publicUrl, defaultMessage, ...quote } }
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AUDIT_ACTION } from "@/lib/constants";
import { randomBytes } from "crypto";

export async function POST(
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
    include: { items: true },
  });

  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  if (quote.status !== "DRAFT") {
    return NextResponse.json(
      { error: "Only draft quotes can be finalised" },
      { status: 400 }
    );
  }

  if (quote.items.length === 0) {
    return NextResponse.json(
      { error: "Cannot finalise a quote with no items" },
      { status: 400 }
    );
  }

  const token = randomBytes(32).toString("base64url");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const publicUrl = `${baseUrl}/q/${token}`;

  const defaultMessage = [
    `Hi ${quote.customerName},`,
    "",
    `Thank you for your interest in Boss Security. Please find your quote (${quote.quoteNumber}) at the link below:`,
    "",
    publicUrl,
    "",
    `If you have any questions, feel free to reply to this email.`,
    "",
    "Best regards,",
    session.user.name,
    session.user.title ? `${session.user.title}, Boss Security` : "Boss Security",
  ].join("\n");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.quote.update({
      where: { id },
      data: {
        status: "FINALISED",
        token,
        defaultMessage,
        finalisedAt: new Date(),
      },
    });
    await tx.auditLog.create({
      data: {
        quoteId: id,
        userId: session.user.id,
        action: AUDIT_ACTION.QUOTE_FINALISED,
        metadata: { quoteNumber: quote.quoteNumber, publicUrl },
      },
    });
    return result;
  });

  return NextResponse.json({
    data: {
      ...updated,
      publicUrl,
    },
  });
}
