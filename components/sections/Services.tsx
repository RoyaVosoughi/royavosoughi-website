import { getLocale, getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { HoverRevealCards } from "@/components/ui/HoverRevealCards";
import { serviceKeys, type ServiceKey } from "@/lib/service-options";

/**
 * Home-page teaser: the six services as hover-reveal image cards — each shows
 * a screenshot of real work for that service under a dark scrim. Hovering or
 * focusing one card lifts it and dims the rest. The full cards and the
 * request form live on /services (ServicesDetail).
 */
const images: Record<ServiceKey, string> = {
  consulting: "/services/cards/proposal-sample.jpg",
  automation: "/services/cards/email-automation.jpg",
  agent: "/services/cards/chatbot-demo-poster.jpg",
  multiAgent: "/services/cards/multi-agent-studio.jpg",
  crm: "/services/cards/crm-deals.jpg",
  adminPanel: "/services/cards/admin-dashboard.jpg",
};

export async function Services() {
  const t = await getTranslations("services");
  const locale = await getLocale();
  const num = new Intl.NumberFormat(locale);

  return (
    <Section id="services" tone="light">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <Reveal>
          <SectionHeading eyebrow={t("eyebrow")} title={t("title")} intro={t("intro")} />
        </Reveal>
        <Reveal delayMs={80} className="shrink-0">
          <ButtonLink href={`/${locale}/services`} variant="secondary">
            {t("teaserLink")}
          </ButtonLink>
        </Reveal>
      </div>

      <HoverRevealCards
        className="mt-14"
        titleStyle={{
          fontFamily: "var(--font-display)",
          letterSpacing: locale === "fa" ? 0 : "-0.02em",
          lineHeight: locale === "fa" ? 1.5 : 1.02,
        }}
        items={serviceKeys.map((key, i) => ({
          id: key,
          href: "/services",
          eyebrow: num.format(i + 1).padStart(2, num.format(0)),
          title: t(`items.${key}.name`),
          subtitle: t(`items.${key}.duration`),
          imageUrl: images[key],
        }))}
        wrap={(card, i) => (
          <Reveal delayMs={60 + i * 60} className="h-full">
            {card}
          </Reveal>
        )}
      />
    </Section>
  );
}
