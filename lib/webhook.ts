/**
 * Webhook security helpers.
 *
 * Verifies that incoming webhook requests are from the WordPress site
 * using HMAC-SHA256 signature validation.
 *
 * WordPress (or its form plugin) sends a signature in the
 * X-Webhook-Signature header. We recompute the HMAC from the raw
 * request body and compare.
 *
 * Similar to verifying a JWT or API key in Spring Security,
 * but simpler — just a shared secret + HMAC.
 */
import { createHmac, timingSafeEqual } from "crypto";

/**
 * Verify the HMAC-SHA256 signature of a webhook request body.
 *
 * @param body - Raw request body as string
 * @param signature - The signature from X-Webhook-Signature header
 * @param secret - The shared secret (from WEBHOOK_SECRET env var)
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  if (expected.length !== signature.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
