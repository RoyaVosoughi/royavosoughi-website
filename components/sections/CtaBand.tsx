import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

/**
 * Closing call to action — Superhuman's atmospheric gradient band: soft
 * lilac/periwinkle/cobalt glows on a lifted paper panel, headline left,
 * actions right. The glows are decoration only; nothing interactive sits on
 * a gradient that could hurt contrast.
 */
export async function CtaBand() {
  const t = await getTranslations("projects");
  const hero = await getTranslations("hero");
  const locale = await getLocale();

  return (
    <section className="bg-canvas px-3 pb-6 sm:px-5">
      <Reveal className="relative mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] border border-ink/10 bg-paper sm:rounded-[2.5rem]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(45% 80% at 62% 55%, var(--color-lilac) 0%, transparent 70%), radial-gradient(40% 75% at 92% 35%, var(--color-periwinkle) 0%, transparent 70%), radial-gradient(40% 60% at 80% 110%, color-mix(in srgb, var(--color-cobalt) 45%, transparent) 0%, transparent 70%), radial-gradient(30% 50% at 40% 0%, color-mix(in srgb, var(--color-lilac) 60%, transparent) 0%, transparent 70%)",
          }}
        />
        <div className="container-page relative flex flex-col gap-10 py-20 md:py-28 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-section max-w-[14ch] text-ink">{t("ctaTitle")}</h2>
          <div className="flex flex-col gap-3 sm:flex-row">
            <ButtonLink href={`/${locale}/contact`} variant="primary">
              {t("ctaButton")}
            </ButtonLink>
            <ButtonLink href={`/${locale}/chat`} variant="secondary">
              {hero("ctaChat")}
            </ButtonLink>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
