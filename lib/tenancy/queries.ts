import { createClient } from "@/lib/supabase/server";
import type { Account, Business, Product, Workspace } from "./types";

/**
 * Tenancy read layer. Every function runs the request as the authenticated user through
 * the RLS-scoped Supabase server client (never the service-role/admin client) -- Row
 * Level Security (supabase/migrations/*_tenancy_schema.sql) is the source of truth for
 * what a caller can see, not this code. A query for an id the caller doesn't own returns
 * zero rows, never another tenant's data and never a distinguishable error -- that's what
 * "never rely on frontend filtering" means in practice here.
 */

export async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");
  return user;
}

/** MVP assumes one account per user (see blueprint §9); returns the first membership. */
export async function getCurrentAccount(): Promise<Account | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBusinesses(accountId: string): Promise<Business[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("account_id", accountId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getBusiness(businessId: string): Promise<Business | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listProducts(businessId: string): Promise<Product[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
}

export async function getProduct(productId: string): Promise<Product | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/** Every product has exactly one workspace in the MVP (auto-created by the DB trigger). */
export async function getWorkspaceForProduct(productId: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("product_id", productId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getWorkspace(workspaceId: string): Promise<Workspace | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
