/**
 * NextAuth API route handler.
 *
 * This single file handles all auth-related HTTP requests:
 * - POST /api/auth/signin  (login)
 * - POST /api/auth/signout (logout)
 * - GET  /api/auth/session  (get current session)
 *
 * Equivalent to Spring Security's filter chain / authentication endpoints.
 */
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
