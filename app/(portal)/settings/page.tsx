import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getTenantConfig } from "@/config/tenant";
import SettingsForm from "./settings-form";

/**
 * Settings page — admin only.
 *
 * Server component that loads current tenant settings (DB with env var fallback),
 * passes to client component for editing.
 */
export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  const dbSettings = await prisma.tenantSettings.findUnique({
    where: { id: "default" },
  });

  const envDefaults = getTenantConfig();

  const settings = {
    companyName: dbSettings?.companyName ?? envDefaults.companyName,
    companyTagline: dbSettings?.companyTagline ?? envDefaults.companyTagline ?? "",
    companyPhone: dbSettings?.companyPhone ?? envDefaults.companyPhone ?? "",
    companyWebsite: dbSettings?.companyWebsite ?? envDefaults.companyWebsite ?? "",
    logoUrl: dbSettings?.logoUrl ?? envDefaults.companyLogoUrl ?? "",
    logoSize: dbSettings?.logoSize ?? envDefaults.logoSize ?? "md",
    showCompanyName: dbSettings?.showCompanyName ?? envDefaults.showCompanyName ?? false,
    primaryColor: dbSettings?.primaryColor ?? envDefaults.primaryColor,
    secondaryColor: dbSettings?.secondaryColor ?? envDefaults.secondaryColor ?? "",
    fontColor: dbSettings?.fontColor ?? envDefaults.fontColor ?? "",
    navbarColor: dbSettings?.navbarColor ?? envDefaults.navbarColor ?? "",
    backgroundColor: dbSettings?.backgroundColor ?? envDefaults.backgroundColor ?? "",
    emailFromName: dbSettings?.emailFromName ?? envDefaults.emailFromName,
    emailFromAddress: dbSettings?.emailFromAddress ?? envDefaults.emailFromAddress,
    emailAdminAddress: dbSettings?.emailAdminAddress ?? envDefaults.emailAdminAddress,
    tax1Label: dbSettings?.tax1Label ?? envDefaults.tax1Label,
    tax2Label: dbSettings?.tax2Label ?? envDefaults.tax2Label,
    locale: dbSettings?.locale ?? envDefaults.locale,
    currency: dbSettings?.currency ?? envDefaults.currency,
    premiumBranding: dbSettings?.premiumBranding ?? envDefaults.premiumBranding,
    footerText: dbSettings?.footerText ?? "",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Settings</h1>
      <p className="text-muted-foreground mt-1">
        Configure branding, email, and tax settings
      </p>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
