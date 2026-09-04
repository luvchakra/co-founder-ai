import { createClient } from "@/lib/supabase/server";
import type { Business, Product } from "./types";

/**
 * Tenancy write layer. As with queries.ts, these run through the RLS-scoped server
 * client -- the INSERT ... WITH CHECK policies on businesses/products are what actually
 * stop a user from writing into an account/business they don't belong to (Postgres
 * rejects the insert with a policy-violation error, which callers should surface as-is
 * rather than swallow).
 */

export async function createBusiness(
  accountId: string,
  input: { name: string; description?: string; website?: string; industry?: string },
): Promise<Business> {
  const name = input.name.trim();
  if (!name) throw new Error("Business name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .insert({
      account_id: accountId,
      name,
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
      industry: input.industry?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function createProduct(
  businessId: string,
  input: { name: string; description?: string; website?: string },
): Promise<Product> {
  const name = input.name.trim();
  if (!name) throw new Error("Product name is required.");

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .insert({
      business_id: businessId,
      name,
      description: input.description?.trim() || null,
      website: input.website?.trim() || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
