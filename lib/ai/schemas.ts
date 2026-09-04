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

/**
 * Structured ICP draft output (blueprint §13, §19). Generated from a ProductProfile --
 * see prompts/icp/generate_icp_v1.ts.
 */
export const IcpProfileSchema = z.object({
  name: z.string().describe("A short label for this ICP, e.g. 'Enterprise Banks'"),
  description: z.string(),
  industries: z.array(z.string()),
  company_sizes: z
    .array(z.string())
    .describe("e.g. '50-200 employees', '2,000-50,000 employees'"),
  geographies: z.array(z.string()),
  roles: z.array(z.string()).describe("Job titles/roles of likely buyers"),
  pain_points: z.array(z.string()),
  buying_signals: z.array(z.string()),
  exclusions: z
    .array(z.string())
    .describe("Company types that look similar but are NOT a good fit, and why"),
});

export type IcpProfileDraft = z.infer<typeof IcpProfileSchema>;
