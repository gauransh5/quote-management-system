"use client";

/**
 * Quote detail client component.
 *
 * Three states:
 * - DRAFT: editable — add/remove items, sections, change notes, save, finalise
 * - FINALISED: locked — shows link, default message, copy button
 * - ACCEPTED: locked — shows signature info
 */
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { QUOTE_STATUS, QUOTE_STATUS_COLOR, QUOTE_STATUS_LABEL, AUDIT_ACTION_LABEL } from "@/lib/constants";
import { totalHoursFromSchedule, getScheduleBreakdown } from "@/lib/schedule-hours";

const LEAD_SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  social_media: "Social Media",
  referral: "Referral",
  phone: "Phone / Walk-in",
  other: "Other",
};

/** One row in an hourly schedule: start/end date and time (end can be next day). */
export type ScheduleRow = {
  startDate: string;
  startTime: string;
  endDate?: string;
  endTime?: string;
};

interface QuoteItem {
  id?: string;
  itemType?: "standard" | "hourly";
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  sortOrder: number;
  schedule?: ScheduleRow[] | null;
}

interface QuoteSection {
  id?: string;
  heading: string;
  body: string;
  sortOrder: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  status: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string | null;
  projectAddress: string | null;
  expectedCompletionDate: string | null;
  leadSource: string;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  pstRate?: number;
  pstAmount?: number;
  total: number;
  notes: string | null;
  token: string | null;
  defaultMessage: string | null;
  finalisedAt: string | null;
  acceptedAt: string | null;
  createdAt: string;
  items: QuoteItem[];
  sections: QuoteSection[];
  request: {
    service: string | null;
    cities: string[];
    message: string | null;
  };
  user: {
    id: string;
    name: string;
    title: string | null;
  };
  signature: {
    signedBy: string;
    signedByTitle: string | null;
    signedAt: string;
  } | null;
  changeRequests: {
    id: string;
    comment: string;
    customerName: string;
    createdAt: string;
  }[];
  activity: {
    id: string;
    action: string;
    createdAt: string;
    userName: string | null;
    metadata: Record<string, unknown>;
  }[];
}

const statusColors = QUOTE_STATUS_COLOR;

interface CatalogProduct {
  id: string;
  name: string;
  defaultPrice: number | null;
  unit: string;
  description: string | null;
}

interface CatalogTemplate {
  id: string;
  name: string;
  items: {
    description: string;
    quantity: number;
    unitPrice: number;
    itemType: "standard" | "hourly";
    sortOrder: number;
  }[];
}

/**
 * Tiptap-based rich-text editor for a single quote section.
 * Extracted as its own component so each section gets its own editor instance.
 */
