import { getTranslations } from "next-intl/server";

import { Reveal } from "@/components/ui/Reveal";

/**
 * The four promises from the brand guide's positioning section — the exact
 * pains managers report with AI developers, answered one by one.
 */
const items = ["onTime", "real", "custom", "support"] as const;

const stack = ["Python", "OpenAI", "Gemini", "Supabase", "Next.js", "ElevenLabs"] as const;

export async function Proof() {
  const t = await getTranslations("proof");
  const hero = await getTranslations("hero");

  return (
    <section className="bg-canvas pt-10 pb-16 md:pb-24">
      <div className="container-page">
        {/* Superhuman's logo strip — here the real stack this site runs on,
            not client logos (none are claimed). Names stay Latin. */}
        <p className="label-eyebrow text-center text-ink/55">{hero("stackLabel")}</p>
        <ul
          dir="ltr"
          className="mt-5 grid grid-cols-3 overflow-hidden rounded-2xl border border-ink/10 bg-paper md:grid-cols-6"
        >
          {stack.map((name, i) => (
            <li
              key={name}
              className={`grid place-items-center border-ink/10 px-3 py-6 text-lg tracking-tight text-ink/75 md:py-7 ${
                i % 3 !== 2 ? "border-e" : ""
              } ${i < 3 ? "border-b md:border-b-0" : ""} ${i === 2 ? "md:border-e" : ""}`}
              style={{ fontFamily: "var(--font-space-grotesk)" }}
            >
              {name}
            </li>
          ))}
        </ul>

        <h2 className="sr-only">{t("title")}</h2>
        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((key, i) => (
            <li key={key}>
              <Reveal
                delayMs={i * 80}
                className="h-full rounded-2xl border border-ink/10 bg-paper p-6"
              >
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
              </Reveal>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
