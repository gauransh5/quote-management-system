# Design: Static/Hourly Service and PST

**Related docs:** [REQUIREMENTS.md](REQUIREMENTS.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [STRATEGY.md](STRATEGY.md)  
**Last updated:** March 2026  
*Traceability:* Quote finalisation and sharing, Public quote page (REQUIREMENTS); Data flow, Key design decisions, File layout (ARCHITECTURE); Phase 2–3 scope (STRATEGY).

## 1. What we're building

1. **Static/fixed hourly service**  
   Quotes can include a line item that represents a service (e.g. Static Guard) over specific date(s) and time ranges, with total hours computed from the schedule and billed at an hourly rate. The quote document shows the date/time breakdown with start and end dates (e.g. "Start: March 6, 2026 17:30 · End: March 7, 2026 08:00 = 14.5 hrs") and a clear "Total hours — X hrs" line.

2. **PST (Provincial Sales Tax)**  
   In addition to the existing single tax (GST), the quote can apply a second tax (PST). The document shows Subtotal, GST (%), PST (%), and Total. Example: GST 5%, PST (MB) 7%.

---

## 2. Static/hourly service — approach

### Option A: Extend QuoteItem with type + schedule (chosen)

- Add `itemType: 'standard' | 'hourly'` (default `'standard'`).
- Add optional `schedule` (JSON) on `QuoteItem`: array of `{ startDate, startTime, endDate?, endTime? }`.
- For `itemType === 'hourly'` and when `schedule` is present, the **server** computes total hours from the schedule (including overnight spans), sets `quantity = totalHours`, `unitPrice = hourly rate`, and `subtotal = quantity × unitPrice`.
- `description` remains the service name (e.g. "Static Guard Service").
- On the public quote and portal, hourly items can show the schedule breakdown (date, time range, hours per row) plus total hours and rate.

**Pros:** Single line-item model; backward compatible (existing items stay `standard`); schedule is stored for display and audit.  
**Cons:** Slightly more complex item validation and server-side hour calculation.

### Option B: Separate model for hourly lines

- New model e.g. `QuoteHourlyLine` with schedule rows and hourly rate; quote has both `items` and `hourlyLines`.
- **Pros:** Clear separation of “product” vs “hourly” lines.
- **Cons:** Two line types to merge in list/PDF; more API and UI branches.

### Option C: No structured schedule

- Keep current items; user enters total hours and rate manually; breakdown only in description text.
- **Pros:** Easiest to implement.
- **Cons:** No structured date/time breakdown on the document; no server-side validation of hours.

**Recommendation:** Option A — one item table with optional schedule for hourly items, server as single source of truth for total hours and line total.

### Schedule JSON shape

- `schedule`: array of `{ startDate: string (YYYY-MM-DD), startTime: string (HH:mm), endDate?: string (YYYY-MM-DD), endTime?: string (HH:mm) }`.
- If `endDate`/`endTime` are omitted, treat as same-day (endTime only) or require both for overnight. We require `endDate` and `endTime` for clarity; overnight = endDate > startDate or (endDate === startDate && endTime < startTime).
- Server computes hours per row (e.g. end − start in hours, handling next-day), sums to `totalHours`, and uses that as `quantity`.

---

## 3. PST — approach

### Option A: Add pstRate and pstAmount (chosen)

- Keep existing `taxRate` and `taxAmount` as **GST**.
- Add `pstRate` and `pstAmount` (default 0) on `Quote`.
- **Total** = subtotal + taxAmount (GST) + pstAmount.
- API and UI send/display GST and PST separately (e.g. "GST (5%)", "PST (MB) (7%)").

**Pros:** Minimal schema change; clear labelling; backward compatible (PST 0).  
**Cons:** Slight naming ambiguity (existing "tax" is GST); we document and label as GST in UI.

### Option B: Rename to gstRate, gstAmount, pstRate, pstAmount

- **Pros:** Explicit naming.
- **Cons:** Migration and more code/UI changes.

**Recommendation:** Option A — add `pstRate`, `pstAmount`; treat current tax as GST in labels.

---

## 4. Server-side calculations (single source of truth)

Per `.cursor/rules/server-side-calculations.mdc`:

- **Hourly line:** Server computes total hours from `schedule` and sets `quantity` and `subtotal`; client never persists computed hours.
- **Totals:** Server computes subtotal (sum of item subtotals), GST, PST, and total on every quote save; all displays read from DB.

---

## 5. Traceability

- Supports **Quote finalisation and sharing** and **Public quote page** (REQUIREMENTS): quote document shows hourly breakdown and both GST and PST when applicable.
- Sales team can create/edit draft quotes with hourly services and PST; customer sees the same on the public page and print/PDF.
