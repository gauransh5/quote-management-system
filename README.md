# Quote Management System

A white-label quote lifecycle tool for sales teams. Manages inbound leads → quote building → finalisation → customer acceptance → dashboard reporting. Fully configurable branding, tax labels, and email settings per deployment.

---

## Agent orientation

Before implementing anything, read the docs in order:

1. **[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)** — what the system must do; acceptance criteria and out-of-scope list
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it is built; tech stack, API contracts, file layout, design decisions
3. **[docs/STRATEGY.md](docs/STRATEGY.md)** — build order, phase scope, test plans
4. **[docs/PRODUCT-PLAN.md](docs/PRODUCT-PLAN.md)** — genericization roadmap (product catalog, branding settings, future phases)

> Rule: Requirements (what) → Architecture (how) → Strategy (order). If in doubt, resolve conflicts in that order.

Additional docs:
- **[docs/DESIGN-hourly-service-and-pst.md](docs/DESIGN-hourly-service-and-pst.md)** — hourly line items, schedule JSON shape, tax calculation rules
- **[.claude/rules/](.claude/rules/)** — Claude Code rules (document before implementing, server-side calculations)

---

## Tech stack

| Layer | Technology |
|---|---|
| App + API | Next.js 16 (App Router) — single deploy on Vercel |
| Language | TypeScript everywhere |
| Database | PostgreSQL on Supabase (via connection pooler) |
| ORM | Prisma 7 (generated client output: `generated/prisma/`) |
| Auth | NextAuth v4 — credentials provider, ADMIN / SALES roles |
| Email | Resend (sender configured via tenant config) |
| Storage | Cloudflare R2 — profile photos |
| UI | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |
| Config | `config/tenant.ts` — centralised tenant config from env vars |

---

## Architecture overview

Single Next.js app. No separate backend.

- `config/` — tenant configuration (company name, branding, email, tax labels)
- `app/api/` — serverless API routes (Vercel functions locally via `npm run dev`)
- `app/(portal)/` — authenticated portal pages (route group; layout applies auth guard)
- `app/q/[token]/` — public customer-facing quote page (no auth, unique token only)
- `lib/` — shared server-side logic (treat as service layer)
- `components/` — React client components
- `prisma/` — schema + migrations
- `generated/prisma/` — Prisma-generated client (do not edit manually)
- `docs/` — authoritative design documentation

### End-to-end flow

```
External form / website
  └─ POST /api/webhooks/quote-request (HMAC-signed)
       └─ QuoteRequest created in DB (status: REQUEST)
            └─ Sales opens portal → creates Quote (status: DRAFT)
                 └─ Sales finalises → unique token generated (status: FINALISED)
                      └─ Customer opens /q/[token] (branded with tenant config)
                           ├─ Accepts → Signature stored, emails sent (status: ACCEPTED)
                           └─ Requests changes → (status: CHANGES_REQUESTED)
```

---

## Tenant configuration

