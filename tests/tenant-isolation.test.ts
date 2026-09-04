import { afterAll, describe, expect, it } from "vitest";
import { createClient } from "@supabase/supabase-js";

// Requires network access to the dev Supabase project (NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY) -- run in CI or locally, not
// in network-sandboxed environments. The same assertions were verified via direct SQL
// role-simulation through the Supabase MCP server when the migration was written; see
// tests/sql/tenant_isolation_smoke.sql for that version and supabase/migrations/
// 20260904182540_tenancy_schema.sql for the RLS policies under test.

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const hasEnv = Boolean(url && anonKey && serviceKey);

describe.skipIf(!hasEnv)("tenant isolation (RLS)", () => {
  const admin = createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const cleanupUserIds: string[] = [];
  const cleanupAccountIds: string[] = [];

  async function signedInClient(email: string, password: string) {
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError || !created.user) {
      throw createError ?? new Error("user not created");
    }
    cleanupUserIds.push(created.user.id);

    const client = createClient(url!, anonKey!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: signInError } = await client.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;
    return client;
  }

  afterAll(async () => {
    for (const accountId of cleanupAccountIds) {
      await admin.from("accounts").delete().eq("id", accountId);
    }
    for (const userId of cleanupUserIds) {
      await admin.auth.admin.deleteUser(userId);
    }
  });

  it("blocks user B from reading or writing user A's business/product/workspace", async () => {
    const stamp = Date.now();
    const a = await signedInClient(
      `tenant-a-${stamp}@example.com`,
      "correct horse battery staple",
    );
    const b = await signedInClient(
      `tenant-b-${stamp}@example.com`,
      "correct horse battery staple",
    );

    const { data: accountA, error: accountAError } = await a
      .from("accounts")
      .select("*")
      .single();
    expect(accountAError).toBeNull();
    cleanupAccountIds.push(accountA!.id);

    const { data: accountB } = await b.from("accounts").select("*").single();
    cleanupAccountIds.push(accountB!.id);

    const { data: business, error: businessError } = await a
      .from("businesses")
      .insert({ account_id: accountA!.id, name: "Acme A" })
      .select()
      .single();
    expect(businessError).toBeNull();

    const { data: product } = await a
      .from("products")
      .insert({ business_id: business!.id, name: "Product A" })
      .select()
      .single();

    const { data: workspace } = await a
      .from("workspaces")
      .select("*")
      .eq("product_id", product!.id)
      .single();
    expect(workspace).not.toBeNull();

    const { data: leakedBusiness } = await b
      .from("businesses")
      .select("*")
      .eq("id", business!.id);
    expect(leakedBusiness).toEqual([]);

    const { data: leakedProduct } = await b
      .from("products")
      .select("*")
      .eq("id", product!.id);
    expect(leakedProduct).toEqual([]);

    const { data: leakedWorkspace } = await b
      .from("workspaces")
      .select("*")
      .eq("id", workspace!.id);
    expect(leakedWorkspace).toEqual([]);

    const { data: updateResult } = await b
      .from("businesses")
      .update({ name: "hijacked" })
      .eq("id", business!.id)
      .select();
    expect(updateResult).toEqual([]);

    const { data: ownWorkspace } = await a
      .from("workspaces")
      .select("*")
      .eq("id", workspace!.id);
    expect(ownWorkspace).toHaveLength(1);
  });
});
