"use client";

/**
 * Client-side session provider wrapper.
 *
 * NextAuth's SessionProvider must be a client component.
 * We wrap it here so the root layout can remain a server component.
 */
import { SessionProvider } from "next-auth/react";

export default function AuthSessionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionProvider>{children}</SessionProvider>;
}
