import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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

  return (
    <div className="flex min-h-screen">
      <PortalNav user={session.user} />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  );
}
