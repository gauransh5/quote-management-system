import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { loadTenantConfig } from "@/config/tenant";
import PortalNav from "@/components/portal-nav";

/**
 * Portal layout — wraps all authenticated portal pages.
 *
 * Server-side auth guard: if no session, redirect to /login.
 * Provides a sidebar/nav and renders the page content.
 *
 * Equivalent to a Spring Security filter that protects all /portal/** routes.
 */
export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const tenant = await loadTenantConfig();

  // Premium theme colors — applied via inline styles so they're driven by DB settings.
  // Non-premium tenants get the default gray/white portal appearance.
  const theme = tenant.premiumBranding
    ? {
        sidebarBg: tenant.primaryColor,
        sidebarFg: tenant.fontColor || undefined,
        secondaryColor: tenant.secondaryColor || undefined,
        pageBg: tenant.backgroundColor || undefined,
      }
    : {};

  return (
    <div className="flex min-h-screen">
      <PortalNav
        user={session.user}
        companyName={tenant.companyName}
        theme={theme}
      />
      <main
        className="flex-1 p-6"
        style={theme.pageBg ? { backgroundColor: theme.pageBg } : { backgroundColor: "#f9fafb" }}
      >
        {children}
      </main>
    </div>
  );
}
