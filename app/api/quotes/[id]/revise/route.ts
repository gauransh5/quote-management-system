/**
 * POST /api/quotes/[id]/revise
 *
 * Reverts a FINALISED quote back to DRAFT so it can be edited again.
 * Clears the token (invalidates the old public link) and default message.
 * A new token will be generated when the quote is finalised again.
 *
 * Only FINALISED quotes can be revised. ACCEPTED quotes are locked.
 *
 * Responses:
 *   200 — { data: Quote }
 *   400 — Quote is not in FINALISED status
 *   401 — Not authenticated
 *   404 — Quote not found
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { QUOTE_STATUS, AUDIT_ACTION } from "@/lib/constants";

export async function POST(
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

  const revisableStatuses = [QUOTE_STATUS.FINALISED, QUOTE_STATUS.CHANGES_REQUESTED];
  if (!revisableStatuses.includes(quote.status as any)) {
    return NextResponse.json(
      { error: "Only finalised or changes-requested quotes can be revised. Accepted quotes cannot be changed." },
      { status: 400 }
    );
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      status: QUOTE_STATUS.DRAFT,
      token: null,
      defaultMessage: null,
      finalisedAt: null,
    },
  });

  await prisma.auditLog.create({
    data: {
      quoteId: id,
      userId: session.user.id,
      action: AUDIT_ACTION.QUOTE_REVISED,
      metadata: { previousStatus: quote.status },
    },
  });

  return NextResponse.json({ data: updated });
}
