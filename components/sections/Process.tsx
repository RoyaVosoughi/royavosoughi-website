import { getTranslations } from "next-intl/server";
import type { CSSProperties, ReactNode } from "react";

import { Section, SectionHeading } from "@/components/ui/Section";
import { Reveal } from "@/components/ui/Reveal";

/**
 * The funnel made visible: what already happens today (form → personal
 * reply → consultation → written summary, per the Services and Contact
 * copy) laid out as four steps, so a first-time visitor knows exactly what
 * they're signing up for before they scroll to the form.
 *
 * Dark feature band with four frosted glass cards fanned like a hand of
 * cards; hovering deals them out flat (styles: .glass-fan in globals.css).
 * On touch and narrow screens they sit flat in a grid instead.
 */
const steps = ["request", "reply", "call", "roadmap"] as const;

/** Fan angle (deg) and lift (rem) per card — a gentle arc, centre cards higher. */
const fan = [
  { r: -12, y: 0.9 },
  { r: -4, y: 0 },
  { r: 4, y: 0 },
  { r: 12, y: 0.9 },
];

const icon = (path: ReactNode) => (
  <svg
    viewBox="0 0 24 24"
    width="28"
    height="28"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {path}
  </svg>
);

const icons: Record<(typeof steps)[number], ReactNode> = {
  // Form / request
  request: icon(
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h4" />
    </>,
  ),
  // Personal reply
  reply: icon(
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>,
  ),
  // Consultation call
  call: icon(
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="m16 10 5-3v10l-5-3" />
    </>,
  ),
  // Written roadmap
  roadmap: icon(
    <>
      <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z" />
      <path d="M9 4v14M15 6v14" />
    </>,
  ),
};

export async function Process() {
  const t = await getTranslations("process");

  return (
    <Section id="process" tone="forest">
      <Reveal className="max-w-2xl">
        <SectionHeading
          eyebrow={t("eyebrow")}
          title={t("title")}
          intro={t("intro")}
          tone="forest"
        />
      </Reveal>

      <Reveal delayMs={120} className="mt-12 lg:mt-16">
        <ol className="glass-fan">
          {steps.map((key, i) => (
            <li
              key={key}
              className="glass-card"
              style={{ "--r": fan[i].r, "--y": fan[i].y } as CSSProperties}
            >
              <div className="flex flex-1 flex-col p-6">
                <span className="glass-card__icon">{icons[key]}</span>
                <h3 className="mt-6 text-xl text-canvas">{t(`steps.${key}.name`)}</h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-fog">
                  {t(`steps.${key}.body`)}
                </p>
              </div>
              <div aria-hidden="true" className="glass-card__strip font-mono text-xs tracking-widest text-cobalt-light">
                {String(i + 1).padStart(2, "0")} / {String(steps.length).padStart(2, "0")}
              </div>
            </li>
          ))}
        </ol>
      </Reveal>
    </Section>
  );
}
