import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthForm } from "@/components/auth/AuthForm";
import { AuthSplitShell } from "@/components/auth/AuthSplitShell";
import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { authMetadata } from "@/lib/auth/page";

type Params = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; notice?: string }>;
};

export const generateMetadata = ({ params }: Params) => authMetadata(params, "signIn");

export default async function SignInPage({ params, searchParams }: Params) {
  const { locale } = await params;
  const { next, notice } = await searchParams;
  setRequestLocale(locale);
  if (await getCurrentUser()) redirect({ href: "/account", locale });

  const t = await getTranslations("auth.signIn");
  return (
    <AuthSplitShell title={t("title")} intro={t("intro")}>
      {notice === "link" ? (
        <p role="status" className="mb-6 rounded-xl bg-mist px-5 py-4 text-sm text-ink/85">
          {t("noticeLink")}
        </p>
      ) : null}
      <AuthForm mode="signIn" next={next} variant="split" />
    </AuthSplitShell>
  );
}
