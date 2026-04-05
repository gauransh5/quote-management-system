import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import {
  getDashboardMonthStats,
  getRecentQuoteActivity,
} from "@/lib/dashboard";
import { QUOTE_STATUS_LABEL } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

/**
 * Dashboard page — Phase 4.
 *
 * Shows current-month Estimate total (sum of finalised quote totals) and
 * Accepted total (sum of accepted quote totals), plus quick stats and
 * recent quote activity. All totals are computed server-side.
 */
export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const [stats, recentActivity] = await Promise.all([
    getDashboardMonthStats(),
    getRecentQuoteActivity(10),
  ]);

  const conversionRate =
    stats.quotesFinalisedCount > 0
      ? Math.round(
          (stats.quotesAcceptedCount / stats.quotesFinalisedCount) * 100
        )
      : 0;

  const monthName = new Date().toLocaleString("en-CA", { month: "long" });
  const year = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session?.user?.name}.
        </p>
      </div>

      {/* Current month totals — primary KPIs */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Estimate total — {monthName} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${stats.estimateTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of all quotes finalised this month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Accepted total — {monthName} {year}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              ${stats.acceptedTotal.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Sum of quotes accepted this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes finalised this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.quotesFinalisedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes accepted this month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{stats.quotesAcceptedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted ÷ finalised
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Recent activity</CardTitle>
          <Button asChild variant="outline" size="sm">
            <Link href="/quotes">View all quotes</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No quotes yet. Create a quote from a lead to get started.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Quote</th>
                    <th className="pb-2 pr-4 font-medium">Customer</th>
                    <th className="pb-2 pr-4 font-medium">Sales rep</th>
                    <th className="pb-2 pr-4 font-medium text-right">Total</th>
                    <th className="pb-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((q) => (
                    <tr key={q.id} className="border-b border-border last:border-0">
                      <td className="py-3 pr-4">
                        <Link
                          href={`/quotes/${q.id}`}
                          className="font-medium hover:underline"
                        >
                          {q.quoteNumber}
                        </Link>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground truncate max-w-[120px]">
                        {q.customerName}
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {q.salesRepName}
                      </td>
                      <td className="py-3 pr-4 text-right font-medium">
                        ${q.total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3">
                        {QUOTE_STATUS_LABEL[q.status as keyof typeof QUOTE_STATUS_LABEL] ?? q.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
