import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { serviceKeys } from "@/lib/service-options";

/**
 * Home-page teaser: the four services as Origin-style colour tiles — large
 * 30px-radius panels where colour alone separates the categories. The fills
 * are fixed accent panels (they don't flip in dark mode), so the text on
 * each uses the fixed night/cream pair. The full cards and the request form
 * live on /services (ServicesDetail).
 */
const tiles = [
  { span: "lg:col-span-3", fill: "bg-royal", text: "text-white", muted: "text-white/75" },
  { span: "lg:col-span-3", fill: "bg-lilac", text: "text-night", muted: "text-night/70" },
  { span: "lg:col-span-3", fill: "bg-periwinkle", text: "text-night", muted: "text-night/70" },
  { span: "lg:col-span-3", fill: "bg-deep", text: "text-cream", muted: "text-cream/70" },
] as const;

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

      <ol className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {serviceKeys.map((key, i) => {
          const tile = tiles[i % tiles.length];
          return (
            <li key={key} className={tile.span}>
              <Reveal delayMs={60 + i * 60} className="h-full">
                <Link
                  href="/services"
                  className={`group flex h-full min-h-60 flex-col justify-between rounded-[1.875rem] p-7 transition-transform duration-300 hover:-translate-y-1 md:p-8 ${
                    i < 2 ? "lg:min-h-80" : ""
                  } ${tile.fill}`}
                >
                  <div className="flex items-center justify-between">
                    <span aria-hidden="true" className={`label-eyebrow ${tile.muted}`}>
                      {num.format(i + 1).padStart(2, num.format(0))}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid h-9 w-9 place-items-center rounded-full border border-current/25 transition-transform duration-300 group-hover:rotate-[-45deg] rtl:-scale-x-100 ${tile.text}`}
                    >
                      →
                    </span>
                  </div>
                  <div>
                    <h3
                      className={`font-light ${i < 2 ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"} ${tile.text}`}
                      style={{
                        fontFamily: "var(--font-display)",
                        letterSpacing: locale === "fa" ? 0 : "-0.02em",
                        lineHeight: locale === "fa" ? 1.5 : 1.02,
                      }}
                    >
                      {t(`items.${key}.name`)}
                    </h3>
                    <p className={`mt-3 text-sm ${tile.muted}`}>{t(`items.${key}.duration`)}</p>
                  </div>
                </Link>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
