import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PublicQuote from "./public-quote";

/**
 * Public quote page — accessible via unique link, no login required.
 *
 * Server component that fetches the quote by token, then renders
 * the branded quote view with accept form.
 */
export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const quote = await prisma.quote.findUnique({
    where: { token },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      user: {
        select: { name: true, title: true, photoUrl: true, email: true },
      },
      signature: true,
    },
  });

  if (!quote) notFound();

  const serialized = {
    id: quote.id,
    quoteNumber: quote.quoteNumber,
    status: quote.status,
    customerName: quote.customerName,
    customerEmail: quote.customerEmail,
    customerPhone: quote.customerPhone,
    subtotal: Number(quote.subtotal),
    taxRate: Number(quote.taxRate),
    taxAmount: Number(quote.taxAmount),
    pstRate: Number(quote.pstRate ?? 0),
    pstAmount: Number(quote.pstAmount ?? 0),
    total: Number(quote.total),
    notes: quote.notes,
    validUntil: quote.validUntil?.toISOString() ?? null,
    finalisedAt: quote.finalisedAt?.toISOString() ?? null,
    acceptedAt: quote.acceptedAt?.toISOString() ?? null,
    createdAt: quote.createdAt.toISOString(),
    items: quote.items.map((item) => ({
      id: item.id,
      itemType: item.itemType ?? "standard",
      description: item.description,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      schedule: item.schedule as { startDate: string; startTime: string; endDate?: string; endTime?: string }[] | null,
    })),
    user: quote.user,
    signature: quote.signature
      ? {
          signedBy: quote.signature.signedBy,
          signedByTitle: quote.signature.signedByTitle,
          signedAt: quote.signature.signedAt.toISOString(),
        }
      : null,
  };

  return <PublicQuote quote={serialized} />;
}
