import Link from "next/link";
import { loadTenantConfig } from "@/config/tenant";

/**
 * Home page — redirects to the portal dashboard or shows a landing message.
 * In production this will redirect to /login or /dashboard based on auth state.
 */
export default async function Home() {
  const tenant = await loadTenantConfig();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">{tenant.companyName}</h1>
      <p className="text-lg text-gray-600 mb-8">Quote Management System</p>
      <Link
        href="/login"
        className="rounded-md bg-black px-6 py-3 text-white font-medium hover:bg-gray-800 transition-colors"
      >
        Go to Portal
      </Link>
    </main>
  );
}
