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
import { readableFontColor, resolveLogoHeight } from "@/lib/utils";
import type { TenantConfig } from "@/config/tenant";

interface QuoteItem {
  id: string;
  itemType?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  schedule?: { startDate: string; startTime: string; endDate?: string; endTime?: string }[] | null;
}

interface QuoteSection {
  id: string;
  heading: string;
  body: string;
  sortOrder: number;
}

interface PublicQuoteData {
  id: string;
  quoteNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  projectAddress: string | null;
  expectedCompletionDate: string | null;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  pstRate?: number;
  pstAmount?: number;
  total: number;
  notes: string | null;
  sections: QuoteSection[];
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

export default function PublicQuote({ quote, tenant }: { quote: PublicQuoteData; tenant: TenantConfig }) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(quote.status === "ACCEPTED");

  const fmt = (n: number) =>
    new Intl.NumberFormat(tenant.locale, {
      style: "currency",
      currency: tenant.currency,
    }).format(n);

  // Compute theme values — premium tenants get full palette, non-premium get primaryColor only
  // navbarColor overrides the header background independently from primaryColor (premium only)
  const headerBg = (tenant.premiumBranding && tenant.navbarColor) ? tenant.navbarColor : tenant.primaryColor;
  const headerFg = tenant.premiumBranding && tenant.fontColor
    ? tenant.fontColor
    : readableFontColor(headerBg);
  const accentBg = tenant.premiumBranding && tenant.secondaryColor
    ? tenant.secondaryColor
    : tenant.primaryColor;
  const accentFg = readableFontColor(accentBg);
  const pageBg = tenant.premiumBranding && tenant.backgroundColor
    ? tenant.backgroundColor
    : undefined;

  const acceptButtonStyle: React.CSSProperties = {
    backgroundColor: accentBg,
    color: accentFg,
  };
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
    <div
      className="min-h-screen print:bg-white"
      style={pageBg ? { backgroundColor: pageBg } : { backgroundColor: "#f9fafb" }}
    >
      <div className="max-w-3xl mx-auto print:py-0 print:px-0">
        {/* Header with brand colors — full-width color bar */}
        <header
          className="px-6 py-6 mb-8 print:mb-6"
          style={{ backgroundColor: headerBg, color: headerFg }}
        >
          <div className="flex items-start justify-between">
            <div>
              {tenant.companyLogoUrl ? (
                <>
                  <img
                    src={tenant.companyLogoUrl}
                    alt={tenant.companyName}
                    style={{ height: resolveLogoHeight(tenant.logoSize) }}
                    className="object-contain mb-1"
                  />
                  {tenant.showCompanyName && (
                    <p className="font-semibold text-sm mt-0.5">{tenant.companyName}</p>
                  )}
                </>
              ) : (
                <h1 className="text-2xl font-bold">{tenant.companyName}</h1>
              )}
              {tenant.premiumBranding && tenant.companyTagline && (
                <p className="text-sm mt-0.5" style={{ color: headerFg, opacity: 0.8 }}>{tenant.companyTagline}</p>
              )}
              {tenant.premiumBranding && (tenant.companyPhone || tenant.companyWebsite) && (
                <p className="text-xs mt-1" style={{ color: headerFg, opacity: 0.65 }}>
                  {[tenant.companyPhone, tenant.companyWebsite].filter(Boolean).join(" | ")}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold">{quote.quoteNumber}</p>
              <p className="text-sm" style={{ color: headerFg, opacity: 0.8 }}>
                {new Date(quote.finalisedAt ?? quote.createdAt).toLocaleDateString(
                  tenant.locale,
                  { month: "long", day: "numeric", year: "numeric" }
                )}
              </p>
              {quote.validUntil && (
                <p className="text-xs" style={{ color: headerFg, opacity: 0.65 }}>
                  Valid until:{" "}
                  {new Date(quote.validUntil).toLocaleDateString(tenant.locale, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
              {quote.expectedCompletionDate && (
                <p className="text-xs" style={{ color: headerFg, opacity: 0.65 }}>
                  Expected completion:{" "}
                  {new Date(quote.expectedCompletionDate).toLocaleDateString(tenant.locale, {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        </header>

        <div className="px-6 pb-8 print:px-0" style={pageBg ? { backgroundColor: pageBg } : undefined}>

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
            {quote.projectAddress && (
              <p className="text-sm text-gray-600 mt-1">{quote.projectAddress}</p>
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
                            const startDateFmt = row.startDate ? new Date(row.startDate + "T00:00:00").toLocaleDateString(tenant.locale, { month: "long", day: "numeric", year: "numeric" }) : "";
                            const endDate = row.endDate || row.startDate;
                            const endDateFmt = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString(tenant.locale, { month: "long", day: "numeric", year: "numeric" }) : startDateFmt;
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
                      {fmt(item.unitPrice)}
                      {isHourly && "/hr"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {fmt(item.subtotal)}
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
              <span>{fmt(quote.subtotal)}</span>
            </div>
            {quote.taxRate > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{tenant.tax1Label} @ {quote.taxRate}%</span>
                <span>{fmt(quote.taxAmount)}</span>
              </div>
            )}
            {(quote.pstRate ?? 0) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{tenant.tax2Label} @ {quote.pstRate}%</span>
                <span>{fmt(quote.pstAmount ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
              <span>Total</span>
              <span>{fmt(quote.total)}</span>
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

        {/* Rich-text sections */}
        {quote.sections?.length > 0 && (
          <div className="mb-8 print:mb-6 space-y-6">
            {quote.sections.map((section) => (
              <div key={section.id}>
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                  {section.heading}
                </p>
                <div
                  className="text-sm text-gray-700 prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: section.body }}
                />
              </div>
            ))}
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
                        tenant.locale,
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
              <AcceptForm quoteId={quote.id} onAccepted={handleAccepted} buttonStyle={acceptButtonStyle} />

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
          {[tenant.companyName, tenant.companyWebsite, tenant.companyPhone].filter(Boolean).join(" | ")}
        </div>
        </div>{/* end px-6 pb-8 */}
      </div>
    </div>
  );
}
