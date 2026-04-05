# Product Plan: Genericize Quote Management System

## Context

The current codebase is a Boss Security-specific quote management portal. We're converting it into a **generic, white-labelable product** that any company can use for their quote lifecycle. The goal is to remove all Boss Security-specific hardcoding, introduce a tenant configuration layer, self-service product/SKU management, and tiered branding/theming.

**Deployment model:** Single-tenant deploys for now (one instance per customer, own DB). Design the config layer so multi-tenant (shared DB with `tenant_id`) can be added later without rewriting.

**Subscription tiers (for theming):**
- **Free/Basic:** Logo upload + primary/accent color
- **Premium:** Above + company name, tagline, contact info (phone, website), footer text, custom email sender name

---

## Phase 0 — Extract Tenant Config (Foundation)
**Goal:** Remove all Boss Security hardcoding. Create a single `config/tenant.ts` that every part of the app reads from.

### What changes

**New file: `config/tenant.ts`**
A typed config object loaded from env vars (or a JSON/DB table later). Shape:
```ts
export interface TenantConfig {
  // Company identity
  companyName: string;          // "Boss Security" → env: COMPANY_NAME
  companyTagline?: string;      // "Professional Security Services"
  companyPhone?: string;        // "+1 888-498-BOSS"
  companyWebsite?: string;      // "bosssecurity.ca"
  companyLogoUrl?: string;      // URL to uploaded logo (R2)
  
  // Branding (basic tier)
  primaryColor: string;         // hex, default "#000000"
  
  // Email
  emailFromName: string;        // "Boss Security"
  emailFromAddress: string;     // "noreply@bosssecurity.ca"
  emailAdminAddress: string;    // "admin@bosssecurity.ca"
  
  // Feature flags
  premiumBranding: boolean;     // unlocks tagline, phone, website, footer on public page
  
  // Tax labels (generic — not hardcoded to GST/PST)
  tax1Label: string;            // "GST" (default)
  tax2Label: string;            // "PST" (default), or "HST", "VAT", etc.
  
  // Locale
  locale: string;               // "en-CA" default
  currency: string;             // "CAD" default
}
```

**Files to modify:**

| File | What changes |
|------|-------------|
| `lib/constants.ts` | Remove `SERVICES`, `CITIES`, `EMAIL_FROM`, `EMAIL_ADMIN`. Keep generic constants (statuses, roles, audit actions). |
| `lib/email.ts` | Import `emailFromName`, `emailFromAddress`, `emailAdminAddress` from tenant config instead of constants. Replace "Boss Security Quote System" footer with `companyName`. |
| `app/layout.tsx` | Read `companyName` for `<title>` metadata instead of hardcoded "Boss Security". |
| `app/login/page.tsx` | Replace "Boss Security" heading and placeholder with tenant config values. |
| `components/portal-nav.tsx` | Replace "Boss Security" / "Quote Portal" with `companyName` from config. |
| `app/q/[token]/public-quote.tsx` | Replace all "Boss Security", phone number, website with tenant config. Use logo if available. Apply `primaryColor`/`accentColor` to header and buttons. Conditionally show tagline/phone/website behind `premiumBranding` flag. |
| `app/api/webhooks/quote-request/route.ts` | No structural change — webhook is already generic. Update comments only. |
| `prisma/schema.prisma` | Update comments to remove "bosssecurity.ca" references. |
| `docs/*` | Update all docs to describe the generic product, not Boss Security specifically. |

**Tax labels:** Replace hardcoded "GST" / "PST (MB)" labels in the public quote page and quote builder with `tax1Label` / `tax2Label` from config.

### Verification
- App builds and runs with env vars set to Boss Security values — identical behavior to current.
- Change env vars to a different company name/colors — login, portal nav, public quote page, and emails all reflect the new values.

---

## Phase 1 — Product / SKU Catalog (Self-Service)
**Goal:** Let admin users manage their own product catalog through the portal. Products appear as selectable options when building quotes.

### Data model changes

**New Prisma model: `Product`**
```prisma
model Product {
  id          String   @id @default(cuid())
  name        String                        // "Static Guard Services"
  sku         String?  @unique              // optional SKU code
  description String?                       // longer description
  category    String?                       // grouping: "Security", "Monitoring", etc.
  defaultPrice Decimal? @db.Decimal(10, 2)  // suggested unit price
  unit        String   @default("unit")     // "unit", "hour", "month", "day"
  active      Boolean  @default(true)       // soft-delete
  sortOrder   Int      @default(0)

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### API routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/products` | GET, POST | Session (POST: ADMIN) | List active products / create product |
| `/api/products/[id]` | PATCH, DELETE | Session (ADMIN) | Edit / soft-delete product |

### UI changes

**New page: `app/(portal)/products/page.tsx`**
- Admin-only page (add to nav for admins, like Users)
- Table: name, SKU, category, default price, unit, active status
- Create button → modal/form: name, SKU, description, category, default price, unit
- Edit/delete (soft) per row
- Bulk import (CSV) — stretch goal, Phase 1b

**Quote builder changes: `app/(portal)/quotes/[id]/quote-detail.tsx`**
- When adding a line item, show a **product picker** (dropdown/combobox) that lists active products
- Selecting a product pre-fills: description (from product name), unit price (from default price), item type (from unit: "hour" → hourly, else standard)
- User can still override all fields after selection
- "Custom item" option for one-off items not in the catalog

**Remove from `lib/constants.ts`:**
- `SERVICES` array (replaced by Product catalog)
- `CITIES` array (move to tenant config or remove — cities are customer-specific)

