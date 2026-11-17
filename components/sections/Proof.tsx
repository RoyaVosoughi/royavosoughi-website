import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";

/**
 * The four promises from the brand guide's positioning section — the exact
 * pains managers report with AI developers, answered one by one.
 */
const items = ["onTime", "real", "custom", "support"] as const;

export async function Proof() {
  const t = await getTranslations("proof");

  return (
    <section className="bg-canvas pt-10 pb-16 md:pb-24">
      <div className="container-page">
        <h2 className="sr-only">{t("title")}</h2>
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((key, i) => (
            <li key={key}>
              <Reveal delayMs={i * 80} className="blob-card h-full">
                <div className="blob-card__bg" aria-hidden="true" />
                {/* Negative delay puts each card's blob at a different corner. */}
                <div
                  className="blob-card__blob"
                  aria-hidden="true"
                  style={{ animationDelay: `${-i * 1.5}s` }}
                />
                <div className="blob-card__content p-7">
                  <span
                    aria-hidden="true"
                    className="label-eyebrow block text-cobalt"
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-4 text-lg text-ink">
                    {t(`${key}.title`)}
                  </h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
                    {t(`${key}.body`)}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
