/**
 * POST /api/webhooks/quote-request
 *
 * Accepts form submissions from the bosssecurity.ca WordPress site.
 * Creates a QuoteRequest record in the database.
 *
 * Security: Validates HMAC-SHA256 signature from X-Webhook-Signature header.
 * Validation: Rejects malformed payloads with 400 and Zod error details.
 * Idempotency: If idempotency_key is provided and already exists, returns 200.
 *
 * Request body (JSON):
 *   { name, email, phone?, service?, cities?, message?, source_url?, idempotency_key? }
 *
 * Responses:
 *   201 — Created: { id, message }
 *   200 — Already exists (duplicate idempotency_key): { id, message }
 *   400 — Validation error: { error, details }
 *   401 — Invalid or missing signature: { error }
 *   500 — Internal error: { error }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { quoteRequestSchema } from "@/lib/validators";
import { verifyWebhookSignature } from "@/lib/webhook";

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET;
    if (!secret) {
      console.error("WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Server misconfigured" },
        { status: 500 }
      );
    }

    const rawBody = await request.text();

    const signature = request.headers.get("x-webhook-signature");
    if (!signature || !verifyWebhookSignature(rawBody, signature, secret)) {
      return NextResponse.json(
        { error: "Invalid or missing webhook signature" },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const parsed = quoteRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const data = parsed.data;

    if (data.idempotency_key) {
      const existing = await prisma.quoteRequest.findUnique({
        where: { idempotencyKey: data.idempotency_key },
      });

      if (existing) {
        return NextResponse.json(
          { id: existing.id, message: "Quote request already exists" },
          { status: 200 }
        );
      }
    }

    const quoteRequest = await prisma.quoteRequest.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone ?? null,
        service: data.service ?? null,
        cities: data.cities,
        message: data.message ?? null,
        sourceUrl: data.source_url ?? null,
        idempotencyKey: data.idempotency_key ?? null,
      },
    });

    return NextResponse.json(
      { id: quoteRequest.id, message: "Quote request created" },
      { status: 201 }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
