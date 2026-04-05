# Quote Management System – Strategy

**Version:** 3.0  
**Last Updated:** March 2026  
**Related docs:** [REQUIREMENTS.md](REQUIREMENTS.md) | [ARCHITECTURE.md](ARCHITECTURE.md) | [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md)

This document defines **phasing**, **priorities**, **build order**, **test plans**, and **how AI agents should use** the three docs. It keeps implementation order and scope clear.

---

## Table of Contents

1. [How to Use These Documents](#how-to-use-these-documents)
2. [Prerequisites: Profile pictures and profile edit](#prerequisites-profile-pictures-and-profile-edit)
3. [Phasing](#phasing)
   - [Phase 1 – Foundation](#phase-1--foundation)
   - [Phase 2 – Portal core](#phase-2--portal-core)
   - [Phase 3 – Public quote and accept](#phase-3--public-quote-and-accept)
   - [Phase 4 – Dashboard and polish](#phase-4--dashboard-and-polish)
   - [Phase 5 – Mobile (optional)](#phase-5--mobile-optional)
3. [Priorities](#priorities)
4. [Tech Stack Reconsideration](#tech-stack-reconsideration)


---

## How to Use These Documents

| Document | When to use |
|----------|-------------|
| **REQUIREMENTS.md** | Before implementing a feature: check scope and acceptance criteria. Do not add behaviour that conflicts with [Out of scope](REQUIREMENTS.md#out-of-scope). |
| **ARCHITECTURE.md** | When adding APIs, pages, or integrations: follow components, contracts (e.g. webhook payload), and tech stack. Place code in the correct directory per [File layout](ARCHITECTURE.md#file-layout). |
| **STRATEGY.md** | When planning work: follow the phase order, build steps, and test plan. Do not pull scope from REQUIREMENTS into an earlier phase unless the phase is explicitly updated. |

**Workflow for agents:** Requirements (what) → Architecture (how) → Strategy (order). If in doubt, resolve with REQUIREMENTS first, then ARCHITECTURE, then STRATEGY.

---

## Prerequisites: Profile pictures and profile edit

Before implementing profile photo upload, Profile Edit, and admin edit-user photo, complete the following. Use this checklist when starting the work; tick items as done.

### Environment and storage

- [ ] **Cloudflare R2 bucket** created (e.g. `quote-portal-assets` or `profile-photos`). Note: R2 does not provide a public URL by default; use either a custom domain + public bucket, or generate presigned/signed URLs for read access.
- [ ] **Env vars** in `.env.local`: `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Optional: `R2_PUBLIC_URL` or base URL if using a public bucket or CDN for photo URLs.
- [ ] **CORS** on the R2 bucket (if uploading from the browser) or ensure uploads go via the Next.js API route only (recommended: server-side upload only).

### Backend

- [ ] **`lib/storage.ts`** (or equivalent): helper to upload a file to R2 (e.g. `uploadProfilePhoto(buffer, key, contentType)`) and return the URL to store in `User.photoUrl`. Decide key format (e.g. `profiles/{userId}/{timestamp}.jpg`) and whether to delete/replace previous photo when user uploads a new one.
- [ ] **`POST /api/upload`** (or `POST /api/upload/profile-photo`): authenticated; accepts `multipart/form-data` with an image file; validates type/size (e.g. image/jpeg, image/png; max 2–5 MB); uploads to R2 via `lib/storage`; returns `{ url: string }` for the client to send as `photoUrl` in PATCH. Document request/response and error codes (400, 413, 401).
- [ ] **`PATCH /api/users/[id]`**: add `photoUrl` to the update schema (optional string); include in `userSelect` in the response. Admin-only; already exists — extend only.
- [ ] **`PATCH /api/users/me`** (or `PUT /api/users/me/photo`): new endpoint so the current user can update **only** their own `photoUrl` (and optionally clear it). Validate session; allow only `photoUrl` in body (no name, email, role, etc.). Return updated user or `{ photoUrl }`.

### Frontend

- [ ] **Profile page:** Add an **Edit** button (or "Edit profile" section). When clicked, show a form/section that allows **profile picture only**: current photo preview (or placeholder), file input (or drag-and-drop), "Upload" / "Save", and optional "Remove photo". On save: call upload API if file selected, then PATCH `/api/users/me` with the new `photoUrl` (or clear). No fields for name/title for non-admin (and for admin on own profile, same — name/title edited in Users section only).
- [ ] **Users section (admin):** In the **Create user** form, add optional profile photo upload (file input → upload API → pass returned URL as `photoUrl` in POST body when creating user). In the **Edit user** form, add current photo preview + upload/remove; on save, include `photoUrl` in PATCH body. Ensure `photoUrl` is included in the user type and displayed in the list/detail where appropriate.

### Docs and tests

- [ ] **ARCHITECTURE.md** file layout: ensure `app/api/upload/route.ts` and `lib/storage.ts` are listed; add `app/api/users/me/route.ts` (or `me/photo`) if created.
- [ ] **Run Phase 1 tests 1.14–1.16** after implementation: Profile Edit button visible; non-admin can change photo only; admin can edit user including photo in Users section.

---

## Phasing

Each phase delivers a testable slice. Build steps are sequential within a phase. The test plan at the end of each phase defines "done".

---

### Phase 1 – Foundation

**Scope:**
- Auth for sales and admin (login, session, roles).
- Admin-only: create/disable/delete users.
- User profile: name, title, profile photo (storage and API).
- Backend and DB schema: users, quote requests, quotes, link token, audit fields.
- Webhook endpoint and payload contract for WordPress; document for WordPress team.
- **Deliverable:** WordPress can submit quote requests; portal can log in; admin can manage users and profiles.

#### Phase 1 build order

Build these sequentially. Each step produces a testable result.

1. **Project scaffold:** `npx create-next-app` with TypeScript, Tailwind, App Router. Install Prisma, shadcn/ui, Zod, NextAuth. Verify `npm run dev` runs on `localhost:3000`.
2. **Database schema + Prisma:** Define schema in `prisma/schema.prisma` (users, quote_requests, quotes, tokens, audit). Connect to Supabase. Run `npx prisma migrate dev`. Verify tables exist in Supabase dashboard.
3. **Auth (login + roles):** Configure NextAuth with credentials provider and roles (ADMIN, SALES). Build login page at `app/login/page.tsx`. Protect portal routes in `app/(portal)/layout.tsx`.
4. **Webhook endpoint:** Create `app/api/webhooks/quote-request/route.ts`. Validate payload with Zod, verify HMAC signature, create record in DB.
5. **Quote list page:** Create `app/(portal)/quotes/page.tsx` + `app/api/quotes/route.ts`. Display quote requests from DB in the portal. First end-to-end feature: webhook creates data, portal displays it.
6. **User management (admin):** Create `app/(portal)/users/page.tsx` + `app/api/users/route.ts`. Admin-only: list users, create new user with name/title/photo. Add `app/api/users/[id]/route.ts`: PATCH (edit user: name, email, title, role, optional password, **photoUrl**, active) and DELETE (soft-delete: set active false). Upload photo to R2 via `app/api/upload/route.ts`. Portal UI: Edit and Delete (with confirmation) per user; **Edit** allows admin to change all user details including profile picture; prevent admin from deleting self.
7. **Profile / change password:** Add `app/(portal)/profile/page.tsx` and `app/api/users/me/password/route.ts`. Any logged-in user can change their password (current password + new password); link from portal nav. **Profile edit:** Profile section has an **Edit** button for all users. **Non-admin:** can edit **profile picture only** (e.g. POST to upload + PATCH `/api/users/me` to set photoUrl, or dedicated `/api/users/me/photo`). **Admin:** on their own Profile page, same — profile picture only; full edit of any user (including self) is in the Users section.

#### Phase 1 test plan

| # | Test | Method | Pass criteria |
|---|------|--------|---------------|
| 1.1 | App starts | `npm run dev` → open `localhost:3000` | Page renders without errors |
| 1.2 | DB tables exist | `npx prisma migrate dev` → check Supabase dashboard | All tables (users, quote_requests, quotes) visible with correct columns |
| 1.3 | Login works | Browser: go to `/dashboard` without session | Redirected to `/login` |
| 1.4 | Login with valid credentials | Browser: enter admin email + password on `/login` | Redirected to portal; session created |
| 1.5 | Role enforcement | Log in as SALES user → navigate to `/users` | Access denied or page hidden |
| 1.6 | Webhook — valid payload | `curl -X POST localhost:3000/api/webhooks/quote-request -H "Content-Type: application/json" -H "X-Webhook-Signature: <valid>" -d '{"name":"John","email":"john@test.com"}'` | 201 response; row in quote_requests table |
| 1.7 | Webhook — missing required field | Same curl without `name` field | 400 response with validation error |
| 1.8 | Webhook — invalid signature | Same curl with wrong `X-Webhook-Signature` | 401 response |
| 1.9 | Webhook — duplicate idempotency key | Send same payload with same `idempotency_key` twice | Second call returns 200 (not 201); no duplicate row |
| 1.10 | Quote list shows data | Send webhook → log in → go to `/quotes` | New quote request visible in list |
| 1.11 | Admin creates user | Log in as admin → `/users` → create user with name, title, photo | User appears in list; photo uploaded to R2 |
| 1.12 | Admin deletes/disables user | Admin disables a user → that user tries to log in | Login rejected |
| 1.13 | User changes own password | Log in → Profile → change password with correct current password | Success message; can log in with new password |
| 1.14 | Profile has Edit button | Log in as any user → go to Profile | Edit button visible |
| 1.15 | Non-admin edits profile picture only | Log in as SALES → Profile → Edit → change photo | Photo updates; name/title not editable on Profile |
| 1.16 | Admin edits user (all details + photo) | Log in as admin → Users → Edit a user → change name, title, photo | User record and photo updated; photo appears on quote if set |

---

### Phase 2 – Portal core

**Scope:**
- Quote creation/editing from a request; add line items (standard or hourly with schedule), prices, notes; GST and PST rates.
- Status workflow (request → draft → finalised).
- Finalise quote: generate unique link and default message; store in DB.
- Copy button: copy default message (including link) to clipboard.
- **Deliverable:** Sales can see requests, build quotes (including hourly items and GST/PST), finalise, and copy link + message to send manually via Outlook. See [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md) for hourly/schedule and PST.

#### Phase 2 build order

1. **Quote detail page:** Create `app/(portal)/quotes/[id]/page.tsx`. Display full quote request details. Allow sales user to start building a quote from a request.
2. **Quote builder:** Create `components/quote-builder/` components. Add/edit/remove line items (description, quantity, unit price). Real-time subtotal and total calculation. Notes field.
3. **Quote create/update API:** Create `app/api/quotes/[id]/route.ts` (GET, PUT). Save quote with items. Status set to "draft" on first save.
4. **Status workflow:** Implement status transitions (request → draft → finalised). Prevent going backwards. Show status badge on list and detail pages.
5. **Finalise + link generation:** Create `app/api/quotes/[id]/finalise/route.ts`. On finalise: generate cryptographically random token (32 bytes, URL-safe), build public link, store default message template in DB. Return link + message.
6. **Copy to clipboard:** On the quote detail page (after finalise), show the link and default message. "Copy" button uses `navigator.clipboard.writeText()` to copy message + link.

#### Phase 2 test plan

| # | Test | Method | Pass criteria |
|---|------|--------|---------------|
| 2.1 | View quote request detail | Click a request in the list | Detail page shows customer name, email, message, date |
| 2.2 | Create quote from request | Click "Create Quote" on a request | Quote builder opens; status is "draft" |
| 2.3 | Add line items | Add 3 items with quantity and price | Subtotal and total calculate correctly in real time |
| 2.4 | Save draft | Click "Save" on the quote builder | Quote saved; navigate away and back — data persists |
| 2.5 | Edit existing quote | Open a saved draft → change an item → save | Updated values persist |
| 2.6 | Status: draft badge | View quote in list after saving | Shows "draft" status badge |
| 2.7 | Finalise quote | Click "Finalise" on a draft quote | Status changes to "finalised"; unique link and default message appear |
| 2.8 | Link is unguessable | Check generated token in DB | Token is 32+ bytes, URL-safe, not sequential |
| 2.9 | Cannot edit finalised quote | Open a finalised quote → try to edit | Edit controls disabled or hidden |
| 2.10 | Copy button works | Click "Copy" on the finalised quote | Paste in text editor: message contains the correct link |
| 2.11 | Default message content | Inspect copied message | Contains customer name, quote number, and the unique link |
| 2.12 | Hourly line item — add schedule | Create draft → add item → set Billing to "Hourly" → add schedule row (start/end date and time) → save | Schedule saved; quantity shows as total hours (e.g. 14.5 hrs); line subtotal = hours × rate |
| 2.13 | Hourly — overnight span | Add schedule row: e.g. March 6 17:30 to March 7 08:00 | Server computes 14.5 hrs; displayed in hours breakdown and line total |
| 2.14 | Hourly — multiple shifts | Add 2+ schedule rows with different dates/times | Total hours = sum of row hours; quantity and subtotal correct after save |
| 2.15 | GST and PST on quote | Set GST % and PST % on draft → save | Subtotal, GST amount, PST amount, and total persist; total = subtotal + GST + PST |
| 2.16 | Mixed line items | Add one Standard item (qty × price) and one Hourly item (schedule × rate) → save | Both items persist; subtotal and totals correct; finalise succeeds |

---

### Phase 3 – Public quote and accept

**Scope:**
- Public page by unique link (no login): branded, styled HTML page.
- Company branding, full quote details (including hourly schedule breakdown and GST/PST), sales rep name/title/photo.
- Browser print-to-PDF via `@media print` CSS.
- Typed signature to accept: name + title inputs, checkbox, "Accept Quote" button.
- On accept: store signature data, set status, send email via Resend to admin and sales rep.
- **Deliverable:** Customer can open link, view branded quote (with schedule and tax breakdown), print/download, type name to accept; admin and sales rep get notified.

#### Phase 3 build order

1. **Public quote page:** Create `app/q/[token]/page.tsx`. Server-side render: look up quote by token from DB. Display full quote details (items, totals, notes). Show sales rep name, title, and profile photo. Add company branding (logo, colours).
2. **Print-to-PDF styling:** Add `@media print` CSS. Hide accept form, navigation, and non-essential UI. Ensure clean layout: margins, page breaks, branding, sales rep info. Test with browser print preview.
3. **Accept form component:** Create `components/accept-form.tsx`. Two text inputs (name, title), checkbox ("I accept this quote"), "Accept Quote" button. Client-side validation with Zod.
4. **Accept API route:** Create `app/api/quotes/[id]/accept/route.ts`. Validate signature data, store in DB (signedBy, title, timestamp, IP address, emailVerified=false). Update quote status to "accepted". Trigger emails.
5. **Email notifications:** Create `lib/email.ts` using Resend SDK. On accept: send email to admin and to the sales rep. Email contains: quote number, customer name, accepted date, link to portal. Use Resend test mode during development.
6. **Invalid/expired link handling:** If token not found → show 404 page. If quote already accepted → show "already accepted" message with date. If quote expired → show "quote expired" message.

#### Phase 3 test plan

| # | Test | Method | Pass criteria |
|---|------|--------|---------------|
| 3.1 | Public page renders | Open `/q/[valid-token]` in incognito (no login) | Quote details visible: items, totals, notes, sales rep info |
| 3.2 | Sales rep info shows | Check the public page | Name, title, and profile photo of the sales rep who finalised the quote are displayed |
| 3.3 | Company branding | Check the public page | Logo, company name, and brand colours visible |
| 3.4 | Print-to-PDF clean | Click "Download/Print" → browser print dialog → preview | Accept form hidden; branding clean; sales rep info visible; line items and totals formatted |
| 3.5 | Accept — valid | Type name + title, check "I accept", click "Accept Quote" | Success message; DB: status = accepted, signature data stored |
| 3.6 | Accept — missing name | Leave name blank, click "Accept Quote" | Validation error shown; form not submitted |
| 3.7 | Accept — checkbox unchecked | Fill name + title but don't check "I accept" | Validation error; form not submitted |
| 3.8 | Email to admin | Accept a quote → check admin's inbox | Email received with quote number, customer name, date, portal link |
| 3.9 | Email to sales rep | Accept a quote → check sales rep's inbox | Same email content as admin |
| 3.10 | Status in portal | Accept a quote → log into portal → view quotes | Quote shows "accepted" status badge |
| 3.11 | Invalid token | Open `/q/invalid-token-123` | 404 or "quote not found" page |
| 3.12 | Already accepted | Open a quote link that was already accepted | "This quote has already been accepted on [date]" message |
| 3.13 | Accept stores IP | Accept a quote → check DB | Signature record includes IP address and timestamp |
| 3.14 | Hourly quote — schedule breakdown | Finalise a quote with an hourly line item (schedule) → open public link | Description shows start/end date and time per shift, hours per row, and "Total hours — X hrs" |
| 3.15 | Hourly quote — rate and amount | Check public page for hourly item | Qty column shows "X hrs"; unit price shows "$Y/hr"; amount matches stored subtotal |
| 3.16 | GST and PST on public quote | Open public link for quote with GST and PST set | Subtotal, "GST @ X%", "PST (MB) @ Y%", and Total displayed; amounts match DB |
| 3.17 | Print includes schedule and tax | Quote with hourly + GST/PST → print preview | Schedule breakdown and GST/PST lines visible in print layout |

---

### Phase 4 – Dashboard and polish

**Scope:**
- Dashboard with current month Estimate total and Accepted total.
- Quote list with filters (status, date, search).
- UX polish, error handling, loading states.
- Email verification before signing (optional).
- **Deliverable:** Dashboard reflects monthly totals and quote status; app is ready for launch.

#### Phase 4 build order

1. **Dashboard page:** Create `app/(portal)/dashboard/page.tsx`. Query DB for current month: sum of finalised/sent quote totals (Estimate total), sum of accepted quote totals (Accepted total). Display as prominent cards/numbers.
2. **Dashboard widgets:** Create `components/dashboard/` components. Recent activity feed (latest quotes and status changes). Quick stats: quotes this month, conversion rate (accepted / finalised).
3. **Quote list: filter, search, and sort:** Add filter, search, and sort controls to `app/(portal)/quotes/page.tsx`.
   - **Filter** on every visible column: status, customer name, email, phone, service, cities/site, quote number, total, assigned sales rep, date range (created, finalised, accepted).
   - **Search** by free-text across customer name, email, quote number, service, and cities.
   - **Sort** (ascending / descending) on any column: customer name, status, quote number, total, date created, date finalised, date accepted, sales rep. Default sort: newest first (date created descending).
4. **Error handling and loading states:** Add loading skeletons for pages. Error boundaries for API failures. Friendly error pages (404, 500). Toast notifications for actions (saved, copied, accepted).
5. **Email verification before signing (optional):** If time permits: add admin toggle (global or per-quote). On accept: send 6-digit code to customer email via Resend. Customer enters code before accept form submits. API: `POST /api/quotes/[id]/verify-email` (send code), `POST /api/quotes/[id]/accept` (verify code + accept). DB: add `verification_code` hash + expiry column.

#### Phase 4 test plan

| # | Test | Method | Pass criteria |
|---|------|--------|---------------|
| 4.1 | Estimate total correct | Create 3 finalised quotes ($1000, $2000, $3000) this month | Dashboard shows Estimate total: $6,000 |
| 4.2 | Accepted total correct | Accept 2 of the 3 quotes ($1000, $2000) | Dashboard shows Accepted total: $3,000; Estimate stays $6,000 |
| 4.3 | Month scoping | Create a quote last month (backdate in DB) | Last month's quote does NOT appear in current month totals |
| 4.4 | Filter by status | Click "Accepted" filter on quote list | Only accepted quotes shown |
| 4.5 | Filter by date range | Set date range to last 7 days | Only quotes from last 7 days shown |
| 4.6 | Filter by service | Select a service value in filter | Only quotes with that service shown |
| 4.7 | Filter by cities/site | Select a city in filter | Only quotes matching that city shown |
| 4.8 | Filter by sales rep | Select a sales rep in filter | Only quotes assigned to that rep shown |
| 4.9 | Filter by total range | Set min/max total | Only quotes within that range shown |
| 4.10 | Search by customer name | Type a customer name in search | Only matching quotes shown |
| 4.11 | Search by email | Type an email in search | Only matching quotes shown |
| 4.12 | Search by quote number | Type a quote number in search | Matching quote shown |
| 4.13 | Search by service or city | Type a service name or city in search | Matching quotes shown |
| 4.14 | Sort by date created (default) | Load quote list with no sort selected | Quotes sorted newest first |
| 4.15 | Sort ascending / descending | Click a column header to toggle sort | List re-orders correctly |
| 4.16 | Sort by total | Click "Total" column header | Quotes sorted by total amount |
| 4.17 | Sort by customer name | Click "Customer" column header | Quotes sorted alphabetically by name |
| 4.18 | Combined filter + sort | Filter by status "Draft" then sort by total desc | Only drafts shown, sorted by highest total first |
| 4.19 | Loading states | Throttle network in browser DevTools | Loading skeleton/spinner visible before data appears |
| 4.20 | API error handling | Temporarily break DB connection → load dashboard | Friendly error message, not a white screen or stack trace |
| 4.21 | 404 page | Navigate to `/nonexistent-page` | Styled 404 page, not default Next.js error |
| 4.22 | Toast on copy | Finalise a quote → click "Copy" | Toast notification: "Copied to clipboard" |
| 4.23 | Email verify — code sent (optional) | Enable verify-to-sign → customer clicks accept | Email with 6-digit code received |
| 4.24 | Email verify — correct code (optional) | Enter correct code | Accept proceeds normally |
| 4.25 | Email verify — wrong code (optional) | Enter wrong code | Error: "Invalid code"; accept blocked |
| 4.26 | Email verify — expired code (optional) | Wait past expiry → enter code | Error: "Code expired"; option to resend |

---

### Phase 5 – Mobile (optional)

**Scope:**
- Mobile app (React Native + Expo) calling the same Next.js API routes.
- Portal flows on mobile (list, quote detail, finalise, copy link); optionally public quote view.
- **Deliverable:** Mobile parity for sales team (and optionally customer-facing quote view).

#### Phase 5 build order

1. **Expo scaffold:** `npx create-expo-app`. Configure navigation (React Navigation). Set up API client pointing to the Vercel-hosted API routes.
2. **Auth on mobile:** Login screen. Store JWT/session token securely (expo-secure-store). Protect app routes.
3. **Quote list screen:** Fetch from `/api/quotes`. Display list with status badges. Pull-to-refresh.
4. **Quote detail screen:** View quote details. Finalise button. Copy link + message to clipboard.
5. **Polish:** Push notifications for quote accepted (optional). App icons and splash screen.

#### Phase 5 test plan

| # | Test | Method | Pass criteria |
|---|------|--------|---------------|
| 5.1 | Mobile login | Open app → enter credentials | Logged in; quote list visible |
| 5.2 | Quote list loads | Pull to refresh | Same data as web portal |
| 5.3 | Quote detail | Tap a quote | Detail screen shows items, totals, status |
| 5.4 | Finalise from mobile | Tap "Finalise" on a draft | Link generated; copy button visible |
| 5.5 | Copy link on mobile | Tap "Copy" → open Notes or Outlook | Message + link pasted correctly |

---

## Priorities

- **Must-have for launch:** Webhook, portal (list + status), unique link + copy, public page (view, sign, accept), emails on accept, dashboard totals (Estimate + Accepted), auth, admin user creation.
- **Should-have:** Profile photo on quote page, configurable default message template.
- **Could-have:** Email verification before signing, mobile app, extra analytics.

Do not defer must-haves to Phase 5. Phase 5 is explicitly optional and can be deprioritised.

---

## Tech Stack Reconsideration

- The earlier design (v1.0) assumed a monorepo with separate backend API, Next.js frontend, and React Native mobile.
- Java/Spring Boot was considered (project lead's primary language) but rejected in favour of **TypeScript/Node.js** due to 4-6x lower memory usage, faster cold starts, $0 hosting cost on Vercel serverless, and one language across backend, frontend, and mobile. Full trade-off analysis is in [ARCHITECTURE.md — Why TypeScript over Java](ARCHITECTURE.md#why-typescript-over-javaspringboot).
- A separate backend (Express/Fastify on Railway/Render) was considered but rejected in favour of **a single Next.js app on Vercel** — one project, one deploy, $0 hosting, one framework to learn. API routes serve as the backend.
- Server-side PDF generation (Puppeteer, react-pdf) was considered but rejected in favour of **browser print-to-PDF** — eliminates Chromium binary, serverless timeout risk, and bundle-size issues. The public quote page is a styled HTML page; the customer prints/saves it as PDF.
- **ARCHITECTURE.md** now records the **confirmed** stack: Next.js on Vercel, Supabase (PostgreSQL), Cloudflare R2, browser print-to-PDF, Resend for email. Total cost: **$0/month** at current volume.

### Learning-curve mitigation

The project lead is a Java/Spring Boot developer learning TypeScript. To ensure code quality and understanding:

- A Cursor rule (`.cursor/rules/document-before-implementing.mdc`) enforces that every design decision is **documented with pros/cons** and **explained** before code is written.
- All modules, services, and non-trivial functions must have doc comments explaining purpose and rationale.
- API endpoints must document request/response shapes, status codes, and error cases.
- When implementation changes a design decision, agents must update ARCHITECTURE.md or STRATEGY.md accordingly.

---

For **what** to build, see [REQUIREMENTS.md](REQUIREMENTS.md). For **how** to build it, see [ARCHITECTURE.md](ARCHITECTURE.md).
