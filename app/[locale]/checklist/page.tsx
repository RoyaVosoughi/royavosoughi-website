import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Checklist } from "@/components/sections/Checklist";
import { Section, SectionHeading } from "@/components/ui/Section";
import { site } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "checklist" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: `/${locale}/checklist`,
      languages: { en: "/en/checklist", fa: "/fa/checklist", "x-default": "/en/checklist" },
    },
  };
}

export default async function ChecklistPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("checklist");

  return (
    <Section tone="light" className="pt-14 md:pt-20">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        intro={t("intro")}
        as="h1"
      />
      <div className="mt-12 max-w-3xl">
        <Checklist email={site.email} />
      </div>
    </Section>
  );
}
