"use client";

import { readableFontColor, resolveLogoHeight } from "@/lib/utils";

/**
 * Quote preview modal — renders a dummy quote using the current (unsaved) settings.
 *
 * Mimics the public quote page layout (app/q/[token]/public-quote.tsx) but
 * uses passed-in branding values instead of the saved tenant config.
 * Shown in a full-screen modal overlay when admin clicks "Preview" on Settings.
 */

interface PreviewSettings {
  companyName: string;
  companyTagline: string;
  companyPhone: string;
  companyWebsite: string;
  logoUrl: string;
  logoSize: string;
  showCompanyName: boolean;
  primaryColor: string;
  secondaryColor: string;
  fontColor: string;
  navbarColor: string;
  backgroundColor: string;
  tax1Label: string;
  tax2Label: string;
  locale: string;
  currency: string;
  premiumBranding: boolean;
  footerText: string;
}

const DUMMY_ITEMS = [
  { description: "Security Consultation", qty: 1, unitPrice: 500, subtotal: 500 },
  { description: "Site Assessment — Downtown Office", qty: 2, unitPrice: 250, subtotal: 500 },
  { description: "Guard Service (hourly)", qty: 16, unitPrice: 45, subtotal: 720, isHourly: true },
];

const DUMMY_SECTIONS = [
  {
    heading: "Inclusions",
    body: "<ul><li>All labour and materials</li><li>Site preparation and cleanup</li><li>Standard warranty coverage</li></ul>",
  },
];

const DUMMY_PROJECT_ADDRESS = "456 Demo Ave, Vancouver, BC V6B 1A1";
const DUMMY_COMPLETION_DATE = "May 30, 2026";

const DUMMY_SUBTOTAL = DUMMY_ITEMS.reduce((s, i) => s + i.subtotal, 0);
const DUMMY_TAX_RATE = 5;
const DUMMY_TAX2_RATE = 7;
const DUMMY_TAX = DUMMY_SUBTOTAL * (DUMMY_TAX_RATE / 100);
const DUMMY_TAX2 = DUMMY_SUBTOTAL * (DUMMY_TAX2_RATE / 100);
const DUMMY_TOTAL = DUMMY_SUBTOTAL + DUMMY_TAX + DUMMY_TAX2;

