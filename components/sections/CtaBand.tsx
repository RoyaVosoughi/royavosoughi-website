import { getLocale, getTranslations } from "next-intl/server";

import { ButtonLink } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { site } from "@/lib/site";

/**
 * Closing call to action on a dark band: centred headline, the two actions,
 * then a row of real profile links (Instagram, GitHub, LinkedIn, email).
 * Only accounts that exist are linked — no press or client logos are claimed.
 */
const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "h-6 w-6",
} as const;

const icons = {
  instagram: (
    <svg {...iconProps}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  github: (
    <svg {...iconProps}>
      <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
    </svg>
  ),
  linkedin: (
    <svg {...iconProps}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  ),
  email: (
    <svg {...iconProps}>
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
};

export async function CtaBand() {
  const t = await getTranslations("projects");
  const hero = await getTranslations("hero");
  const locale = await getLocale();

  const profiles = [
    { key: "instagram", label: "Instagram", href: site.social.instagram, external: true },
    { key: "github", label: "GitHub", href: site.social.github, external: true },
    { key: "linkedin", label: "LinkedIn", href: site.social.linkedin, external: true },
    { key: "email", label: site.email, href: `mailto:${site.email}`, external: false },
  ] as const;

  return (
    <section className="surface-ink bg-ink-soft text-canvas">
      <Reveal className="container-page py-20 text-center md:py-28">
        <h2 className="text-section mx-auto max-w-[18ch] text-canvas">{t("ctaTitle")}</h2>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <ButtonLink href={`/${locale}/contact`} variant="onDark">
            {t("ctaButton")}
          </ButtonLink>
          <ButtonLink href={`/${locale}/chat`} variant="onDarkGhost">
            {hero("ctaChat")}
          </ButtonLink>
        </div>

        <p className="mt-20 text-2xl font-light text-canvas md:text-3xl" style={{ fontFamily: "var(--font-display)" }}>
          {t("connectTitle")}
        </p>
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-4">
          {profiles.map((p) => (
            <li key={p.key}>
              <a
                href={p.href}
                aria-label={p.label}
                {...(p.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                className="grid h-14 w-14 place-items-center rounded-full border border-canvas/25 text-canvas transition-colors duration-200 hover:border-cobalt-light hover:text-cobalt-light focus-visible:outline-3 focus-visible:outline-offset-3"
              >
                {icons[p.key]}
              </a>
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
