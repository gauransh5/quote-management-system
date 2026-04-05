# Quote Management System – Strategy

**Version:** 4.0  
**Last Updated:** April 2026  
**Related docs:** [REQUIREMENTS.md](REQUIREMENTS.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md) | [PRODUCT-PLAN.md](PRODUCT-PLAN.md)

This document defines **phasing**, **priorities**, **build order**, **test plans**, and **how AI agents should use** the three docs. It keeps implementation order and scope clear.

---

## Table of Contents

1. [How to Use These Documents](#how-to-use-these-documents)
2. [Original Build Phases (1–5)](#original-build-phases-15)
3. [Genericization Phases (G0–G4)](#genericization-phases-g0g4)
4. [Priorities](#priorities)

---

## How to Use These Documents

| Document | When to use |
|----------|-------------|
| **REQUIREMENTS.md** | Before implementing a feature: check scope and acceptance criteria. |
| **ARCHITECTURE.md** | When adding APIs, pages, or integrations: follow components, contracts, and tech stack. Place code in the correct directory per [File layout](ARCHITECTURE.md#file-layout). |
| **STRATEGY.md** | When planning work: follow the phase order, build steps, and test plan. |
| **PRODUCT-PLAN.md** | For the genericization roadmap: detailed specs for each G-phase. |

**Workflow for agents:** Requirements (what) → Architecture (how) → Strategy (order). If in doubt, resolve with REQUIREMENTS first, then ARCHITECTURE, then STRATEGY.

**Rules (enforced):**
- `.claude/rules/document-before-implementing.md` — Design + pros/cons before coding
- `.claude/rules/design-docs-then-code.md` — Docs-first workflow priority
- `.claude/rules/server-side-calculations.md` — All monetary calculations server-side only

---

## Original Build Phases (1–5)

These phases built the initial Boss Security-specific product. All are complete or in progress.

### Phase 1 – Foundation — Done
Auth, webhook, user management, profiles, DB schema.

### Phase 2 – Portal core — Done
Quote builder, hourly items, GST/PST, finalise, copy link.

### Phase 3 – Public quote and accept — Done
Public page, accept flow, email notifications.

### Phase 4 – Dashboard and polish — Partially done
Dashboard totals done. Filter/search/sort TBD.

### Phase 5 – Mobile (optional) — Not started
React Native + Expo mobile app.

See the original test plans for Phases 1–5 in the git history (STRATEGY.md v3.0).

---

## Genericization Phases (G0–G4)

These phases convert the product from a Boss Security-specific tool into a generic, white-labelable quote management system. See [PRODUCT-PLAN.md](PRODUCT-PLAN.md) for full specs.

---

### Phase G0 – Extract Tenant Config — Done

**Scope:**
- Remove all Boss Security hardcoding from source code.
- Create `config/tenant.ts` — centralised tenant config from env vars.
- Replace hardcoded company name, email addresses, tax labels, service/city lists.

**What was built:**

| Change | Files |
|--------|-------|
| Tenant config module | `config/tenant.ts` (new) |
| Removed `SERVICES`, `CITIES`, `EMAIL_FROM`, `EMAIL_ADMIN` from constants | `lib/constants.ts` |
| Email helpers use tenant config | `lib/email.ts` |
| Dynamic company name in metadata | `app/layout.tsx` |
| Login page split into server + client components | `app/login/page.tsx`, `app/login/login-form.tsx` (new) |
| Portal nav accepts `companyName` prop | `components/portal-nav.tsx`, `app/(portal)/layout.tsx` |
| Public quote uses tenant config for branding, tax labels, locale | `app/q/[token]/page.tsx`, `app/q/[token]/public-quote.tsx` |
| 404 page uses tenant config | `app/q/[token]/not-found.tsx` |
| Finalise default message uses company name | `app/api/quotes/[id]/finalise/route.ts` |
| Quote builder uses dynamic tax labels | `app/(portal)/quotes/[id]/page.tsx`, `quote-detail.tsx` |
| Lead form uses free-text service/cities | `components/create-lead-form.tsx` |
| Generic placeholders and copy | `user-management.tsx`, `quote-request-list.tsx`, `quotes/page.tsx` |
| Schema comments genericized | `prisma/schema.prisma` |
| Tenant env vars added | `.env.local` |
| Claude Code rules created | `.claude/rules/` |

**Verification:**
- `npx next build` passes with no errors.
- No "Boss Security" or "bosssecurity" references in any `.ts` / `.tsx` / `.prisma` source file.
- Remaining references are only in documentation files (updated in G3).

#### Phase G0 test plan

| # | Test | Pass criteria |
|---|------|---------------|
| G0.1 | Build passes | `npx next build` succeeds with no TypeScript errors |
| G0.2 | No hardcoded company name in source | `grep -r "Boss Security" --include="*.ts" --include="*.tsx"` returns empty |
| G0.3 | Login shows configured company name | Set `COMPANY_NAME="Test Co"` → login page shows "Test Co" |
| G0.4 | Portal nav shows configured company name | Log in → sidebar shows "Test Co" |
| G0.5 | Public quote shows configured branding | Finalise a quote → open public link → header shows "Test Co" not "Boss Security" |
| G0.6 | Tax labels configurable | Set `TAX1_LABEL="VAT"` → quote builder and public page show "VAT" instead of "GST" |
| G0.7 | Email uses configured sender | Accept a quote → email log shows configured `EMAIL_FROM_NAME` and `EMAIL_FROM_ADDRESS` |
| G0.8 | Default message uses company name | Finalise a quote → default message contains `COMPANY_NAME` value |

---

### Phase G1 – Product / SKU Catalog — Done

**Scope:**
- `Product` model in Prisma (name, SKU, description, category, default price, unit).
- CRUD API routes (`/api/products`, `/api/products/[id]`).
- Admin-only Products page in portal.
- Product picker in quote builder (pre-fills line item fields).
- Hardcoded service lists already removed in G0.

**What was built:**

| Change | Files |
|--------|-------|
| Product model + migration | `prisma/schema.prisma`, `prisma/migrations/20260405115343_add_product_catalog/` |
| List/create API | `app/api/products/route.ts` (new) |
| Edit/delete API | `app/api/products/[id]/route.ts` (new) |
| Products admin page | `app/(portal)/products/page.tsx` (new), `product-management.tsx` (new) |
| Product picker in quote builder | `app/(portal)/quotes/[id]/page.tsx`, `quote-detail.tsx` |
| Nav link for admins | `components/portal-nav.tsx` |

**Design decision — product picker UI:**
Native `<select>` dropdown chosen over combobox (extra dependency) or modal (heavy UX). Matches existing form patterns. Sufficient for catalogs under ~50 products. Can upgrade to combobox in G4 if needed. See [ARCHITECTURE.md — Product Catalog](ARCHITECTURE.md#product-catalog) for full rationale.

#### Phase G1 test plan

| # | Test | Pass criteria |
|---|------|---------------|
| G1.1 | Build passes | `npx next build` succeeds |
| G1.2 | Products page loads (admin) | Log in as admin → navigate to `/products` → page renders |
| G1.3 | Products page blocked (sales) | Log in as sales → navigate to `/products` → redirected to `/dashboard` |
| G1.4 | Create product | Admin → Products → Add Product → fill name, SKU, price, unit → Create | Product appears in table |
| G1.5 | Edit product | Click Edit on a product → change name → Save | Name updated in table |
| G1.6 | Deactivate product | Click Deactivate → confirm | Product hidden from table (visible via "Show inactive") |
| G1.7 | Reactivate product | Show inactive → click Reactivate | Product active again |
| G1.8 | SKU uniqueness | Create two products with same SKU | Second creation returns 409 error |
| G1.9 | Product picker appears | Open a DRAFT quote → product dropdown visible with catalog items |
| G1.10 | Product pre-fills line item | Select a product → line item description, unit price, and item type pre-filled |
| G1.11 | Custom item still works | Select "Custom item (blank)" → empty line item added |
| G1.12 | Hourly mapping | Create product with unit "hour" → select in quote builder | Item type set to "hourly" |
| G1.13 | No picker when no products | Delete all products → open draft quote | Plain "+ Add Item" button shown instead of dropdown |

---

### Phase G2 – Branding & Theme Settings — Done

**Scope:**
- `TenantSettings` model in Prisma (singleton row storing all branding config).
- Settings API routes (`/api/settings`, `/api/settings/logo`).
- Admin-only Settings page in portal with three sections:
  - **Basic (all tiers):** company name, logo URL + size + show-name toggle, primary color, tax labels, locale, currency.
  - **Premium Branding (gated):** full theme palette (secondary/accent, font, background) with color-thief extraction from logo; tagline, phone, website, footer text.
  - **Email Notifications (all tiers):** admin notification address, sender name, sender address.
- `loadTenantConfig()` reads from DB first, falls back to env vars. `getTenantConfig()` (sync) remains for module-level code.

**What was built:**

| Change | Files |
|--------|-------|
| TenantSettings model + migration (including `secondaryColor`, `fontColor`, `backgroundColor`, `logoUrl`, `logoSize`, `showCompanyName`) | `prisma/schema.prisma`, `prisma/migrations/` |
| Async tenant config (DB → env fallback) | `config/tenant.ts` (`loadTenantConfig()` added) |
| All server components updated to use `loadTenantConfig()` | `app/page.tsx`, `app/login/page.tsx`, `app/(portal)/layout.tsx`, `app/q/[token]/page.tsx`, `app/q/[token]/not-found.tsx`, `app/(portal)/quotes/[id]/page.tsx`, `app/api/quotes/[id]/finalise/route.ts`, `lib/email.ts` |
| Settings API (read/update) | `app/api/settings/route.ts` (new) |
| Logo API | `app/api/settings/logo/route.ts` (new) |
| Settings admin page | `app/(portal)/settings/page.tsx` (new), `settings-form.tsx` (new), `quote-preview.tsx` (new) |
| Nav link for admins | `components/portal-nav.tsx` |
| Color utilities | `lib/utils.ts` — `readableFontColor()`, `rgbToHex()`, `resolveLogoHeight()` |
| Color-thief type declarations | `types/color-thief-browser.d.ts` (new) |
| Currency formatting | `public-quote.tsx`, `quote-preview.tsx`, `lib/email.ts` — `Intl.NumberFormat` replaces hardcoded `$` |

**Design decisions:**

| Decision | Chosen | Alternatives considered |
|----------|--------|------------------------|
| Settings storage | Singleton DB row (`TenantSettings`) | JSON file on disk (can't edit via portal, no serverless), env vars only (no self-service) |
| Config loading | DB read per request (Next.js per-render dedup) | In-memory TTL cache (stale data, complexity) |
| Settings UI | Single page with card sections | Tabbed page (extra complexity), wizard (better for onboarding in G4) |
| Theming approach | Inline styles | CSS variables (no SSR), Tailwind arbitrary values (purge issues) |
| Locale options | Curated list canonicalized via `Intl.getCanonicalLocales()` + labelled via `Intl.DisplayNames` | Hardcoded strings (brittle), full enumeration (not available in Intl API) |
| Currency options | `Intl.supportedValuesOf('currency')` + `Intl.DisplayNames` | Hardcoded list (maintenance burden) |
| Logo size | Free-form string — preset tokens (`sm`/`md`/`lg`/`xl`) or numeric px string (`"72"`) | Enum (can't store custom values without migration) |
| Color extraction | `color-thief-browser` (canvas-based, client-only) | Server-side extraction (no canvas), sharp (Node-only) |
| Email notifications tier | All tiers — separate card, never gated | Premium-only (blocks basic users from configuring their notification inbox) |
| Premium Branding card | Merged theme colors + company info into one gated card | Separate cards with separate toggles (confusing, two toggles for one plan gate) |

#### Phase G2 test plan

| # | Test | Pass criteria |
|---|------|---------------|
| G2.1 | Build passes | `npx next build` succeeds |
| G2.2 | Settings page loads (admin) | Log in as admin → navigate to `/settings` → page renders with current values |
| G2.3 | Settings page blocked (sales) | Log in as sales → navigate to `/settings` → redirected to `/dashboard` |
| G2.4 | Save company name | Change company name → Save → refresh portal | Nav and login page show new name |
| G2.5 | Save primary color | Change primary color → Save → open public quote page | Header uses new color |
| G2.6 | Save tax labels | Change tax labels → Save → open quote builder | New labels shown |
| G2.7 | Logo URL | Set logo URL → Save → open public quote page | Logo displayed in header at configured size |
| G2.8 | Logo size presets | Change logo size to Small/Medium/Large/XL → Save → preview | Logo renders at correct height |
| G2.9 | Custom logo size | Enter custom px value → Save → preview | Logo renders at specified pixel height |
| G2.10 | Show company name | Enable "show company name" → Save → public quote | Both logo and name appear in header |
| G2.11 | Premium gating | With `premiumBranding: false` → Premium Branding card fields are greyed out and not editable |
| G2.12 | Premium theme colors | Enable premium → extract palette from logo → assign colors → Save → public quote + portal sidebar reflect palette |
| G2.13 | Premium company info | Enable premium → set tagline, phone, website → Save → public quote shows them in header |
| G2.14 | Email notifications (all tiers) | With `premiumBranding: false` → Email Notifications card is fully editable |
| G2.15 | Admin notification email | Change admin email → accept a quote → notification sent to new address |
| G2.16 | Locale selector | Change locale → Save → public quote dates format per selected locale |
| G2.17 | Currency selector | Change currency to EUR → Save → public quote and email show € amounts |
| G2.18 | Quote preview | Click "Preview" in Settings → modal shows quote using current (unsaved) settings |
| G2.19 | Env var fallback | Delete TenantSettings row from DB → app still works using env var defaults |
| G2.20 | DB error fallback | Simulate DB error → `loadTenantConfig()` returns env var defaults (no crash) |

---

### Phase G3 – Genericize Docs — Done

**Scope:**
- Removed all Boss Security hardcoding from source files (completed in G0, verified in G3).
- Removed `accentColor` from `ARCHITECTURE.md` config table and `PRODUCT-PLAN.md` interface examples (field removed from code; DB column harmlessly retained).
- All docs describe the generic product. Boss Security references in Phase 0 planning sections remain as historical context only.
- Webhook documented as generic inbound lead integration (not WordPress-specific).

**Depends on:** Phases G0–G2.

#### Phase G3 test plan

| # | Test | Pass criteria |
|---|------|---------------|
| G3.1 | No Boss Security in source files | `grep -r "Boss Security" --include="*.ts" --include="*.tsx" --include="*.prisma"` returns empty |
| G3.2 | No accentColor in live code | `grep -r "accentColor\|ACCENT_COLOR" --include="*.ts" --include="*.tsx"` returns empty |
| G3.3 | Docs are self-contained | A new developer can read README + ARCHITECTURE without needing Boss Security context |

---

### Phase G4 – Quote Templates — Done

**Scope (multi-tenant on hold):**
- Quote templates: admin manages a library of reusable line-item sets. Sales reps can load a template when building a quote to pre-fill all line items at once.
- "Save as template" button on the quote detail page.
- Onboarding wizard, CSV import, custom domain support: deferred.
- Multi-tenant schema prep: on hold (not planned for this phase).

**Depends on:** Phases G0–G3.

**What was built:**

| Change | Files |
|--------|-------|
| QuoteTemplate + QuoteTemplateItem models + migration | `prisma/schema.prisma`, `prisma/migrations/20260405164545_add_quote_templates/` |
| List/create API | `app/api/templates/route.ts` (new) |
| Get/edit/delete API | `app/api/templates/[id]/route.ts` (new) |
| Templates admin page | `app/(portal)/templates/page.tsx` (new), `template-management.tsx` (new) |
| "Load Template" picker in quote builder | `app/(portal)/quotes/[id]/page.tsx`, `quote-detail.tsx` |
| "Save as Template" on quote detail | `app/(portal)/quotes/[id]/quote-detail.tsx` |
| Nav link for admins | `components/portal-nav.tsx` |

**Design decisions:**

| Decision | Chosen | Alternatives considered |
|----------|--------|------------------------|
| Template storage | Separate `QuoteTemplate` + `QuoteTemplateItem` models | Adding a "favourite" flag to quotes (bloats quote model, no admin-only control) |
| Load UX | "Load Template" dropdown in draft builder | Modal picker (heavier UX, same result) |
| Save-from-quote UX | "Save as Template" inline form on quote detail | Redirect to templates page (breaks flow) |
| Schedule in templates | Not stored (user adds after loading) | Storing schedule (stale dates; unclear UX) |

#### Phase G4 test plan

| # | Test | Pass criteria |
|---|------|---------------|
| G4.1 | Build passes | `npx next build` succeeds |
| G4.2 | Templates page loads (admin) | Log in as admin → `/templates` → page renders |
| G4.3 | Templates page blocked (sales) | Log in as sales → `/templates` → redirected to `/dashboard` |
| G4.4 | Create template | Admin → Templates → New Template → fill name + items → Save | Template appears in list |
| G4.5 | Edit template | Click Edit → change name/items → Save | Changes reflected |
| G4.6 | Delete template | Click Delete → confirm | Template removed from list |
| G4.7 | Load template in quote builder | Open draft quote → select template from picker → all line items pre-filled |
| G4.8 | Items are editable after load | Load template → modify a line item → Save quote | Modified items saved correctly |
| G4.9 | Save as template | Open any quote → "Save as Template" → name it | Template created with quote's line items |
| G4.10 | No templates = no picker | Delete all templates → open draft quote → "Load template" button hidden |

---

## Priorities

### Must-have (launch)
- Webhook, portal (list + status), unique link + copy, public page (view, sign, accept), emails on accept, dashboard totals, auth, admin user creation.

### Must-have (generic product)
- Tenant config (G0 — done), product catalog (G1), branding settings (G2).

### Should-have
- Profile photo on quote page, configurable default message template, quote list filters/search/sort (Phase 4).

### Could-have
- Email verification before signing, mobile app, onboarding wizard, CSV import, quote templates, multi-tenant, custom domains.

Do not defer must-haves to optional phases. Phase 5 and G4 are explicitly optional and can be deprioritised.

---

For **what** to build, see [REQUIREMENTS.md](REQUIREMENTS.md). For **how** to build it, see [ARCHITECTURE.md](ARCHITECTURE.md). For the **genericization roadmap**, see [PRODUCT-PLAN.md](PRODUCT-PLAN.md).