export default function QuotePreview({
  settings,
  onClose,
}: {
  settings: PreviewSettings;
  onClose: () => void;
}) {
  const fmt = (n: number) =>
    new Intl.NumberFormat(settings.locale || "en-CA", {
      style: "currency",
      currency: settings.currency || "CAD",
    }).format(n);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center overflow-y-auto p-4">
      <div
        className="rounded-lg shadow-2xl w-full max-w-3xl my-8 relative"
        style={{ backgroundColor: settings.backgroundColor || "#ffffff" }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 text-gray-700 text-lg transition-colors"
        >
          &times;
        </button>

        {/* Preview badge */}
        <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 rounded-t-lg">
          <p className="text-xs font-medium text-yellow-800">
            Preview — This is how your public quote page will look with the current settings
          </p>
        </div>

        <div className="p-6">
          {/* Header with branding */}
          <header
            className="flex items-start justify-between mb-8 -mx-6 -mt-6 px-6 pt-6 pb-4 rounded-t-lg"
            style={{
              backgroundColor: settings.navbarColor || settings.primaryColor || undefined,
              color: settings.fontColor || readableFontColor(settings.navbarColor || settings.primaryColor || "#ffffff"),
            }}
          >
            <div>
              {settings.logoUrl ? (
                <>
                  <img
                    src={settings.logoUrl}
                    alt={settings.companyName}
                    style={{ height: resolveLogoHeight(settings.logoSize) }}
                    className="object-contain mb-1"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                  {settings.showCompanyName && (
                    <p className="font-semibold text-sm mt-0.5">{settings.companyName}</p>
                  )}
                </>
              ) : (
                <h1 className="text-2xl font-bold">
                  {settings.companyName}
                </h1>
              )}
              {settings.premiumBranding && settings.companyTagline && (
                <p className="text-sm text-gray-500">{settings.companyTagline}</p>
              )}
              {settings.premiumBranding &&
                (settings.companyPhone || settings.companyWebsite) && (
                  <p className="text-xs text-gray-400 mt-1">
                    {[settings.companyPhone, settings.companyWebsite]
                      .filter(Boolean)
                      .join(" | ")}
                  </p>
                )}
            </div>
            <div className="text-right opacity-80">
              <p className="text-lg font-bold">Q-2026-0042</p>
              <p className="text-sm">April 5, 2026</p>
              <p className="text-xs">Valid until: May 5, 2026</p>
              <p className="text-xs">Expected completion: {DUMMY_COMPLETION_DATE}</p>
            </div>
          </header>

          {/* Customer + Sales rep info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Prepared for
              </p>
              <p className="font-semibold">Jane Smith</p>
              <p className="text-sm text-gray-600">jane@acmecorp.com</p>
              <p className="text-sm text-gray-600">+1 555-123-4567</p>
              <p className="text-sm text-gray-600 mt-1">{DUMMY_PROJECT_ADDRESS}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
                Prepared by
              </p>
              <p className="font-semibold">Alex Johnson</p>
              <p className="text-sm text-gray-600">Senior Account Manager</p>
            </div>
          </div>

          {/* Line items table */}
          <div className="mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-black">
                  <th className="text-left py-2 font-semibold">Description</th>
                  <th className="text-right py-2 font-semibold w-20">Qty</th>
                  <th className="text-right py-2 font-semibold w-28">Unit Price</th>
                  <th className="text-right py-2 font-semibold w-28">Amount</th>
                </tr>
              </thead>
              <tbody>
                {DUMMY_ITEMS.map((item, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="py-3">{item.description}</td>
                    <td className="py-3 text-right">
                      {item.qty}
                      {item.isHourly && " hrs"}
                    </td>
                    <td className="py-3 text-right">
                      {fmt(item.unitPrice)}
                      {item.isHourly && "/hr"}
                    </td>
                    <td className="py-3 text-right font-medium">
                      {fmt(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{fmt(DUMMY_SUBTOTAL)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {settings.tax1Label} @ {DUMMY_TAX_RATE}%
                </span>
                <span>{fmt(DUMMY_TAX)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {settings.tax2Label} @ {DUMMY_TAX2_RATE}%
                </span>
                <span>{fmt(DUMMY_TAX2)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t-2 border-black pt-2">
                <span>Total</span>
                <span>{fmt(DUMMY_TOTAL)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-8">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">
              Notes
            </p>
            <p className="text-sm text-gray-700">
              This is a sample quote for preview purposes. Payment terms: Net 30.
            </p>
          </div>

          {/* Dummy sections */}
          <div className="mb-8 space-y-6">
            {DUMMY_SECTIONS.map((section, i) => (
              <div key={i}>
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

          {/* Dummy accept form */}
          <div className="rounded-lg border-2 border-gray-200 p-6 opacity-80">
            <h2 className="text-lg font-semibold mb-2">Accept This Quote</h2>
            <p className="text-sm text-muted-foreground mb-4">
              (Customer fills in name and title here)
            </p>
            <button
              type="button"
              className="px-6 py-2 rounded-md text-sm font-semibold"
              style={{
                backgroundColor: settings.secondaryColor || settings.primaryColor || "#000000",
                color: settings.secondaryColor
                  ? readableFontColor(settings.secondaryColor)
                  : (settings.fontColor || readableFontColor(settings.primaryColor || "#000000")),
              }}
            >
              Accept Quote
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t text-xs text-gray-400 text-center">
            {settings.premiumBranding && settings.footerText
              ? settings.footerText
              : [settings.companyName, settings.companyWebsite, settings.companyPhone]
                  .filter(Boolean)
                  .join(" | ")}
          </div>
        </div>
      </div>
    </div>
  );
}
