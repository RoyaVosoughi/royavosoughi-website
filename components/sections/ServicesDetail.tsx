import { getLocale, getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";
import { isSupabaseConfigured } from "@/lib/supabase";
import { serviceKeys } from "@/lib/service-options";

import { ServiceRequestDialog } from "./ServiceRequestDialog";
import { ServicesShowcase } from "./ServicesShowcase";

const details = ["for", "problem", "deliverable", "duration", "price"] as const;

/** The "real work" ring, in service order. `file` names the image in public/services (card version in cards/). */
const showcase = [
  { key: "proposal", file: "proposal-sample", service: "consulting" },
  { key: "emailReport", file: "email-automation", service: "automation", full: "svg" },
  { key: "chatbot", file: "chatbot-demo-poster", service: "agent" },
  { key: "voice", file: "voice-demo-poster", service: "agent" },
  { key: "rag", file: "rag-playground", service: "agent" },
  { key: "studio", file: "multi-agent-studio", service: "multiAgent" },
  { key: "crmLeads", file: "crm-leads", service: "crm" },
  { key: "crmDeals", file: "crm-deals", service: "crm" },
  { key: "crmContact", file: "crm-contact", service: "crm" },
  { key: "dashboard", file: "admin-dashboard", service: "adminPanel" },
] as const;

/**
 * The full /services page: one tilted paper card per service (they straighten
 * on hover), each with a "Register / Request" button that opens the request
 * form with that service pre-selected. Tilts are decorative only — under
 * prefers-reduced-motion the hover transition is dropped.
 */
export async function ServicesDetail() {
  const t = await getTranslations("services");
  const locale = await getLocale();
  const num = new Intl.NumberFormat(locale);
  const configured = isSupabaseConfigured();

  return (
    <Section tone="light" className="pt-14 md:pt-20">
      <SectionHeading
        eyebrow={t("eyebrow")}
        title={t("title")}
        intro={t("intro")}
        as="h1"
      />

      <div className="mt-16">
        <p className="label-eyebrow text-cobalt">{t("showcase.eyebrow")}</p>
        <h2 className="mt-3 text-3xl text-ink md:text-4xl">{t("showcase.title")}</h2>
        <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-ink/70">{t("showcase.intro")}</p>
        <div className="mt-6">
          <ServicesShowcase
            locale={locale}
            labels={{
              carouselLabel: t("showcase.carouselLabel"),
              watch: t("showcase.watch"),
              listen: t("showcase.listen"),
              viewFull: t("showcase.viewFull"),
              close: t("showcase.close"),
              captions: t("showcase.captions"),
            }}
            items={showcase.map((s) => ({
              key: s.key,
              card: `/services/cards/${s.file}.jpg`,
              full: `/services/${s.file}.${"full" in s ? s.full : "jpg"}`,
              alt: t(`showcase.items.${s.key}.alt`),
              title: t(`showcase.items.${s.key}.title`),
              body: t(`showcase.items.${s.key}.body`),
              serviceName: t(`items.${s.service}.name`),
              media:
                s.key === "chatbot"
                  ? { kind: "watch", src: "/services/chatbot-demo.mp4", poster: "/services/chatbot-demo-poster.jpg" }
                  : s.key === "voice"
                    ? {
                        kind: "listen",
                        src: "/services/voice-demo.mp4",
                        poster: "/services/voice-demo-poster.jpg",
                        captions: `/services/voice-demo.${locale === "fa" ? "fa" : "en"}.vtt`,
                      }
                    : undefined,
            }))}
          />
        </div>
      </div>

      <div className="mt-20">
        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {serviceKeys.map((key, i) => (
            <li key={key}>
              <Reveal delayMs={60 + (i % 3) * 80} className="h-full">
                <article
                  className="flex h-full flex-col rounded-[1.75rem] border border-ink/10 bg-paper p-6 transition-colors duration-200 hover:border-ink/30 md:p-8"
                >
                  <header>
                    <span aria-hidden="true" className="label-eyebrow text-cobalt">
                      {num.format(i + 1).padStart(2, num.format(0))}
                    </span>
                    <h2 className="mt-4 text-2xl text-ink md:text-3xl">{t(`items.${key}.name`)}</h2>
                  </header>
                  <span aria-hidden="true" className="mt-6 block h-px w-full bg-ink/10" />

                  <dl className="mt-6 flex-1 space-y-4">
                    {details.map((detail) => (
                      <div key={detail}>
                        <dt className="label-eyebrow text-cobalt">{t(`labels.${detail}`)}</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink/80">
                          {t(`items.${key}.${detail}`)}
                        </dd>
                      </div>
                    ))}
                    {t.has(`items.${key}.tech`) && (
                      <div>
                        <dt className="label-eyebrow text-cobalt">{t("labels.tech")}</dt>
                        <dd className="mt-1 text-[0.9375rem] leading-relaxed text-ink/80" dir="auto">
                          {t(`items.${key}.tech`)}
                        </dd>
                      </div>
                    )}
                  </dl>

                  <div className="mt-8">
                    {configured ? (
                      <ServiceRequestDialog service={key} email={site.email} />
                    ) : (
                      <ButtonLink href={`/${locale}/contact`}>{t("cta")}</ButtonLink>
                    )}
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
