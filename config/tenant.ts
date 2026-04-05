/**
 * Tenant configuration — single source of truth for all customer-specific values.
 *
 * Two entry points:
 * - `getTenantConfig()` — synchronous, reads from env vars only. Use for module-level
 *   code that can't be async (e.g. Next.js metadata export in layout.tsx).
 * - `loadTenantConfig()` — async, reads from TenantSettings DB table first, falls back
 *   to env vars. Use in server components, API routes, and anywhere async is available.
 *
 * The DB row is the source of truth when it exists. Env vars serve as defaults
 * for initial deployment before the admin configures settings via the portal.
 */
import { prisma } from "@/lib/db";

export interface TenantConfig {
  // Company identity
  companyName: string;
  companyTagline?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyLogoUrl?: string;

  // Branding (basic)
  logoSize: string;        // "sm"|"md"|"lg"|"xl" or custom px as numeric string e.g. "72"
  showCompanyName: boolean; // show company name text alongside logo
  primaryColor: string;

  // Branding (premium) — full palette
  secondaryColor?: string;   // CTA / accent: buttons, active nav
  fontColor?: string;        // text on primary-colored surfaces; auto-computed from primaryColor if absent
  navbarColor?: string;      // header/navbar background; falls back to primaryColor when absent
  backgroundColor?: string;  // page body background (portal + public quote)

  // Email
  emailFromName: string;
  emailFromAddress: string;
  emailAdminAddress: string;

  // Feature flags
  premiumBranding: boolean;

  // Tax labels (generic — supports GST/PST, HST, VAT, etc.)
  tax1Label: string;
  tax2Label: string;

  // Locale
  locale: string;
  currency: string;

  // Footer
  footerText?: string;
}

/**
 * Synchronous tenant config from env vars only.
 *
 * Use this only where async is not possible (e.g. module-level metadata exports).
 * Prefer `loadTenantConfig()` everywhere else.
 */
export function getTenantConfig(): TenantConfig {
  return {
    companyName: process.env.COMPANY_NAME ?? "Quote Portal",
    companyTagline: process.env.COMPANY_TAGLINE,
    companyPhone: process.env.COMPANY_PHONE,
    companyWebsite: process.env.COMPANY_WEBSITE,
    companyLogoUrl: process.env.COMPANY_LOGO_URL,

    logoSize: process.env.LOGO_SIZE ?? "md",
    showCompanyName: process.env.SHOW_COMPANY_NAME === "true",
    primaryColor: process.env.PRIMARY_COLOR ?? "#000000",
    secondaryColor: process.env.SECONDARY_COLOR,
    fontColor: process.env.FONT_COLOR,
    navbarColor: process.env.NAVBAR_COLOR,
    backgroundColor: process.env.BACKGROUND_COLOR,

    emailFromName: process.env.EMAIL_FROM_NAME ?? process.env.COMPANY_NAME ?? "Quote Portal",
    emailFromAddress: process.env.EMAIL_FROM_ADDRESS ?? "noreply@example.com",
    emailAdminAddress: process.env.EMAIL_ADMIN_ADDRESS ?? "admin@example.com",

    premiumBranding: process.env.PREMIUM_BRANDING === "true",

    tax1Label: process.env.TAX1_LABEL ?? "GST",
    tax2Label: process.env.TAX2_LABEL ?? "PST",

    locale: process.env.LOCALE ?? "en-CA",
    currency: process.env.CURRENCY ?? "CAD",

    footerText: process.env.FOOTER_TEXT,
  };
}

/**
 * Async tenant config — reads from TenantSettings DB table, falls back to env vars.
 *
 * Use this in server components, API routes, and anywhere async is available.
 * If the DB row doesn't exist, returns env var defaults (same as getTenantConfig).
 */
export async function loadTenantConfig(): Promise<TenantConfig> {
  const envDefaults = getTenantConfig();

  try {
    const settings = await prisma.tenantSettings.findUnique({
      where: { id: "default" },
    });

    if (!settings) return envDefaults;

    return {
      companyName: settings.companyName,
      companyTagline: settings.companyTagline ?? envDefaults.companyTagline,
      companyPhone: settings.companyPhone ?? envDefaults.companyPhone,
      companyWebsite: settings.companyWebsite ?? envDefaults.companyWebsite,
      companyLogoUrl: settings.logoUrl ?? envDefaults.companyLogoUrl,

      logoSize: settings.logoSize ?? envDefaults.logoSize,
      showCompanyName: settings.showCompanyName ?? envDefaults.showCompanyName,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor ?? envDefaults.secondaryColor,
      fontColor: settings.fontColor ?? envDefaults.fontColor,
      navbarColor: settings.navbarColor ?? envDefaults.navbarColor,
      backgroundColor: settings.backgroundColor ?? envDefaults.backgroundColor,

      emailFromName: settings.emailFromName ?? envDefaults.emailFromName,
      emailFromAddress: settings.emailFromAddress ?? envDefaults.emailFromAddress,
      emailAdminAddress: settings.emailAdminAddress ?? envDefaults.emailAdminAddress,

      premiumBranding: settings.premiumBranding,

      tax1Label: settings.tax1Label,
      tax2Label: settings.tax2Label,

      locale: settings.locale,
      currency: settings.currency,

      footerText: settings.footerText ?? envDefaults.footerText,
    };
  } catch {
    // DB not reachable — fall back to env vars
    return envDefaults;
  }
}
