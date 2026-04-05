import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import QuoteDetail from "./quote-detail";

/**
 * Quote detail page — view and edit a quote.
 *
 * Server component that fetches the full quote (with items, request, user),
 * passes it to the QuoteDetail client component for editing and actions.
 */
export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

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
      auditLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { name: true } } },
      },
    },
  });

  if (!quote) notFound();

  const activity = quote.auditLogs.map((log) => ({
    id: log.id,
    action: log.action,
    createdAt: log.createdAt.toISOString(),
    userName: log.user?.name ?? null,
    metadata: (log.metadata as Record<string, unknown>) ?? {},
  }));

  const changeRequests = activity
    .filter((a) => a.action === "changes_requested")
    .map((a) => ({
      id: a.id,
      comment: (a.metadata.comment as string) ?? "",
      customerName: (a.metadata.customerName as string) ?? quote.customerName,
      createdAt: a.createdAt,
    }));

  const serialized = {
    ...quote,
    subtotal: Number(quote.subtotal),
    taxRate: Number(quote.taxRate),
    taxAmount: Number(quote.taxAmount),
    pstRate: Number(quote.pstRate ?? 0),
    pstAmount: Number(quote.pstAmount ?? 0),
    total: Number(quote.total),
    items: quote.items.map((item) => ({
      ...item,
      itemType: item.itemType ?? "standard",
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
      schedule: item.schedule as { startDate: string; startTime: string; endDate?: string; endTime?: string }[] | null,
    })),
    activity,
    changeRequests,
  };

  return <QuoteDetail quote={serialized} currentUserId={session.user.id} />;
}
