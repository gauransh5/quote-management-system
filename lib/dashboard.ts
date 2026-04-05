/**
 * Dashboard aggregation helpers.
 *
 * All monetary and count logic for the dashboard is server-side so the
 * portal always shows a single source of truth (see server-side-calculations rule).
 */

import { prisma } from "@/lib/db";
import { QUOTE_STATUS } from "@/lib/constants";

/** Start and end of the current month in local time (inclusive). */
function currentMonthRange(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export interface DashboardMonthStats {
  /** Sum of quote totals for quotes finalised this month (FINALISED, CHANGES_REQUESTED, ACCEPTED). */
  estimateTotal: number;
  /** Sum of quote totals for quotes accepted this month. */
  acceptedTotal: number;
  /** Number of quotes finalised this month. */
  quotesFinalisedCount: number;
  /** Number of quotes accepted this month. */
  quotesAcceptedCount: number;
}

/**
 * Returns current-month dashboard stats for the portal.
 * Used by the dashboard page; all calculations are done in the DB.
 */
export async function getDashboardMonthStats(): Promise<DashboardMonthStats> {
  const { start, end } = currentMonthRange();

  const [estimateAgg, acceptedAgg, finalisedCount, acceptedCount] =
    await Promise.all([
      prisma.quote.aggregate({
        _sum: { total: true },
        where: {
          finalisedAt: { gte: start, lte: end },
        },
      }),
      prisma.quote.aggregate({
        _sum: { total: true },
        where: {
          status: QUOTE_STATUS.ACCEPTED,
          acceptedAt: { gte: start, lte: end },
        },
      }),
      prisma.quote.count({
        where: {
          finalisedAt: { gte: start, lte: end },
        },
      }),
      prisma.quote.count({
        where: {
          status: QUOTE_STATUS.ACCEPTED,
          acceptedAt: { gte: start, lte: end },
        },
      }),
    ]);

  return {
    estimateTotal: Number(estimateAgg._sum.total ?? 0),
    acceptedTotal: Number(acceptedAgg._sum.total ?? 0),
    quotesFinalisedCount: finalisedCount,
    quotesAcceptedCount: acceptedCount,
  };
}

export interface RecentQuoteActivity {
  id: string;
  quoteNumber: string;
  customerName: string;
  /** Name of the sales team member who owns the quote. */
  salesRepName: string;
  status: string;
  total: number;
  updatedAt: string;
}

/**
 * Returns the most recently updated quotes for the dashboard activity feed.
 * Includes the sales rep (user) assigned to each quote.
 */
export async function getRecentQuoteActivity(
  limit = 10
): Promise<RecentQuoteActivity[]> {
  const quotes = await prisma.quote.findMany({
    take: limit,
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      quoteNumber: true,
      customerName: true,
      status: true,
      total: true,
      updatedAt: true,
      user: { select: { name: true } },
    },
  });

  return quotes.map((q) => ({
    id: q.id,
    quoteNumber: q.quoteNumber,
    customerName: q.customerName,
    salesRepName: q.user.name,
    status: q.status,
    total: Number(q.total),
    updatedAt: q.updatedAt.toISOString(),
  }));
}
