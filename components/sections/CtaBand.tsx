import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Closing call to action — no box: the headline and actions sit directly on
 * the cream canvas, like the section headings above. Ink headline, cobalt
 * primary pill, hairline-outline secondary.
 */
export async function CtaBand() {
  const t = await getTranslations("projects");
  const hero = await getTranslations("hero");
  const locale = await getLocale();

  return (
    <section className="bg-canvas">
      <Reveal className="container-page flex flex-col gap-10 py-16 md:py-24 lg:flex-row lg:items-center lg:justify-between lg:gap-16">
        <h2 className="text-section max-w-[14ch] text-ink">{hero("closingTitle")}</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href={`/${locale}/contact`} variant="primary">
            {t("ctaButton")}
          </ButtonLink>
          <ButtonLink href={`/${locale}/chat`} variant="secondary">
            {hero("ctaChat")}
          </ButtonLink>
        </div>
      </Reveal>
    </section>
  );
}
