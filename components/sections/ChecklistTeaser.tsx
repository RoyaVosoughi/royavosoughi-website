import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * StoryBrand's transitional call to action: a free, no-commitment first step
 * for visitors who aren't ready for the paid consultation. Sits after the
 * problem/stakes and proof sections, where the need is already felt.
 */
export async function ChecklistTeaser() {
  const t = await getTranslations("checklist");
  const locale = await getLocale();

  return (
    <section className="bg-canvas pb-16 md:pb-24">
      <div className="container-page">
        <Reveal className="rounded-[2rem] bg-mist p-8 md:p-12 lg:flex lg:items-center lg:justify-between lg:gap-16">
          <div className="max-w-2xl">
            <p className="label-eyebrow text-cobalt">{t("teaserEyebrow")}</p>
            <h2 className="text-section mt-5 text-ink">{t("teaserTitle")}</h2>
            <p className="mt-5 text-lg leading-relaxed text-ink/80">{t("teaserBody")}</p>
          </div>
          <div className="mt-8 shrink-0 lg:mt-0">
            <ButtonLink href={`/${locale}/checklist`} variant="primary">
              {t("teaserCta")}
            </ButtonLink>
            <p className="mt-3 text-sm text-ink/70">{t("teaserNote")}</p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
