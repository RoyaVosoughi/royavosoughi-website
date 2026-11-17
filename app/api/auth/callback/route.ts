import { NextResponse, type NextRequest } from "next/server";

import { getAuthServerClient } from "@/lib/auth/server";

/**
 * Where Supabase sends visitors back to after: confirming their email,
 * signing in with Google, or clicking a password-reset link. Swaps the
 * one-time `code` for a session cookie, then forwards to `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const locale = searchParams.get("locale") === "fa" ? "fa" : "en";

  // Only same-site paths — never an open redirect.
  const nextParam = searchParams.get("next") ?? "";
  const next = /^\/(?!\/)/.test(nextParam) ? nextParam : `/${locale}/account`;

  const supabase = await getAuthServerClient();
  if (code && supabase) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // Most often: the link was opened in a different browser than the one that
  // signed up. The email is confirmed anyway, so a normal sign-in works.
  return NextResponse.redirect(`${origin}/${locale}/sign-in?notice=link`);
}
