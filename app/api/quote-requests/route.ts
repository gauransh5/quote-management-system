/**
 * POST /api/quote-requests
 *
 * Manually create a quote request for offline leads (phone, referral, walk-in).
 * Requires authentication. Sets leadSource from the request body.
 *
 * Body: { name, email, phone?, service?, cities?, message?, leadSource }
 *
 * Responses:
 *   201 — { data: QuoteRequest }
 *   400 — Validation error
 *   401 — Not authenticated
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod/v4";

const manualLeadSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  cities: z.array(z.string()).optional(),
  message: z.string().optional(),
  leadSource: z.string().min(1, "Lead source is required"),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = manualLeadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.issues },
      { status: 400 }
    );
  }

  const data = parsed.data;

  const quoteRequest = await prisma.quoteRequest.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone ?? null,
      service: data.service ?? null,
      cities: data.cities ?? [],
      message: data.message ?? null,
      leadSource: data.leadSource,
    },
  });

  return NextResponse.json({ data: quoteRequest }, { status: 201 });
}
