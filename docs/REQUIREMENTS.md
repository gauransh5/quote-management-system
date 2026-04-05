# Quote Management System – Requirements

**Version:** 2.1  
**Last Updated:** April 2026  
**Related docs:** [ARCHITECTURE.md](ARCHITECTURE.md) | [STRATEGY.md](STRATEGY.md) | [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md) | [PRODUCT-PLAN.md](PRODUCT-PLAN.md)

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

1. **Customer submits form** on the company's website or external platform.
2. **Quote request reaches the portal** (form POSTs to the webhook endpoint; system creates a quote request).
3. **Portal shows the status of each quote** (request, draft, finalised, sent, viewed, accepted, rejected).
4. **Once quote is finalised**, the system generates a **unique link** that redirects to the generated quote.
5. **Customer** (via link): views quote with company branding, has option to **download** and **sign** the quote; quote is **accepted**.
6. **After acceptance:** system triggers email to **admin** and to the **sales team member**; status is updated on the dashboard.

The dashboard shows, for the **current month**, an **Estimate Total** and an **Accepted Total** value of all quotes.

---

## User Roles and Capabilities

| Role | Capabilities |
|------|--------------|
| **Sales team** | Login; view/create/edit quotes; see own (or team) quotes; generate unique link and default message; copy link + message to clipboard; no user creation. |
| **Admin** | Everything sales has; **create/delete/manage users** (e.g. new sales users); view aggregate data (e.g. monthly Estimate Total and Accepted Total); **configure tenant settings** (branding, email, tax labels — Phase G2). |
| **Customer (end user)** | No login; access **only via unique link** — view branded quote, download PDF, sign, accept. |

---

## Functional Requirements

