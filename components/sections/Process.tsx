import { getTranslations } from "next-intl/server";

import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The funnel made visible: what already happens today (form → personal
 * reply → consultation → written summary, per the Services and Contact
 * copy) laid out as four steps, so a first-time visitor knows exactly what
 * they're signing up for before they scroll to the form.
 *
 * The page's dark feature band (Superhuman) in Mercury's language: a
 * two-column split, heading held on the left, graphite step cards one value
 * step above the ink canvas on the right — no shadows, no borders needed.
 */
const steps = ["request", "reply", "call", "roadmap"] as const;

export async function Process() {
  const t = await getTranslations("process");

  return (
    <Section id="process" tone="forest">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
        <Reveal className="lg:sticky lg:top-32 lg:self-start">
          <SectionHeading
            eyebrow={t("eyebrow")}
            title={t("title")}
            intro={t("intro")}
            tone="forest"
          />
        </Reveal>

        <ol className="grid gap-3">
          {steps.map((key, i) => (
            <li key={key}>
              <Reveal
                delayMs={i * 80}
                className="grid gap-x-6 gap-y-3 rounded-2xl bg-ink-soft p-7 sm:grid-cols-[3.5rem_1fr] md:p-8"
              >
                <span
                  aria-hidden="true"
                  className="grid h-11 w-11 place-items-center rounded-full border border-canvas/15 font-mono text-sm text-cobalt-light"
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-xl text-canvas">{t(`steps.${key}.name`)}</h3>
                  <p className="mt-2 text-[0.9375rem] leading-relaxed text-fog">
                    {t(`steps.${key}.body`)}
                  </p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
