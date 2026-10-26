import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Section } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { site } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "aboutPage" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/about`,
      languages: { en: "/en/about", fa: "/fa/about", "x-default": "/en/about" },
    },
  };
}

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("aboutPage");

  return (
    <>
      <Section tone="light" className="pt-14 md:pt-20">
        <div className="max-w-3xl">
          <p className="label-eyebrow text-cobalt">{t("eyebrow")}</p>
          <h1 className="text-section mt-4 text-ink">{t("title")}</h1>
          <p className="mt-8 text-xl text-ink/80">{t("lead")}</p>
        </div>

        <div className="mt-14 max-w-3xl space-y-5 text-lg text-ink/80">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
          <p>{t("p3")}</p>
        </div>
      </Section>

      <Section tone="forest">
        <div className="text-center">
          <h2 className="text-section text-canvas">{t("ctaTitle")}</h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-mist">
            {t("ctaBody")}
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-4">
            <ButtonLink href={`/${locale}/contact`} variant="onDark">
              {t("ctaPrimary")}
            </ButtonLink>
            <ButtonLink
              href={site.social.linkedin}
              variant="onDarkGhost"
              target="_blank"
              rel="noreferrer noopener"
            >
              LinkedIn
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
