"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { buttonStyles } from "@/components/ui/Button";
import { useRouter } from "@/i18n/navigation";
import { getAuthBrowserClient } from "@/lib/auth/browser";

export function SignOutButton() {
  const t = useTranslations("auth.account");
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    await getAuthBrowserClient()?.auth.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className={buttonStyles("secondary")}>
      {t("signOut")}
    </button>
  );
}
