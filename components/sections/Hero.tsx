import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
import { HeroCodeCard } from "./HeroCodeCard";

/**
 * The first screenful, built from the three reference styles:
 * - a framed dark panel with an atmospheric cobalt/lilac glow (Mercury's
 *   night canvas + Superhuman's gradient band, standing in for a photo),
 * - a centred whisper-weight serif headline with one italic word (Origin),
 * - an "Ask Nura" prompt field that hands the question to /chat (Origin's AI
 *   prompt input — here it's real, the site has an assistant),
 * - frosted-glass product cards floating at the bottom (Superhuman).
 * The panel is surface-ink, so it stays dark in both themes.
 */
export async function Hero() {
  const t = await getTranslations("hero");
  const locale = await getLocale();

  return (
    <section className="px-3 pt-2 pb-6 sm:px-5">
      <div className="surface-ink relative mx-auto max-w-[90rem] overflow-hidden rounded-[2rem] bg-ink text-canvas sm:rounded-[2.5rem]">
        {/* Atmosphere — decorative only */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 108%, color-mix(in srgb, var(--color-cobalt) 70%, transparent) 0%, transparent 70%), radial-gradient(38% 40% at 88% 92%, color-mix(in srgb, var(--color-lilac) 38%, transparent) 0%, transparent 70%), radial-gradient(34% 36% at 10% 96%, color-mix(in srgb, var(--color-periwinkle) 30%, transparent) 0%, transparent 70%), radial-gradient(50% 40% at 50% -10%, color-mix(in srgb, var(--color-cobalt-light) 14%, transparent) 0%, transparent 70%)",
          }}
        />
        {/* Fine grid that fades out toward the bottom */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(var(--color-canvas) 1px, transparent 1px), linear-gradient(90deg, var(--color-canvas) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
            maskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 75%)",
          }}
        />

        <div className="relative px-5 pt-16 pb-12 text-center sm:px-10 md:pt-24 lg:pb-0">
          <p className="rise-in label-eyebrow inline-flex items-center gap-2.5 rounded-full border border-canvas/15 bg-canvas/[0.08] px-4 py-2 text-canvas/85 backdrop-blur">
            <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cobalt-light" />
            {t("eyebrow")}
          </p>

          <h1
            className="rise-in-solid text-display mx-auto mt-8 max-w-[16ch] text-canvas"
            style={{ animationDelay: "80ms" }}
          >
            {t("lineA")}{" "}
            <em className="text-cobalt-light">{t("lineB")}</em> {t("lineC")}
          </h1>

          <p
            className="rise-in-solid mx-auto mt-8 max-w-[54ch] text-lg text-fog md:text-xl"
            style={{ animationDelay: "200ms" }}
          >
            {t("subtitle")}
          </p>

          {/* Ask Nura — a plain GET form, works without JS */}
          <form
            action={`/${locale}/chat`}
            method="get"
            className="rise-in mx-auto mt-10 flex max-w-xl items-center gap-2 rounded-full border border-canvas/15 bg-night/60 p-1.5 ps-5 backdrop-blur-md focus-within:border-canvas/40"
            style={{ animationDelay: "280ms" }}
          >
            <label htmlFor="hero-ask" className="sr-only">
              {t("askLabel")}
            </label>
            <input
              id="hero-ask"
              name="q"
              type="text"
              maxLength={500}
              placeholder={t("askPlaceholder")}
              className="min-w-0 flex-1 bg-transparent py-2.5 text-[0.9375rem] text-canvas placeholder:text-fog/80 focus:outline-none"
            />
            <button
              type="submit"
              className="flex shrink-0 items-center gap-2 rounded-full bg-canvas px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-lilac"
            >
              <span className="hidden sm:inline">{t("askSubmit")}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4 rtl:-scale-x-100"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
              <span className="sr-only sm:hidden">{t("askSubmit")}</span>
            </button>
          </form>

          <div
            className="rise-in mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row"
            style={{ animationDelay: "340ms" }}
          >
            <ButtonLink href={`/${locale}/contact`} variant="onDark">
              {t("ctaPrimary")}
            </ButtonLink>
            <ButtonLink href="#projects" variant="onDarkGhost">
              {t("ctaSecondary")}
            </ButtonLink>
          </div>

          <p
            className="rise-in label-eyebrow mt-10 text-fog/80"
            style={{ animationDelay: "400ms" }}
          >
            {t("credential")}
          </p>

          {/* Floating glass cards — desktop only, decorative illustrations */}
          <div
            className="rise-in relative mx-auto mt-16 hidden max-w-5xl grid-cols-[1.25fr_1fr] items-end gap-6 text-start lg:grid"
            style={{ animationDelay: "480ms" }}
          >
            <div className="translate-y-6">
              <HeroCodeCard label={t("codeCardLabel")} />
            </div>

            <div
              role="img"
              aria-label={t("glassLabel")}
              className="mb-16 rounded-2xl border border-canvas/15 bg-canvas/[0.08] p-5 backdrop-blur-xl"
            >
              <p className="ms-auto w-fit max-w-[85%] rounded-2xl rounded-ee-md bg-canvas/90 px-4 py-2.5 text-sm text-ink">
                {t("glassQuestion")}
              </p>
              <div className="mt-4 flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lilac font-mono text-xs font-medium text-night"
                >
                  N
                </span>
                <div>
                  <p className="label-eyebrow text-canvas/60">{t("glassName")}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-canvas/90">
                    {t("glassAnswer")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
