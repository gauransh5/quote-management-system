/**
 * /api/quotes
 *
 * GET  — List all quote requests with their associated quotes.
 * POST — Create a new quote from an existing quote request.
 *
 * POST body: { requestId }
 * Creates a Quote in DRAFT status, copies customer info from the request,
 * assigns the logged-in user as the owner, generates a quote number.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AUDIT_ACTION } from "@/lib/constants";

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  const quoteRequests = await prisma.quoteRequest.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: quoteRequests });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { requestId } = body;

  if (!requestId) {
    return NextResponse.json(
      { error: "requestId is required" },
      { status: 400 }
    );
  }

  const quoteRequest = await prisma.quoteRequest.findUnique({
    where: { id: requestId },
    include: { quote: true },
  });

  if (!quoteRequest) {
    return NextResponse.json(
      { error: "Quote request not found" },
      { status: 404 }
    );
  }

  if (quoteRequest.quote) {
    return NextResponse.json(
      { error: "A quote already exists for this request", quoteId: quoteRequest.quote.id },
      { status: 409 }
    );
  }

  const year = new Date().getFullYear();
  const count = await prisma.quote.count({
    where: {
      quoteNumber: { startsWith: `QT-${year}` },
    },
  });
  const quoteNumber = `QT-${year}-${String(count + 1).padStart(3, "0")}`;

  const quote = await prisma.$transaction(async (tx) => {
    const created = await tx.quote.create({
      data: {
        quoteNumber,
        userId: session.user.id,
        requestId: quoteRequest.id,
        status: "DRAFT",
        customerName: quoteRequest.name,
        customerEmail: quoteRequest.email,
        customerPhone: quoteRequest.phone,
      },
    });
    await tx.auditLog.create({
      data: {
        quoteId: created.id,
        userId: session.user.id,
        action: AUDIT_ACTION.QUOTE_CREATED,
        metadata: { quoteNumber: created.quoteNumber, requestId: quoteRequest.id },
      },
    });
    return created;
  });

  return NextResponse.json({ data: quote }, { status: 201 });
}
