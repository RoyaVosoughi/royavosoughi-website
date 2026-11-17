import { getTranslations } from "next-intl/server";

import { DirectContactChip } from "@/components/ui/DirectContactChip";
import { Reveal } from "@/components/ui/Reveal";
import { QuickQuestionForm } from "@/components/sections/QuickQuestionForm";

/**
 * Closing section: the "Have a question?" form card on the left; on the right
 * a "Let's talk." headline, a short intro, two reassurance points and the
 * "Ask directly" profile chip. Sits directly on the cream canvas.
 */
export async function CtaBand() {
  const t = await getTranslations("question");

  const points = [
    { key: "quick", icon: <ClockIcon /> },
    { key: "steps", icon: <StepsIcon /> },
  ] as const;

  return (
    <section className="bg-canvas">
      <Reveal className="container-page grid gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center lg:gap-16">
        <QuickQuestionForm />
        <div>
          <h2 className="text-section text-ink">{t("talkTitle")}</h2>
          <p className="mt-5 max-w-[46ch] text-lg leading-relaxed text-ink/80">{t("talkBody")}</p>
          <ul className="mt-10 grid gap-6 sm:grid-cols-2">
            {points.map(({ key, icon }) => (
              <li key={key} className="flex items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper text-ink ring-1 ring-ink/10"
                >
                  {icon}
                </span>
                <div>
                  <p className="font-semibold text-ink">{t(`${key}Title`)}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ink/70">{t(`${key}Body`)}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10">
            <DirectContactChip />
          </div>
        </div>
      </Reveal>
    </section>
  );
}

const iconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  className: "h-5 w-5",
} as const;

function ClockIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function StepsIcon() {
  return (
    <svg {...iconProps}>
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}
