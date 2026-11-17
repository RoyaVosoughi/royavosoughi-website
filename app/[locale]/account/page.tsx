import { getTranslations, setRequestLocale } from "next-intl/server";

import { AuthShell } from "@/components/auth/AuthShell";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { buttonStyles } from "@/components/ui/Button";
import { Link, redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { authMetadata } from "@/lib/auth/page";

type Params = { params: Promise<{ locale: string }> };

export const generateMetadata = ({ params }: Params) => authMetadata(params, "account");

export default async function AccountPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) return redirect({ href: "/sign-in?next=/account", locale });

  const t = await getTranslations("auth.account");
  const name = String(user.user_metadata?.full_name ?? "").trim();
  const firstName = name.split(/\s+/)[0] ?? "";
  const since = new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(user.created_at));

  return (
    <AuthShell
      eyebrow={t("eyebrow")}
      title={firstName ? t("titleNamed", { name: firstName }) : t("title")}
      intro={t("intro")}
    >
      <div className="rounded-[2rem] border border-ink/10 bg-paper p-6 sm:p-10">
        <dl className="space-y-5">
          {name ? (
            <div>
              <dt className="label-eyebrow text-cobalt">{t("nameLabel")}</dt>
              <dd className="mt-1.5 text-lg text-ink">{name}</dd>
            </div>
          ) : null}
          <div>
            <dt className="label-eyebrow text-cobalt">{t("emailLabel")}</dt>
            <dd className="mt-1.5 text-lg text-ink" dir="ltr">
              {user.email}
            </dd>
          </div>
          <div>
            <dt className="label-eyebrow text-cobalt">{t("sinceLabel")}</dt>
            <dd className="mt-1.5 text-lg text-ink">{since}</dd>
          </div>
        </dl>

        <div className="mt-10 flex flex-wrap gap-3 border-t border-ink/10 pt-8">
          <Link href="/contact" className={buttonStyles("primary")}>
            {t("book")}
          </Link>
          <Link href="/services" className={buttonStyles("secondary")}>
            {t("services")}
          </Link>
        </div>
      </div>

      <div className="mt-8 flex justify-center">
        <SignOutButton />
      </div>
    </AuthShell>
  );
}
