import { Fragment } from "react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { buttonStyles } from "@/components/ui/Button";
import { Wordmark } from "@/components/ui/Logo";
import { Reveal } from "@/components/ui/Reveal";
import { SocialIcon, type SocialIconName } from "@/components/ui/SocialIcon";
import { gmailComposeUrl, site } from "@/lib/site";

/**
 * Closing contact footer on every page: centred eyebrow between hairlines,
 * two-tone headline (cream + cobalt-light), one cobalt pill, an icon row
 * split by thin dividers, the email as a plain link, then a hairline and a
 * small bottom bar (wordmark + © left, site links right).
 */
export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const projects = await getTranslations("projects");
  const blog = await getTranslations("blog");
  const year = new Date().getFullYear();
  // The bottom bar never mirrors: brand left, links right in both languages.
  const textDir = (await getLocale()) === "fa" ? "rtl" : "ltr";

  const profiles: { label: string; href: string; icon: SocialIconName }[] = [
    { label: "Instagram", href: site.social.instagram, icon: "instagram" },
    { label: "GitHub", href: site.social.github, icon: "github" },
    { label: "LinkedIn", href: site.social.linkedin, icon: "linkedin" },
    { label: "Gmail", href: gmailComposeUrl, icon: "email" },
  ];
  const links = profiles.filter((link) => link.href);

  return (
    <footer className="surface-ink bg-ink text-canvas">
      <div className="container-page pt-24 pb-10 md:pt-32">
        <Reveal className="text-center">
          <div className="flex items-center justify-center gap-4 text-fog">
            <span aria-hidden="true" className="h-px w-12 bg-canvas/15" />
            <span className="label-eyebrow">{projects("ctaButton")}</span>
            <span aria-hidden="true" className="h-px w-12 bg-canvas/15" />
          </div>

          <h2 className="text-section mx-auto mt-5 max-w-[18ch] text-canvas">
            {t.rich("ctaTitle", {
              accent: (chunks) => <span className="text-cobalt-light">{chunks}</span>,
            })}
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-lg text-mist">{t("ctaBody")}</p>

          <div className="mt-8 flex justify-center">
            <Link href="/contact" className={buttonStyles("onDark")}>
              <SocialIcon name="email" className="h-[18px] w-[18px]" />
              {blog("ctaButton")}
            </Link>
          </div>

          <nav aria-label={t("elsewhere")} className="mt-10 flex items-center justify-center gap-4">
            {links.map((link, i) => (
              <Fragment key={link.label}>
                {i > 0 && <span aria-hidden="true" className="h-6 w-px bg-canvas/15" />}
                <a
                  href={link.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={link.label}
                  title={link.label}
                  className="rounded-2xl p-2 text-fog transition-colors hover:bg-canvas/5 hover:text-cobalt-light"
                >
                  <SocialIcon name={link.icon} />
                </a>
              </Fragment>
            ))}
          </nav>

          <p className="mt-6">
            <a
              href={gmailComposeUrl}
              target="_blank"
              rel="noreferrer noopener"
              dir="ltr"
              className="text-sm text-mist underline underline-offset-4 transition-colors hover:text-cobalt-light"
            >
              {site.email}
            </a>
          </p>
        </Reveal>

        <div
          dir="ltr"
          className="mt-20 flex flex-col gap-6 border-t border-canvas/10 pt-8 md:flex-row md:items-center md:justify-between"
        >
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <Wordmark className="text-canvas" onDark />
            <p dir={textDir} className="text-xs text-fog">
              © {year} {site.name}. {t("rights")}
            </p>
          </div>

          <nav aria-label={t("siteLinks")} dir={textDir}>
            <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {(["services", "process", "projects", "blog", "about", "contact"] as const).map(
                (key) => (
                  <li key={key}>
                    <Link
                      href={key === "about" || key === "blog" ? `/${key}` : `/#${key}`}
                      className="text-fog transition-colors hover:text-cobalt-light"
                    >
                      {nav(key)}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>
      </div>
    </footer>
  );
}
