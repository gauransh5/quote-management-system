"use client";

/**
 * Public quote page — customer-facing, branded view.
 *
 * Three states:
 * - FINALISED: show quote + accept form
 * - ACCEPTED: show quote + "already accepted" message
 * - Other: show appropriate message
 *
 * @media print CSS hides the accept form and action buttons
 * so the printed/PDF version is a clean quote document.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import AcceptForm from "@/components/accept-form";
import { getScheduleBreakdown } from "@/lib/schedule-hours";

interface QuoteItem {
  id: string;
  itemType?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  schedule?: { startDate: string; startTime: string; endDate?: string; endTime?: string }[] | null;
}

interface PublicQuoteData {
  id: string;
  quoteNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  pstRate?: number;
  pstAmount?: number;
  total: number;
  notes: string | null;
  validUntil: string | null;
  finalisedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  items: QuoteItem[];
  user: {
    name: string;
    title: string | null;
    photoUrl: string | null;
    email: string;
  };
  signature: {
    signedBy: string;
    signedByTitle: string | null;
    signedAt: string;
  } | null;
}

export default function PublicQuote({ quote }: { quote: PublicQuoteData }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(quote.status === "ACCEPTED");
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [changesComment, setChangesComment] = useState("");
  const [changesSending, setChangesSending] = useState(false);
  const [changesSent, setChangesSent] = useState(false);
  const [changesError, setChangesError] = useState("");

  function handleAccepted() {
    setAccepted(true);
    router.refresh();
  }

  async function handleRequestChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!changesComment.trim()) {
      setChangesError("Please describe the changes you'd like");
      return;
    }

    setChangesError("");
    setChangesSending(true);

    const res = await fetch(`/api/quotes/${quote.id}/request-changes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        comment: changesComment.trim(),
        customerName: quote.customerName,
      }),
    });

    setChangesSending(false);

    if (!res.ok) {
      const data = await res.json();
      setChangesError(data.error || "Failed to send feedback");
      return;
    }

    setChangesSent(true);
  }

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-3xl mx-auto py-8 px-6 print:py-0 print:px-0">
        {/* Header with branding */}
        <header className="flex items-start justify-between mb-8 print:mb-6">
          <div>
            <h1 className="text-2xl font-bold text-black">Boss Security</h1>
            <p className="text-sm text-gray-500">
              Professional Security Services
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Toll Free: +1 888-498-BOSS | bosssecurity.ca
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold">{quote.quoteNumber}</p>
            <p className="text-sm text-gray-500">
              {new Date(quote.finalisedAt ?? quote.createdAt).toLocaleDateString(
                "en-CA",
                { month: "long", day: "numeric", year: "numeric" }
              )}
            </p>
            {quote.validUntil && (
              <p className="text-xs text-gray-400">
                Valid until:{" "}
                {new Date(quote.validUntil).toLocaleDateString("en-CA", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </header>

        {/* Customer + Sales rep info */}
        <div className="grid grid-cols-2 gap-8 mb-8 print:mb-6">
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Prepared for
            </p>
            <p className="font-semibold">{quote.customerName}</p>
            <p className="text-sm text-gray-600">{quote.customerEmail}</p>
            {quote.customerPhone && (
              <p className="text-sm text-gray-600">{quote.customerPhone}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Prepared by
            </p>
            <div className="flex items-center justify-end gap-3">
              <div>
                <p className="font-semibold">{quote.user.name}</p>
                {quote.user.title && (
                  <p className="text-sm text-gray-600">{quote.user.title}</p>
                )}
                <p className="text-sm text-gray-600">{quote.user.email}</p>
              </div>
              {quote.user.photoUrl && (
                <img
                  src={quote.user.photoUrl}
                  alt={quote.user.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              )}
            </div>
          </div>
        </div>

        {/* Line items table */}
        <div className="mb-8 print:mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-black">
                <th className="text-left py-2 font-semibold">Description</th>
                <th className="text-right py-2 font-semibold w-20">Qty</th>
                <th className="text-right py-2 font-semibold w-28">
                  Unit Price
                </th>
                <th className="text-right py-2 font-semibold w-28">Amount</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item) => {
                const isHourly = item.itemType === "hourly" && item.schedule?.length;
                const breakdown = isHourly ? getScheduleBreakdown(item.schedule) : [];
                return (
                  <tr key={item.id} className="border-b border-gray-200 align-top">
                    <td className="py-3">
                      <div>{item.description}</div>
                      {isHourly && breakdown.length > 0 && (
                        <div className="mt-1 text-xs text-gray-600 space-y-1">
                          {breakdown.map((row, i) => {
                            const startDateFmt = row.startDate ? new Date(row.startDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "";
                            const endDate = row.endDate || row.startDate;
                            const endDateFmt = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : startDateFmt;
                            const endTime = row.endTime ?? row.startTime ?? "";
                            const hrs = row.hours % 1 === 0 ? row.hours : row.hours.toFixed(2);
                            const hrsLabel = row.hours === 1 ? "hr" : "hrs";
                            const sameDay = row.startDate && endDate === row.startDate;
                            return (
                              <div key={i}>
                                {sameDay ? (
                                  <>{startDateFmt} — {row.startTime} to {endTime} = {hrs} {hrsLabel}</>
                                ) : (
                                  <>Start: {startDateFmt} {row.startTime} · End: {endDateFmt} {endTime} = {hrs} {hrsLabel}</>
                                )}
                              </div>
                            );
                          })}
                          <div className="font-medium text-gray-700 pt-0.5 border-t border-gray-200 mt-1">
                            Total hours — {item.quantity % 1 === 0 ? item.quantity : Number(item.quantity).toFixed(2)} hrs
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {item.quantity % 1 === 0
                        ? item.quantity
                        : item.quantity.toFixed(2)}
                      {isHourly && " hrs"}
                    </td>
                    <td className="py-3 text-right">
                      ${item.unitPrice.toLocaleString("en-CA", {
                        minimumFractionDigits: 2,
                      })}
                      {isHourly && "/hr"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      ${item.subtotal.toLocaleString("en-CA", {
                        minimumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>
                ${quote.subtotal.toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            {quote.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">GST @ {quote.taxRate}%</span>
                <span>
                  ${quote.taxAmount.toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {(quote.pstRate ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">PST (MB) @ {quote.pstRate}%</span>
                <span>
                  ${(quote.pstAmount ?? 0).toLocaleString("en-CA", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
              <span>Total</span>
              <span>
                ${quote.total.toLocaleString("en-CA", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="mb-8 print:mb-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {quote.notes}
            </p>
          </div>
        )}

        {/* Print button — hidden in print */}
        <div className="print:hidden mb-8">
          <button
            onClick={() => window.print()}
            className="text-sm text-gray-500 underline hover:text-gray-700"
          >
            Download / Print this quote
          </button>
        </div>

        {/* Accept form or status message — hidden in print */}
        <div className="print:hidden">
          {accepted || quote.status === "ACCEPTED" ? (
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 text-center">
              <p className="text-lg font-semibold text-green-800">
                Quote Accepted
              </p>
              {(quote.signature || accepted) && (
                <p className="text-sm text-green-700 mt-1">
                  {quote.signature ? (
                    <>
                      Signed by <strong>{quote.signature.signedBy}</strong>
                      {quote.signature.signedByTitle &&
                        ` (${quote.signature.signedByTitle})`}
                      {" on "}
                      {new Date(quote.signature.signedAt).toLocaleDateString(
                        "en-CA",
                        { month: "long", day: "numeric", year: "numeric" }
                      )}
                    </>
                  ) : (
                    "Thank you for accepting this quote."
                  )}
                </p>
              )}
            </div>
          ) : (quote.status === "FINALISED" || quote.status === "CHANGES_REQUESTED") ? (
            <div className="space-y-4">
              <AcceptForm quoteId={quote.id} onAccepted={handleAccepted} />

              <div className="text-center">
                <p className="text-sm text-gray-400 mb-2">or</p>
                {changesSent ? (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                    <p className="text-sm font-medium text-blue-800">
                      Feedback sent
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      Our team will review your comments and get back to you.
                    </p>
                  </div>
                ) : showChangesForm ? (
                  <form
                    onSubmit={handleRequestChanges}
                    className="rounded-lg border border-gray-200 p-4 text-left space-y-3"
                  >
                    <p className="text-sm font-medium">
                      What would you like to discuss?
                    </p>
                    <textarea
                      value={changesComment}
                      onChange={(e) => setChangesComment(e.target.value)}
                      placeholder="Describe the changes or questions you have about this quote..."
                      className="w-full min-h-[80px] p-3 border rounded-md text-sm resize-y"
                      required
                    />
                    {changesError && (
                      <p className="text-sm text-red-600">{changesError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={changesSending}
                        className="px-4 py-2 rounded-md border border-gray-300 text-sm font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
                      >
                        {changesSending ? "Sending..." : "Send Feedback"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangesForm(false);
                          setChangesComment("");
                          setChangesError("");
                        }}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    onClick={() => setShowChangesForm(true)}
                    className="text-sm text-gray-500 underline hover:text-gray-700"
                  >
                    Request Changes
                  </button>
                )}
              </div>
            </div>
          ) : quote.status === "EXPIRED" ? (
            <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-6 text-center">
              <p className="text-lg font-semibold text-orange-800">
                Quote Expired
              </p>
              <p className="text-sm text-orange-700 mt-1">
                This quote is no longer valid. Please contact us for a new
                quote.
              </p>
            </div>
          ) : null}
        </div>

        {/* Print footer — only visible in print */}
        <div className="hidden print:block mt-12 pt-4 border-t text-xs text-gray-400 text-center">
          Boss Security | bosssecurity.ca | +1 888-498-BOSS
        </div>
      </div>
    </div>
  );
}
