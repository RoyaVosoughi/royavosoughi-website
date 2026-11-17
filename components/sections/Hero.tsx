import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";

/**
 * The first screenful — a near-black stage with one centred statement,
 * modelled on a motionsites.ai reference hero.
 * - Small pill on top carries the slogan, "Reclaim your time".
 * - Headline: "The vision / of engineering / is (fingerprint) human + (spark) AI".
 *   The first two lines and "is" / "+" are a muted grey gradient; "human" and
 *   "AI" are bright, so the eye lands on the pairing.
 * - Each word "focuses in" out of a blur, one after another (filter +
 *   transform only, never opacity — see .focus-in in globals.css).
 * - Two glowing inline glyphs: a fingerprint whose ridges scan (human) and a
 *   slowly spinning spark (AI).
 * - One primary action with a soft breathing glow, plus a quiet chat link.
 * The panel is surface-ink, so it stays dark in both themes.
 */

const STEP = 110; // ms between words

function Words({ text, start, className = "" }: { text: string; start: number; className?: string }) {
  return (
    <>
      {text.split(" ").map((word, i) => (
        <span
          key={`${word}-${i}`}
          className={`focus-in ${className}`}
          style={{ animationDelay: `${start + i * STEP}ms` }}
        >
          {word}
          {" "}
        </span>
      ))}
    </>
  );
}

function SparkGlyph({ delay }: { delay: number }) {
  return (
    <span aria-hidden="true" className="hero-glyph focus-in" style={{ animationDelay: `${delay}ms` }}>
      <svg viewBox="0 0 24 24" className="spin-slow h-full w-full" fill="currentColor">
        <path d="M12 0c.6 5.7 3.3 8.9 9 10.2v1.6c-5.7 1.3-8.4 4.5-9 10.2h-.4c-.6-5.7-3.3-8.9-9-10.2v-1.6c5.7-1.3 8.4-4.5 9-10.2z" transform="translate(.2 1) scale(.95)" />
      </svg>
    </span>
  );
}

function FingerprintGlyph({ delay }: { delay: number }) {
  return (
    <span aria-hidden="true" className="hero-glyph focus-in" style={{ animationDelay: `${delay}ms` }}>
      <svg viewBox="0 0 24 24" className="fp-scan h-full w-full" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M5.2 7.3A8.5 8.5 0 0 1 20.4 10" />
        <path d="M3.6 12.4a8.6 8.6 0 0 1 .5-2.9" />
        <path d="M20.6 13.5c0 2.2-.4 4.3-1.2 6.2" />
        <path d="M6.3 18.6A12 12 0 0 0 7.4 12a4.6 4.6 0 0 1 9.2 0c0 1.2-.1 2.4-.3 3.6" />
        <path d="M15.6 18.6c-.3 1-.7 1.9-1.1 2.8" />
        <path d="M9 21a15 15 0 0 0 1.6-6.4V12a1.4 1.4 0 0 1 2.8 0v1.6" />
        <path d="M13.3 17.2c-.2 1.3-.6 2.6-1.1 3.8" />
        <path d="M4.3 16.4c.4-1.4.6-2.9.6-4.4" />
      </svg>
    </span>
  );
}

export async function Hero() {
  const t = await getTranslations("hero");
  const locale = await getLocale();

  const muted = `${t("visionA")} ${t("visionB")}`;
  const mutedCount = muted.split(" ").length;
  const s3 = 150 + mutedCount * STEP; // line 3 starts after lines 1–2
  const done = s3 + 6 * STEP;

  return (
    <section className="px-3 pt-2 pb-6 sm:px-5">
      <div className="surface-ink relative mx-auto flex min-h-[calc(100svh-6rem)] max-w-[90rem] items-center overflow-hidden rounded-[2rem] bg-[#0a0a0a] text-canvas sm:rounded-[2.5rem]">
        {/* Star-field + a low glow under the CTA — decorative only */}
        <div aria-hidden="true" className="hero-stars pointer-events-none absolute inset-0 opacity-60" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(40% 30% at 50% 78%, color-mix(in srgb, var(--color-cobalt-light) 14%, transparent) 0%, transparent 70%), radial-gradient(70% 50% at 50% 50%, transparent 40%, #000 100%)",
          }}
        />

        <div className="relative w-full px-5 py-20 text-center sm:px-10">
          <p className="rise-in label-eyebrow inline-flex items-center gap-2.5 rounded-full border border-canvas/15 bg-canvas/[0.06] px-4 py-2 text-canvas/75 backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cobalt-light" />
            {t("eyebrow")}
          </p>

          <h1 className="hero-display mx-auto mt-10 max-w-[20ch] [.locale-fa_&]:max-w-[26ch]">
            <span className="block">
              <Words text={t("visionA")} start={150} className="hero-muted" />
            </span>
            <span className="block">
              <Words text={t("visionB")} start={150 + t("visionA").split(" ").length * STEP} className="hero-muted" />
            </span>
            <span className="block">
              <Words text={t("visionIs")} start={s3} className="hero-muted" />
              <FingerprintGlyph delay={s3 + STEP} />
              {" "}
              <Words text={t("visionHuman")} start={s3 + 2 * STEP} className="text-canvas" />
              <Words text="+" start={s3 + 3 * STEP} className="hero-muted" />
              <SparkGlyph delay={s3 + 4 * STEP} />
              {" "}
              <Words text={t("visionAI")} start={s3 + 5 * STEP} className="text-canvas" />
            </span>
          </h1>

          <p
            className="rise-in-solid mx-auto mt-8 max-w-[52ch] text-base text-fog md:text-lg"
            style={{ animationDelay: `${done}ms` }}
          >
            {t("subtitle")}
          </p>

          <div
            className="rise-in mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row"
            style={{ animationDelay: `${done + 150}ms` }}
          >
            <span className="glow-pulse rounded-full">
              <ButtonLink href={`/${locale}/contact`} variant="onDark">
                {t("ctaPrimary")}
              </ButtonLink>
            </span>
            <ButtonLink href={`/${locale}/chat`} variant="onDarkGhost">
              {t("ctaChat")}
            </ButtonLink>
          </div>

          <p className="rise-in mt-6 text-sm" style={{ animationDelay: `${done + 250}ms` }}>
            <a
              href={`/${locale}/checklist`}
              className="text-canvas/70 underline decoration-canvas/25 underline-offset-4 transition-colors hover:text-canvas hover:decoration-canvas"
            >
              {t("checklistLink")}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
