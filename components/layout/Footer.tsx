import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Wordmark } from "@/components/ui/Logo";
import { SocialIcon, type SocialIconName } from "@/components/ui/SocialIcon";
import { gmailComposeUrl, site } from "@/lib/site";

export async function Footer() {
  const t = await getTranslations("footer");
  const nav = await getTranslations("nav");
  const year = new Date().getFullYear();
  // The footer layout never mirrors: brand left, links right in both languages.
  // Only the text inside each block keeps its own reading direction.
  const textDir = (await getLocale()) === "fa" ? "rtl" : "ltr";

  const profiles: { label: string; href: string; icon: SocialIconName; external: boolean }[] = [
    { label: "Instagram", href: site.social.instagram, icon: "instagram", external: true },
    { label: "GitHub", href: site.social.github, icon: "github", external: true },
    { label: "LinkedIn", href: site.social.linkedin, icon: "linkedin", external: true },
    { label: "Gmail", href: gmailComposeUrl, icon: "email", external: true },
  ];
  const links = profiles.filter((link) => link.href);

  return (
    <footer className="surface-ink bg-ink text-canvas">
      <div dir="ltr" className="container-page py-16 md:py-20">
        <div className="flex flex-col gap-12 md:flex-row md:items-start md:justify-between">
          <div dir={textDir} className="max-w-sm text-left">
            <Wordmark className="text-canvas" onDark />
            <p className="mt-5 text-lg text-mist">{t("tagline")}</p>
          </div>

          <div className="flex flex-col gap-10 sm:flex-row sm:gap-16">
            <nav aria-label={t("siteLinks")} dir={textDir} className="text-left">
              <h2 className="label-eyebrow text-fog">{t("siteLinks")}</h2>
              <ul className="mt-5 space-y-3">
                {(["services", "process", "projects", "blog", "about", "contact"] as const).map(
                  (key) => (
                    <li key={key}>
                      <Link
                        href={key === "about" || key === "blog" ? `/${key}` : `/#${key}`}
                        className="text-mist transition-colors hover:text-cobalt-light"
                      >
                        {nav(key)}
                      </Link>
                    </li>
                  ),
                )}
              </ul>
            </nav>

            <nav aria-label={t("elsewhere")}>
              <h2 dir={textDir} className="label-eyebrow text-left text-fog">{t("elsewhere")}</h2>
              <ul className="mt-5 space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(link.external ? { target: "_blank", rel: "noreferrer noopener" } : {})}
                      className="inline-flex items-center gap-3 text-mist transition-colors hover:text-cobalt-light"
                    >
                      <SocialIcon name={link.icon} />
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </div>

        <p dir={textDir} className="mt-14 border-t border-fog/20 pt-8 text-left text-sm text-fog">
          © {year} {site.name}. {t("rights")}
        </p>
      </div>
    </footer>
  );
}
