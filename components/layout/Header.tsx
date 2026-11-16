"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { Wordmark } from "@/components/ui/Logo";
import { buttonStyles } from "@/components/ui/Button";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeToggle } from "./ThemeToggle";

const navItems = [
  { key: "homeNav", href: "/" },
  { key: "services", href: "/services" },
  { key: "projects", href: "/#projects" },
  { key: "blog", href: "/blog" },
  { key: "about", href: "/about" },
  { key: "chat", href: "/chat" },
] as const;

export function Header() {
  const t = useTranslations("nav");
  const hero = useTranslations("hero");
  const headerRef = useRef<HTMLElement>(null);
  // The announcement strip scrolls away above the sticky header, so the
  // mobile menu opens from wherever the header's bottom edge is right now.
  const [menuTop, setMenuTop] = useState(80);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Close the mobile menu on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll while the mobile menu is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:start-4 focus:z-50 focus:rounded-full focus:bg-ink focus:px-5 focus:py-3 focus:text-canvas"
      >
        {t("skipToContent")}
      </a>

      {/* Announcement strip (Superhuman's top banner) — scrolls away */}
      <div className="surface-ink hidden bg-ink text-canvas sm:block">
        <p className="container-page flex items-center justify-center gap-x-3 gap-y-1 py-2.5 text-center text-[0.8125rem] flex-wrap">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-cobalt-light" />
          <span className="text-canvas/85">{hero("announce")}</span>
          <Link
            href="/contact"
            className="font-medium text-canvas underline decoration-canvas/40 underline-offset-4 hover:decoration-canvas"
          >
            {hero("announceLink")} <span className="rtl:hidden">→</span><span className="hidden rtl:inline">←</span>
          </Link>
        </p>
      </div>

      <header
        ref={headerRef}
        className={`sticky top-0 z-40 transition-all duration-300 ${
          scrolled
            ? "border-b border-ink/10 bg-canvas/80 backdrop-blur-xl"
            : "border-b border-transparent bg-transparent"
        }`}
      >
        {/* Three zones: logo | nav pill | CTA + language. The grid's 1fr side
            columns keep the pill centred whatever the side widths, and the
            whole row mirrors in RTL. Slightly wider than container-page so
            the pill has room to breathe at xl. */}
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between gap-4 px-gutter xl:grid xl:grid-cols-[1fr_auto_1fr] xl:gap-8">
          <Link
            href="/"
            className="justify-self-start text-ink transition-opacity hover:opacity-80"
            aria-label={t("home")}
          >
            <Wordmark />
          </Link>

          <nav
            className="hidden items-center gap-1 xl:flex"
            aria-label={t("primary")}
          >
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-[0.9375rem] whitespace-nowrap text-ink/70 transition-colors hover:text-ink"
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>

          <div className="flex items-center justify-end gap-3">
            <div className="hidden md:block">
              <Link href="/contact" className={`${buttonStyles("primary")} whitespace-nowrap`}>
                {t("cta")}
              </Link>
            </div>

            <ThemeToggle />

            <div className="hidden sm:block">
              <LocaleSwitch />
            </div>

            <button
              type="button"
              onClick={() => {
                setMenuTop(headerRef.current?.getBoundingClientRect().bottom ?? 80);
                setOpen((v) => !v);
              }}
              aria-expanded={open}
              aria-controls="mobile-menu"
              className="grid h-11 w-11 place-items-center rounded-full border border-ink/20 text-ink xl:hidden"
            >
              <span className="sr-only">{open ? t("close") : t("menu")}</span>
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                aria-hidden="true"
              >
                {open ? (
                  <path d="M5 5l14 14M19 5L5 19" />
                ) : (
                  <path d="M3 7h18M3 12h18M3 17h18" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {open ? (
        <div
          id="mobile-menu"
          className="fixed inset-x-0 bottom-0 z-30 overflow-y-auto bg-canvas xl:hidden"
          style={{ top: menuTop }}
        >
          <nav
            className="container-page flex flex-col gap-1 py-8"
            aria-label={t("primary")}
          >
            {navItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="border-b border-ink/10 py-5 text-3xl font-light text-ink"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {t(item.key)}
              </Link>
            ))}
            <Link
              href="/contact"
              className={`mt-6 justify-center ${buttonStyles("primary")}`}
            >
              {t("cta")}
            </Link>
            <div className="pt-8">
              <LocaleSwitch />
            </div>
          </nav>
        </div>
      ) : null}
    </>
  );
}
