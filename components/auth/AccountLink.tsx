"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";
import { getAuthBrowserClient } from "@/lib/auth/browser";

/** Header entry: "Sign in" for visitors, "Account" once signed in. */
export function AccountLink({ className }: { className: string }) {
  const t = useTranslations("nav");
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    const supabase = getAuthBrowserClient();
    if (!supabase) return;
    // getSession reads the local cookie — no network call on every page view.
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session)));
    return () => data.subscription.unsubscribe();
  }, []);

  return (
    <Link href={signedIn ? "/account" : "/sign-in"} className={className}>
      {signedIn ? t("account") : t("signIn")}
    </Link>
  );
}
