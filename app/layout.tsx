import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import AuthSessionProvider from "@/components/session-provider";
import { getTenantConfig } from "@/config/tenant";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const inter = Inter({ subsets: ["latin"] });

const tenant = getTenantConfig();

export const metadata: Metadata = {
  title: `${tenant.companyName} — Quote Management`,
  description: `Internal quote management portal for ${tenant.companyName}`,
};

/**
 * Root layout wrapping all pages.
 * AuthSessionProvider makes the NextAuth session available to all client components.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${inter.className} antialiased`}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
