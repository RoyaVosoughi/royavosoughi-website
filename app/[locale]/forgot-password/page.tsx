import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthShell } from "@/components/auth/AuthShell";
import { authMetadata } from "@/lib/auth/page";

type Params = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Params) => authMetadata(params, "forgot");

export default async function ForgotPasswordPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("auth.forgot");
  return (
    <AuthShell eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")}>
      <AuthForm mode="forgot" />
    </AuthShell>
  );
}
