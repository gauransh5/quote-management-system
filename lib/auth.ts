/**
 * NextAuth configuration.
 *
 * Uses the "Credentials" provider — users log in with email + password,
 * similar to Spring Security's DaoAuthenticationProvider.
 *
 * The session includes the user's id, role, name, and title so we can
 * enforce role-based access without an extra DB call on every request.
 */
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  // Allow requests from the current host (e.g. localhost:3001 in dev when 3000 is in use).
  // Prevents CLIENT_FETCH_ERROR when NEXTAUTH_URL and actual origin differ.
  trustHost: true,

  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.active) {
          return null;
        }

        const passwordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!passwordValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          title: user.title,
        };
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
        token.title = (user as any).title;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).title = token.title;
      }
      return session;
    },
  },

  pages: {
    signIn: "/login",
  },
};
