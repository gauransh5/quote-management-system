/**
 * /api/settings
 *
 * GET — Read current tenant settings (any authenticated user).
 * PUT — Update tenant settings (admin only).
 *
 * The TenantSettings table has a single row (id = "default").
 * If no row exists, GET returns env var defaults and PUT creates it.
 *
 * Request body (PUT, JSON):
 *   { companyName?, companyTagline?, companyPhone?, companyWebsite?,
 *     logoUrl?, primaryColor?, emailFromName?, emailFromAddress?,
 *     emailAdminAddress?, tax1Label?, tax2Label?, locale?, currency?,
 *     premiumBranding?, footerText? }
 *
 * Responses:
 *   GET 200 — { data: TenantSettings }
 *   PUT 200 — { data: TenantSettings }
 *   PUT 400 — Validation error
 *   401 — Not authenticated
 *   403 — Not admin (PUT only)
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getTenantConfig } from "@/config/tenant";
import { z } from "zod/v4";

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color (e.g. #000000)");

const updateSettingsSchema = z.object({
  companyName: z.string().min(1).optional(),
  companyTagline: z.string().optional().nullable(),
  companyPhone: z.string().optional().nullable(),
  companyWebsite: z.string().optional().nullable(),
  logoUrl: z.string().optional().nullable(),
  // logoSize: preset token or numeric px string (e.g. "md" or "72")
  logoSize: z.string().optional(),
  showCompanyName: z.boolean().optional(),
  primaryColor: hexColor.optional(),
  secondaryColor: hexColor.optional().nullable(),
  fontColor: hexColor.optional().nullable(),
  navbarColor: hexColor.optional().nullable(),
  backgroundColor: hexColor.optional().nullable(),
  emailFromName: z.string().optional().nullable(),
  emailFromAddress: z.string().email().optional().nullable(),
  emailAdminAddress: z.string().email().optional().nullable(),
  tax1Label: z.string().min(1).optional(),
  tax2Label: z.string().min(1).optional(),
  locale: z.string().min(2).optional(),
  currency: z.string().min(3).max(3).optional(),
  premiumBranding: z.boolean().optional(),
  footerText: z.string().optional().nullable(),
});

function serializeSettings(settings: Record<string, unknown>) {
  return {
    ...settings,
    updatedAt: settings.updatedAt instanceof Date
      ? settings.updatedAt.toISOString()
      : settings.updatedAt,
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    // No DB row yet — return env var defaults
    const envDefaults = getTenantConfig();
    return NextResponse.json({
      data: {
        id: "default",
        ...envDefaults,
        logoUrl: envDefaults.companyLogoUrl ?? null,
        footerText: null,
        updatedAt: null,
      },
    });
  }

  return NextResponse.json({ data: serializeSettings(settings as unknown as Record<string, unknown>) });
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateSettingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  try {
    const settings = await prisma.tenantSettings.upsert({
      where: { id: "default" },
      update: data,
      create: {
        id: "default",
        companyName: data.companyName ?? getTenantConfig().companyName,
        ...data,
      },
    });

    return NextResponse.json({ data: serializeSettings(settings as unknown as Record<string, unknown>) });
  } catch (e) {
    console.error("Settings upsert failed:", e);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
