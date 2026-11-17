"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Visitor accounts (sign up / sign in) — Supabase Auth with the anon key.
 * The session lives in cookies so server pages (/account) can read it too.
 * This is NOT the admin login: /admin has its own password + session cookie.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let cached: SupabaseClient | null = null;

export function getAuthBrowserClient(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  cached ??= createBrowserClient(url, anonKey);
  return cached;
}

/** Google sign-in only shows once the provider is switched on in Supabase. */
export const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "true";
