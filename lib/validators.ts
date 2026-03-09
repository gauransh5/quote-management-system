/**
 * Zod schemas for request validation.
 *
 * Zod is a TypeScript-first schema validation library —
 * similar in purpose to javax.validation / Hibernate Validator in Spring,
 * but with runtime + compile-time type inference.
 *
 * Define a schema → parse incoming data → get a typed result or a validation error.
 */
import { z } from "zod/v4";

/**
 * Schema for the WordPress webhook payload.
 * Matches the "Get a quote" form on bosssecurity.ca.
 */
export const quoteRequestSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.email("Valid email is required"),
  phone: z.string().optional(),
  service: z.string().optional(),
  cities: z
    .union([z.array(z.string()), z.string()])
    .optional()
    .transform((val) => {
      if (!val) return [];
      if (Array.isArray(val)) return val;
      return val.split(",").map((c) => c.trim());
    }),
  message: z.string().optional(),
  source_url: z.string().optional(),
  idempotency_key: z.string().optional(),
});

export type QuoteRequestInput = z.infer<typeof quoteRequestSchema>;
