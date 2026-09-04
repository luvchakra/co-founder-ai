import { z } from "zod";

/**
 * Structured product understanding output (blueprint §12, §17). Every field must be
 * traceable to the source material the model was given -- see
 * prompts/product/understand_product_v1.ts for the anti-hallucination instructions.
 */
export const ProductProfileSchema = z.object({
  category: z
    .string()
    .describe("What kind of product this is, e.g. 'B2B SaaS - invoice reconciliation'"),
  problem: z.string().describe("The problem this product solves, per the sources"),
  solution: z.string().describe("How the product solves it"),
  features: z.array(z.string()),
  differentiators: z.array(z.string()),
  target_industries: z.array(z.string()),
  target_roles: z.array(z.string()),
  use_cases: z.array(z.string()),
  pricing_summary: z
    .string()
    .nullable()
    .describe("Null if pricing is not mentioned anywhere in the sources"),
  competitive_positioning: z.string(),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe(
      "0-1. Lower for thin sources (e.g. a one-line description), higher for detailed ones.",
    ),
});

export type ProductProfile = z.infer<typeof ProductProfileSchema>;
