import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";

/**
 * StoryBrand beats between the hero and the proof: the customer's problem,
 * what it costs to wait (stakes), and what life looks like after (success).
 * The customer is the hero here; Roya only appears later as the guide.
 */
const beats = ["problem", "stakes", "success"] as const;

export async function Story() {
  const t = await getTranslations("story");

  return (
    <section className="bg-canvas pt-16 md:pt-24">
      <div className="container-page">
        <Reveal>
          <p className="label-eyebrow text-cobalt">{t("eyebrow")}</p>
          <h2 className="text-section mt-5 max-w-[22ch] text-ink">{t("title")}</h2>
        </Reveal>

        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {beats.map((key, i) => (
            <li key={key}>
              <Reveal delayMs={i * 80} className="night-card">
                <div className="night-card__inner p-6 md:p-8">
                  <p className="label-eyebrow night-card__label">{t(`${key}.label`)}</p>
                  <h3 className="mt-4 text-xl">{t(`${key}.title`)}</h3>
                  <p className="mt-3 text-[0.9375rem] leading-relaxed">{t(`${key}.body`)}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