Prioritised list. Each item should be traceable to the [Business Workflow](#business-workflow) and [User Roles](#user-roles-and-capabilities).

### Tenant configuration

- All customer-specific values (company name, branding, email addresses, tax labels, locale) are configurable via environment variables and (in future) a portal Settings page.
- No hardcoded company names, email addresses, or service lists in source code.
- Tax labels are configurable (e.g. GST/PST, HST, VAT, Sales Tax).
- Branding supports two tiers:
  - **Basic (all tiers):** company name, logo URL, logo size, option to show company name alongside logo, primary color, tax labels, locale, currency.
  - **Premium:** full theme palette — secondary/accent color, font color, **navbar/header background color** (independent from body background), **body background color**; plus tagline, phone, website, footer text. Navbar and body background are separate controls; navbar falls back to primary color when not set.
- Email notifications are configurable for **all tiers**: admin notification address, sender name, sender address.
- Admins can configure all tenant settings via a self-service Settings page in the portal.
- Settings are stored in the database (TenantSettings table) with env var fallback for initial deployment.
- Locale options use `Intl.getCanonicalLocales()` with `Intl.DisplayNames` labels. Currency options are populated from `Intl.supportedValuesOf('currency')` — no hardcoded lists.
- All monetary values on the public quote page and in emails are formatted using `Intl.NumberFormat` with the configured locale and currency — no hardcoded currency symbols.

### Quote fields

- Quotes have optional **project address** and **expected completion date** fields. Both are shown on the public quote page (address in "Prepared for" block, completion date in the header).
- Quotes have a **lead source** field (values: `website`, `social_media`, `referral`, `phone`, `other`), mirrored from the originating quote request on creation. Editable by sales in all quote statuses (it is metadata, not quote content).
- Quotes support **rich-text sections**: named sections with a heading and a rich-text body (Tiptap HTML). Admins and sales can add any number of sections (e.g. "Inclusions", "Terms & Conditions") to a draft quote. Sections are rendered on the public quote page below the notes block using `prose` typography styles.
- Section bodies support bold, italic, bullet lists, and ordered lists via the Tiptap StarterKit.

### Quote templates

- Admins manage a library of named quote templates via the Templates page in the portal.
- Each template has a name and a set of line items (description, quantity, unit price, item type).
- Templates are available to all users via a "Load Template" dropdown in the draft quote builder.
- Loading a template replaces all current line items in the quote (user is asked to confirm if items already exist).
- All line item fields remain editable after loading a template.
- Any quote (draft or finalised) has a "Save as Template" button that saves the current line items as a new template.
- Template items do not include schedule data — the user adds schedule rows after loading a template for hourly items.
- Admins can edit and delete templates from the Templates page.

### Product catalog

- Admins manage a product/service catalog via the Products page in the portal.
- Each product has: name, optional SKU (unique), optional description, optional category, optional default price, and a unit of measure (unit, hour, month, day).
- Products can be deactivated (soft-delete) and reactivated.
- When building a quote, sales users see a product picker dropdown that pre-fills line item fields (description, unit price, item type).
- Selecting a product with unit "hour" sets the line item to "hourly" billing type.
- A "Custom item (blank)" option is always available for freeform entries not in the catalog.
- All line item fields remain editable after selection from the catalog.

### Quote request ingestion

- Webhook endpoint accepts POST from any external form or integration.
- Incoming payload is mapped to a "quote request" in the portal.
- Idempotency and duplicate handling via optional idempotency key.
- Webhook requests are verified using HMAC-SHA256 signature.

### Portal quote list

- List all quotes with status: e.g. request, draft, finalised, sent, viewed, accepted, rejected.
- **Filter** on every visible column: status, customer name, email, phone, service, cities/site, quote number, total, assigned sales rep, and date range (created, finalised, accepted).
- **Search** by free-text across customer name, email, quote number, service, and cities.
- **Sort** on any column (ascending / descending).
- Dashboard can scope to current month for totals.

### Quote finalisation and sharing

- **Finalise quote** → system generates a unique, unguessable link; stores link and optional default message (using configured company name).
- **Share flow:** Portal displays the link and default message; a **"Copy"** button copies the message (including the link) so the sales team can paste into email and send **manually**.
- **Quote line items** can be **standard** (quantity × unit price) or **hourly** (schedule of date/time ranges × hourly rate). See [DESIGN-hourly-service-and-pst.md](DESIGN-hourly-service-and-pst.md).
- **Tax:** Quotes support two configurable tax types (default: GST and PST). Labels and rates are configurable. Totals are computed server-side.

### Public quote page (by link)

- Customer opens unique link (no login).
- Page is a **branded, styled HTML page** showing: company branding from tenant config (name/logo, colors; tagline/phone/website if premium), full quote details (including line-item schedule breakdown and taxes), and the **name, title, and profile photo** of the sales team member. Also shows project address, expected completion date, and rich-text sections when present.
- **Download/Print:** Browser print-to-PDF (`@media print` CSS).
- **Accept flow:** Customer types **name** and **title**, checks "I accept", clicks **"Accept Quote"**. Typed name is the electronic signature.
- On accept: set status to accepted; store signature data; send email to admin and to the sales team member (using configured email addresses); update dashboard status.

### Dashboard

- For the **current month**: **Estimate Total** and **Accepted Total**.
- List or summary of quotes (with filters as above).

### Authentication and user management

- Login for sales team and admin.
- **Admin only:** create, edit, and delete/disable users. Soft-delete (set user inactive).

### User profile

- Sales and admin users have **name**, **title**, and **profile photo**.
- Non-admin users can edit profile picture only. Admin users edit all user details in the Users section.

---

## Non-Functional Requirements

- **Security:** Authentication and role-based access; secure unique links; HMAC webhook verification; no sensitive data in URL path.
- **Configurability:** All customer-specific values are configurable without code changes (via env vars or Settings page).
- **Audit:** Record who created/finalised/accepted a quote and when.

---

## Out of Scope

Explicitly **not** in scope for this version:

- **Sending the quote email from the system** — sending is manual via email client after copying link and message.
- **Multi-tenant (shared database)** — single-tenant deploys for now. Multi-tenant is a future phase (G4).
- **Payment or invoicing** — unless added in a later phase.
- **Custom domain support** — Phase G4 (future). Vercel-native feature.
- **Bulk product import (CSV)** — Phase G4. Products are created one at a time via the portal.

---

## Traceability

When implementing a feature:

1. Check which step of the [Business Workflow](#business-workflow) it supports.
2. Confirm which [User role](#user-roles-and-capabilities) can use it.
3. Ensure behaviour matches the [Functional requirements](#functional-requirements) and does not conflict with [Out of scope](#out-of-scope).

For **how** to build (components, APIs, tech stack), see [ARCHITECTURE.md](ARCHITECTURE.md). For **in what order** to build (phases, priorities), see [STRATEGY.md](STRATEGY.md).
