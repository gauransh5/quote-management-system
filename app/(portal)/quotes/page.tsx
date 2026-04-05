import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import QuoteRequestList from "./quote-request-list";

/**
 * Quotes page — displays all quote requests from the WordPress webhook.
 *
 * Server component that fetches data, passes it to a client component for
 * interactivity (search, filtering). This pattern is like a Spring MVC
 * controller that fetches data and passes it to a Thymeleaf template.
 */
export default async function QuotesPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const quoteRequests = await prisma.quoteRequest.findMany({
    include: {
      quote: {
        select: {
          id: true,
          quoteNumber: true,
          status: true,
          total: true,
          token: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = quoteRequests.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    quote: r.quote
      ? {
          id: r.quote.id,
          quoteNumber: r.quote.quoteNumber,
          status: r.quote.status,
          total: Number(r.quote.total),
          token: r.quote.token,
          createdAt: r.quote.createdAt.toISOString(),
          salesRepName: r.quote.user.name,
        }
      : null,
  }));

  return (
    <div>
      <h1 className="text-2xl font-bold">Quotes</h1>
      <p className="text-muted-foreground mt-1">
        Manage quote requests and quotes
      </p>
      <QuoteRequestList requests={serialized} />
    </div>
  );
}
