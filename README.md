# Quote Management System

Internal sales portal for **Boss Security** (bosssecurity.ca). Manages the full quote lifecycle: inbound leads → quote building → finalisation → customer acceptance → dashboard reporting.

---

## Agent orientation

Before implementing anything, read the three docs in order:

1. **[docs/REQUIREMENTS.md](docs/REQUIREMENTS.md)** — what the system must do; acceptance criteria and out-of-scope list
2. **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it is built; tech stack, API contracts, file layout, design decisions
3. **[docs/STRATEGY.md](docs/STRATEGY.md)** — build order, phase scope, test plans

> Rule: Requirements (what) → Architecture (how) → Strategy (order). If in doubt, resolve conflicts in that order.

Additional design docs:
- **[docs/DESIGN-hourly-service-and-pst.md](docs/DESIGN-hourly-service-and-pst.md)** — hourly line items, schedule JSON shape, PST, server-side calculation rules
- **[.cursor/rules/](.cursor/rules/)** — Cursor rules enforced during development (document before implementing, server-side calculations)

---

## Tech stack

| Layer | Technology |
|---|---|
| App + API | Next.js 16 (App Router) — single deploy on Vercel |
| Language | TypeScript everywhere |
| Database | PostgreSQL on Supabase |
| ORM | Prisma 7 (generated client output: `generated/prisma/`) |
| Auth | NextAuth v4 — credentials provider, ADMIN / SALES roles |
| Email | Resend |
| Storage | Cloudflare R2 — profile photos |
| UI | Tailwind CSS v4 + shadcn/ui |
| Validation | Zod |

---

## Architecture overview

Single Next.js app. No separate backend.

- `app/api/` — serverless API routes (Vercel functions locally via `npm run dev`)
- `app/(portal)/` — authenticated portal pages (route group; layout applies auth guard)
- `app/q/[token]/` — public customer-facing quote page (no auth, unique token only)
- `lib/` — shared server-side logic (treat as service layer; imported by API routes and server components)
- `components/` — React client components
- `prisma/` — schema + migrations
- `generated/prisma/` — Prisma-generated client (do not edit manually)
- `docs/` — authoritative design documentation

### End-to-end flow

```
WordPress form
  └─ POST /api/webhooks/quote-request
       └─ QuoteRequest created in DB (status: REQUEST)
            └─ Sales opens portal → creates Quote (status: DRAFT)
                 └─ Sales finalises → unique token generated (status: FINALISED)
                      └─ Customer opens /q/[token]
                           ├─ Accepts → Signature stored, emails sent (status: ACCEPTED)
                           └─ Requests changes → (status: CHANGES_REQUESTED)
```

---

## Data model (prisma/schema.prisma)

| Model | Purpose |
|---|---|
| `User` | Sales reps and admins. `name`, `title`, `photoUrl` appear on the public quote page. Soft-deleted via `active: false`. |
| `QuoteRequest` | Inbound lead from webhook or created manually. `leadSource`: `"website"` (webhook) or `"phone"`, `"referral"`, etc. |
| `Quote` | Built quote. One-to-one with `QuoteRequest`. Statuses: `REQUEST → DRAFT → FINALISED → CHANGES_REQUESTED → ACCEPTED / REJECTED / EXPIRED`. |
| `QuoteItem` | Line item. `itemType`: `"standard"` (qty × unitPrice) or `"hourly"` (schedule JSON → server computes total hours → quantity). |
| `Signature` | Typed e-signature on customer accept. Stores name, title, IP, timestamp. |
| `AuditLog` | Immutable event trail. Actions defined in `lib/constants.ts → AUDIT_ACTION`. |

**Key schema rules:**
- All monetary fields are `Decimal(10,2)`. Cast to `Number()` before sending to client (Prisma returns `Decimal` objects).
- `QuoteItem.schedule` is `Json?` — shape: `{ startDate: string, startTime: string, endDate?: string, endTime?: string }[]`.
- Server always recomputes `quantity`, `subtotal`, `taxAmount`, `pstAmount`, `total` on every PUT. Client values are previews only.

---

## API routes

| Route | Methods | Auth | Purpose |
|---|---|---|---|
| `/api/webhooks/quote-request` | POST | HMAC secret | WordPress form submissions |
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

All reference strings are defined here. Always import from here instead of using raw strings.

- `QUOTE_STATUS` — status enum values
- `QUOTE_STATUS_LABEL` — human-readable labels
- `QUOTE_STATUS_COLOR` — Tailwind badge classes
- `AUDIT_ACTION` — audit log action keys
- `LEAD_SOURCE` — lead origin values
- `SERVICES` / `CITIES` — matches bosssecurity.ca form options
- `EMAIL_FROM` / `EMAIL_ADMIN` — sender and admin inbox addresses

---

## Environment variables

Copy `.env.local` and fill in:

```env
# Supabase PostgreSQL
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Cloudflare R2 (profile photo storage)
R2_ACCOUNT_ID=""
R2_ACCESS_KEY_ID=""
R2_SECRET_ACCESS_KEY=""
R2_BUCKET_NAME=""

# Resend (email notifications)
RESEND_API_KEY=""

# WordPress webhook shared secret (HMAC verification)
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
| 2 | Quote builder, hourly items, GST/PST, finalise, copy link | Done |
| 3 | Public quote page, accept flow, email notifications | Done |
| 4 | Dashboard totals, quote list filter/search/sort, polish | Dashboard done; filter/search/sort TBD |
| 5 | Mobile app (React Native + Expo) | Optional — not started |

See [docs/STRATEGY.md](docs/STRATEGY.md) for per-phase test plans and build order.

---

## Conventions

- **Server components** fetch data from Prisma; pass serialised plain objects (no `Decimal`, no `Date`) to client components.
- **Client components** render UI and call API routes via `fetch`. Never import Prisma directly in a client component.
- **All financial and hour calculations are server-authoritative.** Client-side totals are display previews only.
- **Soft-delete users** — set `active: false`; never hard-delete. Existing quotes remain attributed.
- **Unique quote token** — 32-byte cryptographically random, URL-safe. Generated on finalise. Invalidated on revise.
- New code belongs in the directory matching [ARCHITECTURE.md — File Layout](docs/ARCHITECTURE.md#file-layout).
