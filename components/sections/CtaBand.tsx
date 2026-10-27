import { getLocale, getTranslations } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";

/**
 * Closing call to action — a flat, solid cobalt panel (the fixed royal fill,
 * so it stays cobalt in dark mode) with a cream headline, headline start,
 * actions end. No gradients: it uses only the brand palette, and cream text
 * on cobalt keeps 8:1 contrast. The cream pill is the one filled action; the
 * second is a hairline outline.
 */
const pill =
  "inline-flex items-center justify-center rounded-full px-6 py-3.5 text-[0.9375rem] font-medium leading-none transition-colors duration-200 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cream";

export async function CtaBand() {
  const t = await getTranslations("projects");
  const hero = await getTranslations("hero");
  const locale = await getLocale();

  return (
    <section className="bg-canvas px-3 pb-10 sm:px-5 sm:pb-14">
      <Reveal className="mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] bg-royal sm:rounded-[2.5rem]">
        <div className="container-page flex flex-col gap-10 py-16 md:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
          <h2 className="text-section max-w-[14ch] text-cream">{t("ctaTitle")}</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <a
              href={`/${locale}/contact`}
              className={`${pill} bg-cream text-night hover:bg-white`}
            >
              {t("ctaButton")}
            </a>
            <a
              href={`/${locale}/chat`}
              className={`${pill} border border-cream/40 text-cream hover:border-cream hover:bg-cream/10`}
            >
              {hero("ctaChat")}
            </a>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
