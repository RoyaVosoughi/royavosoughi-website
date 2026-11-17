import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { authMetadata } from "@/lib/auth/page";

type Params = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Params) => authMetadata(params, "reset");

/** Reached from the reset email: the callback route has already signed them in. */
export default async function ResetPasswordPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (!(await getCurrentUser())) redirect({ href: "/forgot-password", locale });

  const t = await getTranslations("auth.reset");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")}>
      <AuthForm mode="reset" />
    </AuthShell>
  );
}