All customer-specific values are in `config/tenant.ts`, read from environment variables. See [ARCHITECTURE.md — Tenant Configuration](docs/ARCHITECTURE.md#tenant-configuration) for full details.

Key env vars: `COMPANY_NAME`, `PRIMARY_COLOR`, `ACCENT_COLOR`, `EMAIL_FROM_NAME`, `EMAIL_FROM_ADDRESS`, `EMAIL_ADMIN_ADDRESS`, `TAX1_LABEL`, `TAX2_LABEL`, `LOCALE`, `CURRENCY`.

---

## Data model (prisma/schema.prisma)

| Model | Purpose |
|---|---|
| `User` | Sales reps and admins. `name`, `title`, `photoUrl` appear on the public quote page. Soft-deleted via `active: false`. |
| `QuoteRequest` | Inbound lead from webhook or created manually. `leadSource`: `"website"`, `"phone"`, `"referral"`, etc. |
| `Quote` | Built quote. One-to-one with `QuoteRequest`. Statuses: `REQUEST → DRAFT → FINALISED → CHANGES_REQUESTED → ACCEPTED / REJECTED / EXPIRED`. |
| `QuoteItem` | Line item. `itemType`: `"standard"` (qty × unitPrice) or `"hourly"` (schedule JSON → server computes total hours → quantity). |
| `Signature` | Typed e-signature on customer accept. Stores name, title, IP, timestamp. |
| `AuditLog` | Immutable event trail. Actions defined in `lib/constants.ts → AUDIT_ACTION`. |

**Key schema rules:**
- All monetary fields are `Decimal(10,2)`. Cast to `Number()` before sending to client.
- `QuoteItem.schedule` is `Json?` — shape: `{ startDate, startTime, endDate?, endTime? }[]`.
- Server always recomputes `quantity`, `subtotal`, `taxAmount`, `pstAmount`, `total` on every PUT. Client values are previews only.

---

## API routes

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/quote-request` | POST | HMAC secret | Inbound lead submissions |
| `/api/quotes` | GET, POST | Session | List all / create quote from request |
| `/api/quotes/[id]` | GET, PUT, DELETE | Session | Quote detail / update / delete draft |
| `/api/quotes/[id]/finalise` | POST | Session | Generate token, lock quote |
| `/api/quotes/[id]/accept` | POST | None | Customer accepts (stores signature, sends emails) |
| `/api/quotes/[id]/request-changes` | POST | None | Customer requests changes |
| `/api/quotes/[id]/revise` | POST | Session | Revert finalised quote back to draft |
| `/api/users` | GET, POST | Session (POST: ADMIN) | List / create users |
| `/api/users/[id]` | PATCH, DELETE | Session (ADMIN) | Edit / soft-delete user |
| `/api/users/me/password` | PATCH | Session | Change own password |
| `/api/auth/[...nextauth]` | * | — | NextAuth handlers |
| `/api/quote-requests` | POST | Session | Manually create a lead |

---

## Key constants (lib/constants.ts)

Generic reference strings. Always import from here instead of using raw strings.

- `QUOTE_STATUS` — status enum values
- `QUOTE_STATUS_LABEL` — human-readable labels
- `QUOTE_STATUS_COLOR` — Tailwind badge classes
- `AUDIT_ACTION` — audit log action keys
- `LEAD_SOURCE` — lead origin values

Customer-specific values (company name, email addresses, tax labels) are in `config/tenant.ts`, not here.

---

## Environment variables

Copy `.env.local` and fill in:

```env
# Database (Supabase pooler connection)
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Tenant configuration
COMPANY_NAME="Your Company"
# COMPANY_TAGLINE="Your tagline"
# COMPANY_PHONE="+1 555-000-0000"
# COMPANY_WEBSITE="yourcompany.com"
PRIMARY_COLOR="#000000"
ACCENT_COLOR="#111827"
EMAIL_FROM_NAME="Your Company"
EMAIL_FROM_ADDRESS="noreply@yourcompany.com"
EMAIL_ADMIN_ADDRESS="admin@yourcompany.com"
TAX1_LABEL="GST"
TAX2_LABEL="PST"
LOCALE="en-CA"
CURRENCY="CAD"

# Cloudflare R2 (profile photo storage)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""

# Resend (email notifications)
RESEND_API_KEY=""

# Webhook shared secret (HMAC verification)
WEBHOOK_SECRET="..."
```

---

## Development

```bash
npm install
npm run dev          # Next.js dev server on localhost:3000 (Turbopack)

npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Prisma Studio GUI
```

After any change to `prisma/schema.prisma`:
1. `npm run db:migrate` — applies migration and regenerates client
2. `npm run db:generate` — regenerates types only (no migration)

---

## Build phases

| Phase | Scope | Status |
|---|---|---|
| 1 | Auth, webhook, user management, profiles | Done |
| 2 | Quote builder, hourly items, tax, finalise, copy link | Done |
| 3 | Public quote page, accept flow, email notifications | Done |
| 4 | Dashboard totals, quote list filter/search/sort, polish | Dashboard done; filter/search/sort TBD |
| G0 | Extract tenant config, remove hardcoded values | Done |
| G1 | Product/SKU catalog (self-service) | Pending |
| G2 | Branding & theme settings (portal UI) | Pending |
| G3 | Genericize docs | Pending |
| G4 | Polish & future-proofing (onboarding, templates, multi-tenant prep) | Pending |

See [docs/STRATEGY.md](docs/STRATEGY.md) for per-phase test plans and build order.

---

## Conventions

- **Server components** fetch data from Prisma; pass serialised plain objects (no `Decimal`, no `Date`) to client components.
- **Client components** render UI and call API routes via `fetch`. Never import Prisma directly in a client component.
- **All financial and hour calculations are server-authoritative.** Client-side totals are display previews only.
- **Soft-delete users** — set `active: false`; never hard-delete. Existing quotes remain attributed.
- **Unique quote token** — 32-byte cryptographically random, URL-safe. Generated on finalise. Invalidated on revise.
- **Tenant config** — all customer-specific values flow through `config/tenant.ts`. Never hardcode company names, emails, or branding.
- New code belongs in the directory matching [ARCHITECTURE.md — File Layout](docs/ARCHITECTURE.md#file-layout).
