/**
 * POST /api/settings/logo
 *
 * Upload a company logo. Currently accepts a URL directly (e.g. from an
 * external host or R2 pre-signed URL). When R2 is configured, this can
 * be extended to accept multipart/form-data and upload to R2.
 *
 * Request body (JSON): { logoUrl: string }
 *
 * Responses:
 *   200 — { data: { logoUrl: string } }
 *   400 — Validation error
 *   401 — Not authenticated
 *   403 — Not admin
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

const logoSchema = z.object({
  logoUrl: z.string().url("Must be a valid URL").nullable(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = logoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const settings = await prisma.tenantSettings.upsert({
    where: { id: "default" },
    update: { logoUrl: parsed.data.logoUrl },
    create: { id: "default", logoUrl: parsed.data.logoUrl },
  });

  return NextResponse.json({
    data: { logoUrl: settings.logoUrl },
  });
}
