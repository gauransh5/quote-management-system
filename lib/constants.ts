/**
 * Application constants — single source of truth for all reference strings.
 *
 * Use these instead of hardcoded strings throughout the codebase.
 * If a value needs to change, change it here and it propagates everywhere.
 *
 * Equivalent to a Java enum or a constants class with static final fields.
 */

// ──────────────────────────────────────────────
// Quote statuses
// ──────────────────────────────────────────────

export const QUOTE_STATUS = {
  REQUEST: "REQUEST",
  DRAFT: "DRAFT",
  FINALISED: "FINALISED",
  CHANGES_REQUESTED: "CHANGES_REQUESTED",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
} as const;

export type QuoteStatusType = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS];

/** Human-readable labels for each status */
export const QUOTE_STATUS_LABEL: Record<QuoteStatusType, string> = {
  REQUEST: "New Request",
  DRAFT: "Draft",
  FINALISED: "Finalised",
  CHANGES_REQUESTED: "Changes Requested",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  EXPIRED: "Expired",
};

/** CSS classes for status badges (Tailwind) */
export const QUOTE_STATUS_COLOR: Record<QuoteStatusType, string> = {
  REQUEST: "bg-blue-100 text-blue-800",
  DRAFT: "bg-gray-100 text-gray-800",
  FINALISED: "bg-yellow-100 text-yellow-800",
  CHANGES_REQUESTED: "bg-orange-100 text-orange-800",
  ACCEPTED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  EXPIRED: "bg-gray-100 text-gray-500",
};

// ──────────────────────────────────────────────
// User roles
// ──────────────────────────────────────────────

export const ROLE = {
  ADMIN: "ADMIN",
  SALES: "SALES",
} as const;

export type RoleType = (typeof ROLE)[keyof typeof ROLE];

// ──────────────────────────────────────────────
// Lead sources
// ──────────────────────────────────────────────

export const LEAD_SOURCE = {
  WEBSITE: "website",
  PHONE: "phone",
  REFERRAL: "referral",
  WALK_IN: "walk-in",
  EMAIL: "email",
  OTHER: "other",
} as const;

export type LeadSourceType = (typeof LEAD_SOURCE)[keyof typeof LEAD_SOURCE];

export const LEAD_SOURCE_OPTIONS = [
  { value: LEAD_SOURCE.PHONE, label: "Phone" },
  { value: LEAD_SOURCE.REFERRAL, label: "Referral" },
  { value: LEAD_SOURCE.WALK_IN, label: "Walk-in" },
  { value: LEAD_SOURCE.EMAIL, label: "Email" },
  { value: LEAD_SOURCE.OTHER, label: "Other" },
] as const;

// ──────────────────────────────────────────────
// Services (matches bosssecurity.ca form)
// ──────────────────────────────────────────────

export const SERVICES = [
  "Static Guard Services",
  "Mobile Patrols",
  "CCTV Installation",
  "Remote Video Monitoring",
  "Alarm Responses",
  "Fire and Intrusion Alarm Monitoring",
] as const;

// ──────────────────────────────────────────────
// Cities (matches bosssecurity.ca form)
// ──────────────────────────────────────────────

export const CITIES = [
  "Winnipeg",
  "Brandon",
  "Regina",
  "Saskatoon",
  "Calgary",
  "Edmonton",
  "Toronto",
] as const;

// ──────────────────────────────────────────────
// Audit log actions
// ──────────────────────────────────────────────

export const AUDIT_ACTION = {
  QUOTE_CREATED: "quote_created",
  QUOTE_SAVED: "quote_saved",
  QUOTE_FINALISED: "quote_finalised",
  QUOTE_REVISED: "quote_revised",
  QUOTE_ACCEPTED: "quote_accepted",
  QUOTE_REJECTED: "quote_rejected",
  CHANGES_REQUESTED: "changes_requested",
  USER_CREATED: "user_created",
  USER_DISABLED: "user_disabled",
} as const;

export type AuditActionType = (typeof AUDIT_ACTION)[keyof typeof AUDIT_ACTION];

/** Human-readable labels for audit log actions (e.g. for Activity timeline). */
export const AUDIT_ACTION_LABEL: Record<string, string> = {
  [AUDIT_ACTION.QUOTE_CREATED]: "Quote created",
  [AUDIT_ACTION.QUOTE_SAVED]: "Draft saved",
  [AUDIT_ACTION.QUOTE_FINALISED]: "Quote finalised",
  [AUDIT_ACTION.QUOTE_REVISED]: "Reverted to draft",
  [AUDIT_ACTION.QUOTE_ACCEPTED]: "Quote accepted by customer",
  [AUDIT_ACTION.QUOTE_REJECTED]: "Quote rejected",
  [AUDIT_ACTION.CHANGES_REQUESTED]: "Customer requested changes",
  [AUDIT_ACTION.USER_CREATED]: "User created",
  [AUDIT_ACTION.USER_DISABLED]: "User disabled",
};

// ──────────────────────────────────────────────
// Email (Resend / notifications)
// ──────────────────────────────────────────────

/** Sender address for system emails (quote accepted, change requests, etc.). */
export const EMAIL_FROM = "Boss Security <noreply@bosssecurity.ca>";

/** Admin inbox for quote-accepted and change-request notifications. */
export const EMAIL_ADMIN = "admin@bosssecurity.ca";
