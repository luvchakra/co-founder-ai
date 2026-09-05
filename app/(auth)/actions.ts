"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string } | null;

function getCredentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  return { email, password };
}

export async function login(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);
  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function signup(
  _prevState: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const { email, password } = getCredentials(formData);
  if (!email || !password) {
    return { error: "Email and password are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  // Supabase's confirmation link redirects to the project's dashboard-configured Site
  // URL unless we tell it otherwise -- without this, that link always points wherever
  // Site URL happens to be set (e.g. localhost) regardless of where the founder actually
  // signed up from. Reading the request's own origin means this works correctly in both
  // local dev and production without hardcoding either.
  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });
  if (error) {
    return { error: error.message };
  }

  // If email confirmation is required, Supabase returns a user but no session.
  if (!data.session) {
    redirect("/signup/check-email");
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
