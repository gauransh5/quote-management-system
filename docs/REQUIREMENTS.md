# Quote Management System – Requirements

**Version:** 1.0  
**Last Updated:** March 2026  
**Related docs:** [ARCHITECTURE.md](ARCHITECTURE.md) | [STRATEGY.md](STRATEGY.md) | [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md)

This document is the single source of truth for **what** the system must do. AI agents should use it for scope and acceptance criteria before implementing any feature.

---

## Table of Contents

1. [Business Workflow](#business-workflow)
2. [User Roles and Capabilities](#user-roles-and-capabilities)
3. [Functional Requirements](#functional-requirements)
4. [Non-Functional Requirements](#non-functional-requirements)
5. [Out of Scope](#out-of-scope)
6. [Traceability](#traceability)

---

## Business Workflow

End-to-end flow:

1. **Customer submits form** on the existing WordPress website.
2. **Quote request reaches the portal** (form POSTs to our webhook; system creates a quote request).
3. **Portal shows the status of each quote** (request, draft, finalised, sent, viewed, accepted, rejected).
4. **Once quote is finalised**, the system generates a **unique link** that redirects to the generated quote.
5. **Customer** (via link): views quote, has option to **download** and **sign** the quote; quote is **accepted**.
6. **After acceptance:** system triggers email to **admin** and to the **sales team member**; status is updated on the dashboard.

The dashboard shows, for the **current month**, an **Estimate Total** and an **Accepted Total** value of all quotes.

---

## User Roles and Capabilities

| Role | Capabilities |
|------|--------------|
| **Sales team** | Login; view/create/edit quotes; see own (or team) quotes; generate unique link and default message; copy link + message to clipboard; no user creation. |
| **Admin** | Everything sales has; **create/delete/manage users** (e.g. new sales users); view aggregate data (e.g. monthly Estimate Total and Accepted Total). |
| **Customer (end user)** | No login; access **only via unique link** — view quote, download PDF, sign, accept. |

---

## Functional Requirements

Prioritised list. Each item should be traceable to the [Business Workflow](#business-workflow) and [User Roles](#user-roles-and-capabilities).

### Quote request ingestion

- Webhook endpoint accepts POST from WordPress form.
- Incoming payload is mapped to a “quote request” (or draft quote) in the portal.
- Idempotency and duplicate handling as needed (e.g. idempotency key in payload).

### Portal quote list

- List all quotes with status: e.g. request, draft, finalised, sent, viewed, accepted, rejected.
- **Filter** on every visible column: status, customer name, email, phone, service, cities/site, quote number, total, assigned sales rep, and date range (created, finalised, accepted).
- **Search** by free-text across customer name, email, quote number, service, and cities.
- **Sort** on any column (ascending / descending): customer name, status, quote number, total, date created, date finalised, date accepted, sales rep.
- Dashboard can scope to current month for totals.

### Quote finalisation and sharing

- **Finalise quote** → system generates a unique, unguessable link; stores link and optional default message.
- **Share flow:** Portal displays the link and default message; a **“Copy”** button copies the message (including the link) so the sales team can paste into Outlook and send **manually** (system does not send the quote email).
- **Quote line items** can be **standard** (quantity × unit price) or **hourly** (schedule of date/time ranges × hourly rate). Hourly items store a schedule; the server computes total hours and line total. See [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md).
- **Tax:** Quotes support **GST** and **PST** (e.g. GST 5%, PST 7%). Totals are computed server-side (subtotal + GST + PST).

### Public quote page (by link)

- Customer opens unique link (no login).
- Page is a **branded, styled HTML page** showing the full quote details (including line-item schedule breakdown for hourly services, and GST/PST when applicable), company branding, and the **name, title, and profile photo** of the sales team member who generated the quote.
- **Download/Print:** Customer can use browser print-to-PDF (`@media print` CSS) to save the quote. The printed version is cleanly formatted with branding and sales rep details.
- **Accept flow:** At the bottom of the page, customer types their **name** and **title** (plain text inputs), checks an "I accept" checkbox, and clicks **"Accept Quote"**. No canvas/drawn signature — typed name is the electronic signature.
- **Email verification before signing (optional):** If enabled, the system sends a one-time code to the customer's email before they can submit the accept form. Customer enters the code to prove they control the email address on the quote. This is configurable per quote or globally by admin — not required for MVP but should be supported.
- On accept: set status to accepted; store signature data (name, title, timestamp, IP, and whether email was verified); send email to admin and to the sales team member; update dashboard status.

### Dashboard

- For the **current month**: **Estimate Total** (e.g. sum of finalised/sent quote totals) and **Accepted Total** (sum of accepted quote totals).
- List or summary of quotes (with filters as above).

### Authentication and user management

- Login for sales team and admin.
- **Admin only:** create, edit, and delete/disable users (in the **Users** section). Create: name, email, password, title, role, optional profile photo. **Edit:** update name, email, title, role, optional new password, **profile photo**, or set active/inactive. Delete: soft-delete (set user inactive so they cannot log in); existing quotes remain attributed to the user.

### User profile

- Sales and admin users have **name**, **title**, and **profile photo** (used on the public quote page and optionally in the portal).
- **Profile section** (for the logged-in user) has an **Edit** button for all users.
  - **Non-admin users:** can edit **profile picture only** (upload/change/remove); name and title are not editable on Profile (admin can change them in the Users section if needed).
  - **Admin users:** can edit **profile picture only** on their own Profile page; to change their own name, email, title, or role they use the Users section (editing their own row) or the same edit capabilities as for other users.
- Admin edits **all** user details (including profile picture) only in the **Users** section, not on the Profile page of another user.

---

## Non-Functional Requirements

- **Security:** Authentication and role-based access; secure unique links; no sensitive data in URL path.
- **Availability / performance:** Define targets (e.g. webhook SLA, portal response time); document in ARCHITECTURE.
- **Audit:** Record who created/finalised/accepted a quote and when (for compliance and support).

---

## Out of Scope

Explicitly **not** in scope for this version:

- **Sending the quote email from the system** — sending is manual via Outlook after copying link and message.
- **Multi-tenant** — single company / single tenant only.
- **Payment or invoicing** — unless added in a later phase.

---

## Traceability

When implementing a feature:

1. Check which step of the [Business Workflow](#business-workflow) it supports.
2. Confirm which [User role](#user-roles-and-capabilities) can use it.
3. Ensure behaviour matches the [Functional requirements](#functional-requirements) and does not conflict with [Out of scope](#out-of-scope).

For **how** to build (components, APIs, tech stack), see [ARCHITECTURE.md](ARCHITECTURE.md). For **in what order** to build (phases, priorities), see [STRATEGY.md](STRATEGY.md).
