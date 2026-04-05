"use client";

/**
 * Tabbed view for the quotes page.
 *
 * Three tabs (All is default):
 *   - All: every request (leads + quotes). Search and status filter apply.
 *   - Leads: unactioned requests (no quote yet). "Create Lead" button lives here.
 *   - Quotes: requests with a quote. Status sub-filters (All, Draft, Finalised, etc.).
 *
 * Search bar is shared. Sales rep column shows who owns each quote.
 */
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import CreateLeadForm from "@/components/create-lead-form";
import { QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL } from "@/lib/constants";

interface QuoteRequest {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  service: string | null;
  cities: string[];
  message: string | null;
  leadSource: string;
  createdAt: string;
  quote: {
    id: string;
    quoteNumber: string;
    status: string;
    total: string | number;
    token: string | null;
    createdAt: string;
    salesRepName: string;
  } | null;
}

type Tab = "all" | "leads" | "quotes";

const STATUS_FILTERS = ["All", "DRAFT", "FINALISED", "CHANGES_REQUESTED", "ACCEPTED", "REJECTED"] as const;

const statusColors = QUOTE_STATUS_COLOR;

export default function QuoteRequestList({
  requests,
}: {
  requests: QuoteRequest[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [creating, setCreating] = useState<string | null>(null);
  const [showCreateLead, setShowCreateLead] = useState(false);

  function matchesSearch(r: QuoteRequest) {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.service?.toLowerCase().includes(q) ||
      r.quote?.quoteNumber?.toLowerCase().includes(q)
    );
  }

  const leads = requests.filter((r) => !r.quote && matchesSearch(r));
  const quotes = requests.filter((r) => {
    if (!r.quote) return false;
    if (!matchesSearch(r)) return false;
    if (statusFilter !== "All" && r.quote.status !== statusFilter) return false;
    return true;
  });

  const allFiltered = requests.filter((r) => {
    if (!matchesSearch(r)) return false;
    if (statusFilter !== "All") {
      if (!r.quote) return false;
      return r.quote.status === statusFilter;
    }
    return true;
  });
  const allQuotesCount = requests.filter((r) => r.quote && matchesSearch(r)).length;

  async function handleCreateQuote(requestId: string) {
    setCreating(requestId);
    const res = await fetch("/api/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId }),
    });

    if (res.ok) {
      const { data } = await res.json();
      router.push(`/quotes/${data.id}`);
    } else if (res.status === 409) {
      const { quoteId } = await res.json();
      router.push(`/quotes/${quoteId}`);
    }
    setCreating(null);
  }

  const activeList =
    tab === "all" ? allFiltered : tab === "leads" ? leads : quotes;
  const emptyMessage =
    tab === "all"
      ? search || statusFilter !== "All"
        ? "No requests match your filters."
        : "No leads or quotes yet."
      : tab === "leads"
        ? search
          ? "No leads match your search."
          : "No new leads. They appear here from the webhook or when created manually."
        : search || statusFilter !== "All"
          ? "No quotes match your filters."
          : "No quotes created yet. Create one from the Leads tab.";

  return (
    <div className="mt-6 space-y-4">
      {/* Search bar */}
      <Input
        placeholder="Search by name, email, service, or quote number..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {/* Tabs — All is default */}
      <div className="flex items-center justify-between border-b">
        <div className="flex">
          <button
            onClick={() => setTab("all")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "all"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            All ({allFiltered.length})
          </button>
          <button
            onClick={() => setTab("leads")}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "leads"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Leads ({leads.length})
          </button>
          <button
            onClick={() => { setTab("quotes"); setStatusFilter("All"); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === "quotes"
                ? "border-black text-black"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            Quotes ({allQuotesCount})
          </button>
        </div>
      </div>

      {/* Tab-specific toolbar */}
      {(tab === "all" || tab === "quotes") && (
        <div className="flex gap-2">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "text-xs px-3 py-1 rounded-full border transition-colors",
                statusFilter === s
                  ? "bg-black text-white border-black"
                  : "bg-white text-gray-600 border-gray-300 hover:border-gray-400"
              )}
            >
              {s === "All" ? "All" : (QUOTE_STATUS_LABEL[s as keyof typeof QUOTE_STATUS_LABEL] ?? s)}
            </button>
          ))}
        </div>
      )}
      {tab === "leads" && (
        <div>
          {showCreateLead ? (
            <CreateLeadForm onClose={() => setShowCreateLead(false)} />
          ) : (
            <Button variant="outline" size="sm" onClick={() => setShowCreateLead(true)}>
              + Create Lead
            </Button>
          )}
        </div>
      )}

      {/* List */}
      {activeList.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3">
          {activeList.map((r) => {
            const cardContent = (
              <Card
                className={cn(
                  r.quote && "cursor-pointer transition-colors hover:bg-muted/50"
                )}
              >
                <CardContent className="py-4 px-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold truncate">{r.name}</h3>
                        {r.quote ? (
                          <span
                            className={cn(
                              "text-xs px-2 py-0.5 rounded-full font-medium",
                              statusColors[r.quote.status as keyof typeof statusColors] ?? "bg-gray-100"
                            )}
                          >
                            {QUOTE_STATUS_LABEL[r.quote.status as keyof typeof QUOTE_STATUS_LABEL] ?? r.quote.status}
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-800">
                            New Lead
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {r.email}
                        {r.phone && ` · ${r.phone}`}
                      </p>
                      <div className="flex items-center gap-3 mt-1 text-sm">
                        {r.service && (
                          <p>
                            <span className="text-muted-foreground">Service:</span>{" "}
                            {r.service}
                          </p>
                        )}
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                          {r.leadSource}
                        </span>
                      </div>
                      {r.cities.length > 0 && (
                        <p className="text-sm">
                          <span className="text-muted-foreground">Cities:</span>{" "}
                          {r.cities.join(", ")}
                        </p>
                      )}
                      {r.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {r.message}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-2 flex flex-col items-end">
                      {r.quote ? (
                        <>
                          <span className="text-sm font-medium text-blue-600">
                            {r.quote.quoteNumber}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            Sales rep: {r.quote.salesRepName}
                          </p>
                          {Number(r.quote.total) > 0 && (
                            <p className="text-sm font-semibold">
                              $
                              {Number(r.quote.total).toLocaleString("en-CA", {
                                minimumFractionDigits: 2,
                              })}
                            </p>
                          )}
                          {r.quote.token && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                window.open(`/q/${r.quote!.token}`, "_blank", "noopener,noreferrer");
                              }}
                              className="text-xs text-gray-500 hover:text-gray-700 underline cursor-pointer bg-transparent border-none p-0 font-inherit"
                            >
                              Preview
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <span className="text-xs text-muted-foreground">
                            Sales rep: —
                          </span>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleCreateQuote(r.id);
                            }}
                            disabled={creating === r.id}
                          >
                            {creating === r.id ? "Creating..." : "Create Quote"}
                          </Button>
                        </>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {new Date(r.createdAt).toLocaleDateString("en-CA", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
            return r.quote ? (
              <Link key={r.id} href={`/quotes/${r.quote.id}`} className="block">
                {cardContent}
              </Link>
            ) : (
              <div key={r.id}>{cardContent}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}