function SectionEditor({
  section,
  disabled,
  onHeadingChange,
  onBodyChange,
  onRemove,
}: {
  section: QuoteSection;
  disabled: boolean;
  onHeadingChange: (v: string) => void;
  onBodyChange: (v: string) => void;
  onRemove: () => void;
}) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: section.body || "",
    editable: !disabled,
    immediatelyRender: false,
    onUpdate({ editor }) {
      onBodyChange(editor.getHTML());
    },
  });

  return (
    <div className="space-y-2 border rounded-md p-4">
      <div className="flex items-center gap-2">
        <Input
          value={section.heading}
          onChange={(e) => onHeadingChange(e.target.value)}
          placeholder="Section heading (e.g. Inclusions, Terms & Conditions)"
          className="font-medium"
          disabled={disabled}
        />
        {!disabled && (
          <Button type="button" variant="ghost" size="sm" onClick={onRemove} className="text-red-500 hover:text-red-700 shrink-0">
            Remove
          </Button>
        )}
      </div>
      {/* Tiptap toolbar — only shown when editable */}
      {!disabled && editor && (
        <div className="flex gap-1 flex-wrap border-b pb-2">
          {[
            { label: "B", title: "Bold", cmd: () => editor.chain().focus().toggleBold().run(), active: editor.isActive("bold") },
            { label: "I", title: "Italic", cmd: () => editor.chain().focus().toggleItalic().run(), active: editor.isActive("italic") },
            { label: "•", title: "Bullet list", cmd: () => editor.chain().focus().toggleBulletList().run(), active: editor.isActive("bulletList") },
            { label: "1.", title: "Ordered list", cmd: () => editor.chain().focus().toggleOrderedList().run(), active: editor.isActive("orderedList") },
          ].map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              onClick={btn.cmd}
              className={cn(
                "px-2 py-0.5 text-sm rounded border",
                btn.active ? "bg-black text-white border-black" : "border-gray-300 hover:bg-gray-100"
              )}
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
      <EditorContent
        editor={editor}
        className={cn(
          "min-h-[80px] text-sm prose prose-sm max-w-none focus-within:outline-none",
          disabled ? "opacity-60" : "border rounded p-2"
        )}
      />
    </div>
  );
}

export default function QuoteDetail({
  quote: initialQuote,
  currentUserId,
  taxLabels = { tax1: "GST", tax2: "PST" },
  products = [],
  templates = [],
}: {
  quote: Quote;
  currentUserId: string;
  taxLabels?: { tax1: string; tax2: string };
  products?: CatalogProduct[];
  templates?: CatalogTemplate[];
}) {
  const router = useRouter();
  const [items, setItems] = useState<QuoteItem[]>(
    initialQuote.items.length > 0
      ? initialQuote.items
      : [{ description: "", quantity: 1, unitPrice: 0, subtotal: 0, sortOrder: 0, itemType: "standard" }]
  );
  const [notes, setNotes] = useState(initialQuote.notes ?? "");
  const [projectAddress, setProjectAddress] = useState(initialQuote.projectAddress ?? "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    initialQuote.expectedCompletionDate
      ? new Date(initialQuote.expectedCompletionDate).toISOString().split("T")[0]
      : ""
  );
  const [leadSource, setLeadSource] = useState(initialQuote.leadSource ?? "website");
  const [sections, setSections] = useState<QuoteSection[]>(initialQuote.sections ?? []);
  const [taxRate, setTaxRate] = useState(initialQuote.taxRate);
  const [pstRate, setPstRate] = useState(initialQuote.pstRate ?? 0);
  const [saving, setSaving] = useState(false);
  const [finalising, setFinalising] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Save as template state
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [saveTemplateName, setSaveTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [saveTemplateError, setSaveTemplateError] = useState("");
  const [saveTemplateDone, setSaveTemplateDone] = useState(false);

  const isDraft = initialQuote.status === QUOTE_STATUS.DRAFT;
  const isFinalised = initialQuote.status === QUOTE_STATUS.FINALISED || initialQuote.status === QUOTE_STATUS.CHANGES_REQUESTED;
  const isAccepted = initialQuote.status === QUOTE_STATUS.ACCEPTED;

  // Per-item quantity: for hourly, use schedule total hours (preview); server recalculates on save.
  const itemQuantity = (item: QuoteItem) =>
    item.itemType === "hourly" && item.schedule?.length
      ? totalHoursFromSchedule(item.schedule)
      : item.quantity;
  const subtotal = items.reduce(
    (sum, item) => sum + itemQuantity(item) * item.unitPrice,
    0
  );
  const taxAmount = subtotal * (taxRate / 100);
  const pstAmount = subtotal * (pstRate / 100);
  const total = subtotal + taxAmount + pstAmount;

  function addItem() {
    setItems([
      ...items,
      { description: "", quantity: 1, unitPrice: 0, subtotal: 0, sortOrder: items.length, itemType: "standard" },
    ]);
  }

  function addFromProduct(product: CatalogProduct) {
    const itemType = product.unit === "hour" ? "hourly" : "standard";
    setItems([
      ...items,
      {
        description: product.name,
        quantity: itemType === "hourly" ? 0 : 1,
        unitPrice: product.defaultPrice ?? 0,
        subtotal: product.defaultPrice ?? 0,
        sortOrder: items.length,
        itemType: itemType as "standard" | "hourly",
      },
    ]);
  }

  function loadTemplate(template: CatalogTemplate) {
    const hasContent = items.some((i) => i.description.trim());
    if (hasContent && !confirm(`Load template "${template.name}"? This will replace all current line items.`)) return;
    setItems(
      template.items.map((item, idx) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
        sortOrder: idx,
        itemType: item.itemType,
      }))
    );
  }

  async function handleSaveAsTemplate() {
    setSaveTemplateError("");
    if (!saveTemplateName.trim()) {
      setSaveTemplateError("Template name is required.");
      return;
    }
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setSaveTemplateError("Quote must have at least one item.");
      return;
    }
    setSavingTemplate(true);
    const res = await fetch("/api/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: saveTemplateName.trim(),
        items: validItems.map((item, idx) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          itemType: item.itemType ?? "standard",
          sortOrder: idx,
        })),
      }),
    });
    setSavingTemplate(false);
    if (!res.ok) {
      const data = await res.json();
      setSaveTemplateError(data.error || "Failed to save template");
      return;
    }
    setSaveTemplateDone(true);
    setTimeout(() => {
      setShowSaveTemplate(false);
      setSaveTemplateName("");
      setSaveTemplateDone(false);
    }, 1500);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function updateItem(index: number, field: keyof QuoteItem, value: string | number | ScheduleRow[] | undefined) {
    const updated = [...items];
    (updated[index] as unknown as Record<string, unknown>)[field] = value;
    const item = updated[index];
    if (item.itemType === "hourly" && item.schedule?.length) {
      item.quantity = totalHoursFromSchedule(item.schedule);
    } else {
      item.quantity = Number(item.quantity) || 0;
    }
    item.subtotal = item.quantity * (Number(item.unitPrice) || 0);
    setItems(updated);
  }

  function setItemSchedule(index: number, schedule: ScheduleRow[]) {
    const updated = [...items];
    updated[index] = { ...updated[index], schedule };
    const item = updated[index];
    item.quantity = schedule.length ? totalHoursFromSchedule(schedule) : item.quantity;
    item.subtotal = item.quantity * (Number(item.unitPrice) || 0);
    setItems(updated);
  }

  /** Builds the PUT payload for a save or pre-finalise auto-save. */
  function buildSavePayload(validItems: QuoteItem[]) {
    return {
      items: validItems.map((item, i) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        sortOrder: i,
        itemType: item.itemType ?? "standard",
        schedule: item.itemType === "hourly" && item.schedule?.length ? item.schedule : undefined,
      })),
      sections: sections.filter((s) => s.heading.trim()).map((s, i) => ({
        heading: s.heading,
        body: s.body,
        sortOrder: i,
      })),
      notes: notes || undefined,
      projectAddress: projectAddress || null,
      expectedCompletionDate: expectedCompletionDate
        ? new Date(expectedCompletionDate).toISOString()
        : null,
      leadSource,
      taxRate,
      pstRate,
    };
  }

  async function handleSave() {
    setError("");
    setSaving(true);

    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError("Add at least one item with a description");
      setSaving(false);
      return;
    }

    const res = await fetch(`/api/quotes/${initialQuote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSavePayload(validItems)),
    });

    setSaving(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save");
      return;
    }

    router.refresh();
  }

  async function handleFinalise() {
    if (!confirm("Finalise this quote? It cannot be edited after finalisation.")) return;

    setError("");
    setFinalising(true);

    // Auto-save before finalising so the DB matches what the user sees
    const validItems = items.filter((i) => i.description.trim());
    if (validItems.length === 0) {
      setError("Add at least one item with a description");
      setFinalising(false);
      return;
    }

    const saveRes = await fetch(`/api/quotes/${initialQuote.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildSavePayload(validItems)),
    });

    if (!saveRes.ok) {
      const data = await saveRes.json();
      setError(data.error || "Failed to save before finalising");
      setFinalising(false);
      return;
    }

    const res = await fetch(`/api/quotes/${initialQuote.id}/finalise`, {
      method: "POST",
    });

    setFinalising(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to finalise");
      return;
    }

    router.refresh();
  }

  async function handleRevise() {
    if (!confirm("Revert to draft? The current link will be invalidated and a new one will be generated when you finalise again.")) return;

    setError("");
    const res = await fetch(`/api/quotes/${initialQuote.id}/revise`, {
      method: "POST",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to revise");
      return;
    }

    router.refresh();
  }

  async function handleDelete() {
    if (!confirm("Delete this draft? The original request will be available again.")) return;

    const res = await fetch(`/api/quotes/${initialQuote.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to delete");
      return;
    }

    router.push("/quotes");
    router.refresh();
  }

  async function handleCopy() {
    if (!initialQuote.defaultMessage) return;
    await navigator.clipboard.writeText(initialQuote.defaultMessage);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [origin, setOrigin] = useState("");
  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = initialQuote.token && origin
    ? `${origin}/q/${initialQuote.token}`
    : null;

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/quotes" className="text-sm text-muted-foreground hover:underline">
              &larr; Quotes
            </Link>
          </div>
          <h1 className="text-2xl font-bold mt-2">{initialQuote.quoteNumber}</h1>
          <p className="text-muted-foreground">
            {initialQuote.customerName} &middot; {initialQuote.customerEmail}
          </p>
        </div>
        <span
          className={cn(
            "text-sm px-3 py-1 rounded-full font-medium",
            statusColors[initialQuote.status as keyof typeof statusColors] ?? "bg-gray-100"
          )}
        >
          {QUOTE_STATUS_LABEL[initialQuote.status as keyof typeof QUOTE_STATUS_LABEL] ?? initialQuote.status}
        </span>
      </div>

      {/* Request info */}
      {(initialQuote.request.service || initialQuote.request.message) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Original Request
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {initialQuote.request.service && (
              <p>
                <span className="text-muted-foreground">Service:</span>{" "}
                {initialQuote.request.service}
              </p>
            )}
            {initialQuote.request.cities.length > 0 && (
              <p>
                <span className="text-muted-foreground">Cities:</span>{" "}
                {initialQuote.request.cities.join(", ")}
              </p>
            )}
            {initialQuote.request.message && (
              <p>
                <span className="text-muted-foreground">Message:</span>{" "}
                {initialQuote.request.message}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quote metadata — lead source, project address, expected completion */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quote Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="leadSource">Lead Source</Label>
            <Select value={leadSource} onValueChange={(v) => { if (v) setLeadSource(v); }}>
              <SelectTrigger id="leadSource" className="w-56">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LEAD_SOURCE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="projectAddress">Project Address</Label>
              <Input
                id="projectAddress"
                value={projectAddress}
                onChange={(e) => setProjectAddress(e.target.value)}
                placeholder="123 Main St, Vancouver, BC"
                disabled={!isDraft}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expectedCompletionDate">Expected Completion</Label>
              <Input
                id="expectedCompletionDate"
                type="date"
                value={expectedCompletionDate}
                onChange={(e) => setExpectedCompletionDate(e.target.value)}
                disabled={!isDraft}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer feedback / change requests */}
      {initialQuote.changeRequests.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-orange-800">
              Customer Feedback ({initialQuote.changeRequests.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialQuote.changeRequests.map((cr) => (
              <div
                key={cr.id}
                className="border-l-4 border-orange-300 pl-3 py-1"
              >
                <p className="text-sm whitespace-pre-wrap">{cr.comment}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {cr.customerName} &middot;{" "}
                  {new Date(cr.createdAt).toLocaleString("en-CA", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Activity / History timeline */}
      {initialQuote.activity.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <p className="text-xs text-muted-foreground">
              History of changes for this quote
            </p>
          </CardHeader>
          <CardContent>
            <ul className="space-y-4">
              {initialQuote.activity.map((entry) => {
                const label = AUDIT_ACTION_LABEL[entry.action] ?? entry.action;
                const isCustomerAction =
                  entry.action === "changes_requested" || entry.action === "quote_accepted";
                const byLabel = entry.userName
                  ? `by ${entry.userName}`
                  : isCustomerAction
                    ? "by customer"
                    : null;
                const meta = entry.metadata;
                const itemCount = typeof meta.itemCount === "number" ? meta.itemCount : null;
                const total = typeof meta.total === "number" ? meta.total : null;
                const comment = typeof meta.comment === "string" ? meta.comment : null;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      "flex flex-col gap-0.5 border-l-2 pl-3",
                      isCustomerAction ? "border-orange-300" : "border-border"
                    )}
                  >
                    <p className="text-sm font-medium">
                      {label}
                      {byLabel && (
                        <span className="font-normal text-muted-foreground">
                          {" "}
                          {byLabel}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(entry.createdAt).toLocaleString("en-CA", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                    {(itemCount != null || total != null) && (
                      <p className="text-xs text-muted-foreground">
                        {itemCount != null && `${itemCount} items`}
                        {itemCount != null && total != null && " · "}
                        {total != null &&
                          `$${Number(total).toLocaleString("en-CA", { minimumFractionDigits: 2 })} total`}
                      </p>
                    )}
                    {comment && (
                      <p className="text-sm mt-1 whitespace-pre-wrap text-muted-foreground">
                        {comment}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Finalised: show link + copy */}
      {(isFinalised || isAccepted) && publicUrl && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="py-4 space-y-3">
            <div>
              <Label className="text-sm font-medium">Public Quote Link</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input value={publicUrl} readOnly className="bg-white text-sm" />
                <Button size="sm" variant="outline" onClick={handleCopy}>
                  {copied ? "Copied!" : "Copy Message"}
                </Button>
                <a href={publicUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="sm" variant="outline">
                    Preview
                  </Button>
                </a>
              </div>
            </div>
            {initialQuote.defaultMessage && (
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  Preview default message
                </summary>
                <pre className="mt-2 p-3 bg-white rounded border text-xs whitespace-pre-wrap">
                  {initialQuote.defaultMessage}
                </pre>
              </details>
            )}
          </CardContent>
        </Card>
      )}

      {/* Accepted: show signature */}
      {isAccepted && initialQuote.signature && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-4 text-sm">
            <p className="font-medium text-green-800">Quote Accepted</p>
            <p className="mt-1">
              Signed by: <strong>{initialQuote.signature.signedBy}</strong>
              {initialQuote.signature.signedByTitle &&
                ` (${initialQuote.signature.signedByTitle})`}
            </p>
            <p className="text-muted-foreground">
              {new Date(initialQuote.signature.signedAt).toLocaleString("en-CA")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Line Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-1">
              <div className="col-span-5">Description</div>
              <div className="col-span-2">Qty</div>
              <div className="col-span-2">Unit Price</div>
              <div className="col-span-2 text-right">Subtotal</div>
              <div className="col-span-1"></div>
            </div>

            {items.map((item, index) => (
              <div key={index} className="space-y-2">
                {/* Item type dropdown — outside the grid to keep columns aligned */}
                {isDraft && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Billing:</span>
                    <select
                      className="text-xs border rounded px-2 py-1.5 bg-white"
                      value={item.itemType ?? "standard"}
                      onChange={(e) => updateItem(index, "itemType", e.target.value as "standard" | "hourly")}
                    >
                      <option value="standard">Standard</option>
                      <option value="hourly">Hourly</option>
                    </select>
                  </div>
                )}
                <div className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <Input
                      placeholder={item.itemType === "hourly" ? "e.g. Static Guard Service" : "e.g. Static Guard - Night Shift"}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      disabled={!isDraft}
                    />
                  </div>
                  <div className="col-span-2">
                    {item.itemType === "hourly" && item.schedule?.length ? (
                      <span className="text-sm text-muted-foreground">
                        {itemQuantity(item)} hrs
                      </span>
                    ) : (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.quantity || ""}
                        onChange={(e) => updateItem(index, "quantity", parseFloat(e.target.value) || 0)}
                        disabled={!isDraft}
                      />
                    )}
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ""}
                      onChange={(e) => updateItem(index, "unitPrice", parseFloat(e.target.value) || 0)}
                      disabled={!isDraft}
                      placeholder={item.itemType === "hourly" ? "Rate/hr" : ""}
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-medium">
                    ${(itemQuantity(item) * item.unitPrice).toLocaleString("en-CA", {
                      minimumFractionDigits: 2,
                    })}
                  </div>
                  <div className="col-span-1 text-right">
                    {isDraft && items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 px-2"
                        onClick={() => removeItem(index)}
                      >
                        x
                      </Button>
                    )}
                  </div>
                </div>
                {isDraft && item.itemType === "hourly" && (
                  <div className="pl-4 pr-3 py-3 border-l-2 border-muted text-xs space-y-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-medium text-muted-foreground">Schedule (date / time ranges)</span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setItemSchedule(index, [...(item.schedule ?? []), { startDate: "", startTime: "", endDate: "", endTime: "" }])}
                      >
                        + Schedule
                      </Button>
                    </div>
                    {(item.schedule ?? []).map((row, ri) => (
                      <div key={ri} className="grid grid-cols-4 gap-2 items-center">
                        <Input
                          type="date"
                          value={row.startDate || ""}
                          onChange={(e) => {
                            const s = [...(item.schedule ?? [])];
                            s[ri] = { ...s[ri]!, startDate: e.target.value };
                            setItemSchedule(index, s);
                          }}
                          className="h-8"
                        />
                        <Input
                          type="time"
                          value={row.startTime || ""}
                          onChange={(e) => {
                            const s = [...(item.schedule ?? [])];
                            s[ri] = { ...s[ri]!, startTime: e.target.value };
                            setItemSchedule(index, s);
                          }}
                          className="h-8"
                        />
                        <Input
                          type="date"
                          value={row.endDate ?? row.startDate ?? ""}
                          onChange={(e) => {
                            const s = [...(item.schedule ?? [])];
                            s[ri] = { ...s[ri]!, endDate: e.target.value || undefined };
                            setItemSchedule(index, s);
                          }}
                          className="h-8"
                          placeholder="End date"
                        />
                        <div className="flex gap-1">
                          <Input
                            type="time"
                            value={row.endTime ?? ""}
                            onChange={(e) => {
                              const s = [...(item.schedule ?? [])];
                              s[ri] = { ...s[ri]!, endTime: e.target.value || undefined };
                              setItemSchedule(index, s);
                            }}
                            className="h-8"
                            placeholder="End time"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 h-8 px-1"
                            onClick={() => setItemSchedule(index, (item.schedule ?? []).filter((_, i) => i !== ri))}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                    {/* Hours split — same format as public quote */}
                    {(item.schedule ?? []).length > 0 && (() => {
                      const breakdown = getScheduleBreakdown(item.schedule);
                      if (breakdown.length === 0) return null;
                      return (
                        <div className="mt-2 pt-2 border-t border-muted space-y-1">
                          <span className="font-medium text-muted-foreground">Hours breakdown</span>
                          {breakdown.map((row, i) => {
                            const startDateFmt = row.startDate ? new Date(row.startDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "";
                            const endDate = row.endDate || row.startDate;
                            const endDateFmt = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : startDateFmt;
                            const endTime = row.endTime ?? row.startTime ?? "";
                            const sameDay = row.startDate && endDate === row.startDate;
                            const hrs = row.hours % 1 === 0 ? row.hours : row.hours.toFixed(2);
                            const hrsLabel = row.hours === 1 ? "hr" : "hrs";
                            return (
                              <div key={i} className="text-muted-foreground">
                                {sameDay ? (
                                  <>{startDateFmt} — {row.startTime} to {endTime} = {hrs} {hrsLabel}</>
                                ) : (
                                  <>Start: {startDateFmt} {row.startTime} · End: {endDateFmt} {endTime} = {hrs} {hrsLabel}</>
                                )}
                              </div>
                            );
                          })}
                          <div className="font-medium text-foreground pt-0.5">
                            Total hours — {itemQuantity(item)} hrs
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {/* Non-draft: show hours breakdown for hourly items with schedule */}
                {!isDraft && item.itemType === "hourly" && (item.schedule ?? []).length > 0 && (() => {
                  const breakdown = getScheduleBreakdown(item.schedule);
                  if (breakdown.length === 0) return null;
                  return (
                    <div className="mt-2 pl-2 border-l-2 border-muted text-xs space-y-1">
                      <span className="font-medium text-muted-foreground">Hours breakdown</span>
                      {breakdown.map((row, i) => {
                        const startDateFmt = row.startDate ? new Date(row.startDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : "";
                        const endDate = row.endDate || row.startDate;
                        const endDateFmt = endDate ? new Date(endDate + "T00:00:00").toLocaleDateString("en-CA", { month: "long", day: "numeric", year: "numeric" }) : startDateFmt;
                        const endTime = row.endTime ?? row.startTime ?? "";
                        const sameDay = row.startDate && endDate === row.startDate;
                        const hrs = row.hours % 1 === 0 ? row.hours : row.hours.toFixed(2);
                        const hrsLabel = row.hours === 1 ? "hr" : "hrs";
                        return (
                          <div key={i} className="text-muted-foreground">
                            {sameDay ? (
                              <>{startDateFmt} — {row.startTime} to {endTime} = {hrs} {hrsLabel}</>
                            ) : (
                              <>Start: {startDateFmt} {row.startTime} · End: {endDateFmt} {endTime} = {hrs} {hrsLabel}</>
                            )}
                          </div>
                        );
                      })}
                      <div className="font-medium text-foreground pt-0.5">
                        Total hours — {item.quantity % 1 === 0 ? item.quantity : Number(item.quantity).toFixed(2)} hrs
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}

            {isDraft && (
              <div className="flex items-center gap-2 flex-wrap">
                {products.length > 0 ? (
                  <select
                    className="h-8 rounded-md border px-2 text-sm text-muted-foreground"
                    value=""
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === "__custom__") {
                        addItem();
                      } else {
                        const product = products.find((p) => p.id === val);
                        if (product) addFromProduct(product);
                      }
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>+ Add Item...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}{p.defaultPrice != null ? ` ($${p.defaultPrice.toFixed(2)}/${p.unit})` : ""}
                      </option>
                    ))}
                    <option value="__custom__">Custom item (blank)</option>
                  </select>
                ) : (
                  <Button variant="outline" size="sm" onClick={addItem}>
                    + Add Item
                  </Button>
                )}
                {templates.length > 0 && (
                  <select
                    className="h-8 rounded-md border px-2 text-sm text-muted-foreground"
                    value=""
                    onChange={(e) => {
                      const tmpl = templates.find((t) => t.id === e.target.value);
                      if (tmpl) loadTemplate(tmpl);
                      e.target.value = "";
                    }}
                  >
                    <option value="" disabled>Load Template...</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.items.length} item{t.items.length !== 1 ? "s" : ""})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {/* Totals — two-column grid so labels and amounts align */}
          <div className="mt-6 border-t pt-4 max-w-xs ml-auto text-sm">
            <div className="grid grid-cols-[1fr_auto] gap-x-6 gap-y-2 items-center">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-right tabular-nums">${subtotal.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">{taxLabels.tax1}</span>
                {isDraft ? (
                  <>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={taxRate || ""}
                      onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-xs shrink-0"
                    />
                    <span className="text-muted-foreground shrink-0">%</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">({taxRate}%)</span>
                )}
              </div>
              <span className="text-right tabular-nums">${taxAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">{taxLabels.tax2}</span>
                {isDraft ? (
                  <>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={pstRate || ""}
                      onChange={(e) => setPstRate(parseFloat(e.target.value) || 0)}
                      className="w-16 h-7 text-xs shrink-0"
                    />
                    <span className="text-muted-foreground shrink-0">%</span>
                  </>
                ) : (
                  <span className="text-muted-foreground">({pstRate}%)</span>
                )}
              </div>
              <span className="text-right tabular-nums">${pstAmount.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>

              <span className="font-bold pt-2 border-t border-border">Total</span>
              <span className="text-right font-bold text-base tabular-nums pt-2 border-t border-border">${total.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            className="w-full min-h-[80px] p-3 border rounded-md text-sm resize-y disabled:opacity-60 disabled:cursor-not-allowed"
            placeholder="Notes visible to the customer on the quote page..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={!isDraft}
          />
        </CardContent>
      </Card>

      {/* Rich-text Sections */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Sections</CardTitle>
            {isDraft && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setSections((prev) => [
                    ...prev,
                    { heading: "", body: "", sortOrder: prev.length },
                  ])
                }
              >
                + Add Section
              </Button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Freeform blocks that appear on the quote page — inclusions, terms, notes, etc.
          </p>
        </CardHeader>
        {sections.length > 0 && (
          <CardContent className="space-y-6">
            {sections.map((section, idx) => (
              <SectionEditor
                key={idx}
                section={section}
                disabled={!isDraft}
                onHeadingChange={(v) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, heading: v } : s))
                  )
                }
                onBodyChange={(v) =>
                  setSections((prev) =>
                    prev.map((s, i) => (i === idx ? { ...s, body: v } : s))
                  )
                }
                onRemove={() =>
                  setSections((prev) => prev.filter((_, i) => i !== idx))
                }
              />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Save as Template */}
      <div className="flex items-start gap-3">
        {!showSaveTemplate ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => { setShowSaveTemplate(true); setSaveTemplateName(""); setSaveTemplateError(""); setSaveTemplateDone(false); }}
          >
            Save as Template
          </Button>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            {saveTemplateDone ? (
              <p className="text-sm text-green-600">Template saved!</p>
            ) : (
              <>
                <Input
                  value={saveTemplateName}
                  onChange={(e) => setSaveTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="h-8 w-52 text-sm"
                  onKeyDown={(e) => e.key === "Enter" && handleSaveAsTemplate()}
                />
                <Button size="sm" onClick={handleSaveAsTemplate} disabled={savingTemplate}>
                  {savingTemplate ? "Saving..." : "Save"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveTemplate(false)}>
                  Cancel
                </Button>
                {saveTemplateError && <p className="text-xs text-red-600">{saveTemplateError}</p>}
              </>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {isDraft && (
        <div className="flex items-center justify-between">
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Draft"}
            </Button>
            <Button
              variant="outline"
              onClick={handleFinalise}
              disabled={finalising || items.every((i) => !i.description.trim())}
            >
              {finalising ? "Finalising..." : "Finalise Quote"}
            </Button>
          </div>
          <Button
            variant="ghost"
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
            onClick={handleDelete}
          >
            Delete Draft
          </Button>
        </div>
      )}

      {isFinalised && (
        <div>
          <Button variant="outline" onClick={handleRevise}>
            Revise Quote
          </Button>
          <p className="text-xs text-muted-foreground mt-1">
            Reverts to draft so you can edit. The current link will be invalidated.
          </p>
        </div>
      )}
    </div>
  );
}