### Verification
- Admin can create/edit/delete products in the portal
- When building a quote, product picker appears with catalog items
- Selecting a product pre-fills line item fields
- Custom (freeform) items still work

---

## Phase 2 — Branding & Theme Settings (Portal UI)
**Goal:** Let admins configure branding through the portal instead of env vars only. Two tiers: basic (logo + colors) and premium (full company info).

### Data model changes

**New Prisma model: `TenantSettings`**
```prisma
model TenantSettings {
  id               String   @id @default("default")  // singleton row
  companyName      String
  companyTagline   String?
  companyPhone     String?
  companyWebsite   String?
  logoUrl          String?
  primaryColor     String   @default("#000000")
  emailFromName    String?
  emailFromAddress String?
  emailAdminAddress String?
  tax1Label        String   @default("GST")
  tax2Label        String   @default("PST")
  locale           String   @default("en-CA")
  currency         String   @default("CAD")
  premiumBranding  Boolean  @default(false)
  footerText       String?

  updatedAt        DateTime @updatedAt
}
```

### API routes

| Route | Methods | Auth | Purpose |
|-------|---------|------|---------|
| `/api/settings` | GET | Session | Read current tenant settings |
| `/api/settings` | PUT | Session (ADMIN) | Update tenant settings |
| `/api/settings/logo` | POST | Session (ADMIN) | Upload logo to R2, return URL |

### UI changes

**New page: `app/(portal)/settings/page.tsx`**
- Admin-only page (add "Settings" to nav)
- **Basic section (all tiers):**
  - Company name (text input)
  - Logo upload (drag-drop or file input → preview)
  - Primary color picker
  - Accent color picker
  - Tax labels (Tax 1 label, Tax 2 label)
  - Live preview panel showing how the public quote page header will look
- **Premium section (gated behind `premiumBranding` flag):**
  - Company tagline
  - Phone number
  - Website URL
  - Footer text
  - Email sender name
  - If not premium: show section greyed out with "Upgrade to Premium" badge

**Update `config/tenant.ts`:**
- On app load, read from `TenantSettings` DB table (with fallback to env vars for backwards compat)
- Cache in-memory with short TTL (or revalidate on settings save)

### Verification
- Admin uploads logo and sets colors → public quote page immediately reflects changes
- Premium fields are gated — only editable when `premiumBranding` is true
- Email notifications use the configured sender name and address
- Print layout uses logo and colors correctly

---

## Phase 3 — Genericize Docs, README, and Webhook
**Goal:** Clean up all documentation, make the webhook contract generic, and prepare for distribution.

### Changes

- **README.md** — Rewrite for the generic product: "Quote Management System — a white-label quote lifecycle tool"
- **docs/REQUIREMENTS.md** — Replace all Boss Security references. Describe the product generically. Add "Product catalog" and "Branding settings" to functional requirements.
- **docs/ARCHITECTURE.md** — Update file layout to include new routes (`/api/products`, `/api/settings`). Update tech decisions. Remove WordPress-specific framing (webhook is now "generic inbound webhook").
- **docs/STRATEGY.md** — Add new phases for genericization work. Update phase statuses.
- **Webhook** — Already generic in implementation. Update docs to frame it as "inbound lead webhook" (not WordPress-specific). The HMAC verification works for any source.

### Verification
- All docs read as a generic product, not Boss Security
- A new developer can onboard from the README without Boss Security context

---

## Phase 4 — Polish & Future-Proofing
**Goal:** UX improvements and preparing the multi-tenant path.

### Items
1. **Onboarding wizard** — On first login (no TenantSettings row exists), walk the admin through: company name → logo upload → colors → create first user → done. Seeds the TenantSettings row.
2. **Product import (CSV)** — Bulk import products from a CSV file (name, SKU, price, category, unit).
3. **Quote templates** — Save a quote as a template (set of line items) that can be reused. Admin manages templates.
4. **Multi-tenant prep** — Add `tenantId` column to all models (nullable for now). Add `Tenant` model. Don't enforce yet — just the schema migration so the path is clear.
5. **Custom domain support** — Allow premium customers to use their own domain. Vercel supports this natively.

---

## Implementation Order (Recommended)

| Order | Phase | Effort Est. | Depends on |
|-------|-------|------------|------------|
| 1 | Phase 0 — Extract Tenant Config | Small | — |
| 2 | Phase 1 — Product/SKU Catalog | Medium | Phase 0 |
| 3 | Phase 2 — Branding & Theme Settings | Medium | Phase 0 |
| 4 | Phase 3 — Genericize Docs | Small | Phases 0-2 |
| 5 | Phase 4 — Polish & Future-Proofing | Large | Phases 0-3 |

Phases 1 and 2 can be done **in parallel** after Phase 0 is complete — they don't depend on each other.

---

## Key files to modify (summary)

| File | Phase |
|------|-------|
| `config/tenant.ts` (new) | 0 |
| `lib/constants.ts` | 0, 1 |
| `lib/email.ts` | 0 |
| `app/layout.tsx` | 0 |
| `app/login/page.tsx` | 0 |
| `components/portal-nav.tsx` | 0 |
| `app/q/[token]/public-quote.tsx` | 0, 2 |
| `prisma/schema.prisma` | 1, 2 |
| `app/api/products/route.ts` (new) | 1 |
| `app/api/products/[id]/route.ts` (new) | 1 |
| `app/(portal)/products/page.tsx` (new) | 1 |
| `app/(portal)/quotes/[id]/quote-detail.tsx` | 1 |
| `app/api/settings/route.ts` (new) | 2 |
| `app/(portal)/settings/page.tsx` (new) | 2 |
| `docs/*` | 3 |
| `README.md` | 3 |
