"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";

import { AdminLocaleSwitcher } from "../AdminLocaleSwitcher";
import { Icon, ICONS } from "./icons";
import { GROUPS, groupForPath, isActiveLink } from "./nav-config";
import s from "./shell.module.css";

/* ------------------------------------------------------------- sky context */

const SKY_KEY = "admin.spatial.sky";
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

interface SkyState {
  sky: number;
  setSky: (v: number) => void;
  saveSky: (v: number) => void;
}

const SkyContext = createContext<SkyState>({ sky: 72, setSky: () => {}, saveSky: () => {} });

/** Sky brightness, shared by the background (shell) and the Overview's slider. A per-viewer preference kept in localStorage. */
export function useSky() {
  return useContext(SkyContext);
}

/* ------------------------------------------------------------------ shell */

/**
 * The persistent admin environment: sky, icon rail and (outside Overview) the
 * section tab bar plus a frosted-glass page window. It lives in the protected
 * layout, so moving between admin pages swaps only the window's contents —
 * the sky and rail never reload. Overview draws its own tabs and window.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOverview = pathname === "/admin";
  const roomRef = useRef<HTMLDivElement>(null);

  const [sky, setSky] = useState(72);
  useEffect(() => {
    let saved = 72;
    try {
      const raw = window.localStorage.getItem(SKY_KEY);
      if (raw) saved = clamp(Number(raw) || 72, 1, 100);
    } catch {
      /* storage blocked — keep default */
    }
    setSky(saved);
  }, []);
  const saveSky = useCallback((v: number) => {
    try {
      window.localStorage.setItem(SKY_KEY, String(Math.round(v)));
    } catch {
      /* ignore */
    }
  }, []);

  /* gentle sky parallax on every page */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 900px), (prefers-reduced-motion: reduce)");
    let tx = 0;
    let ty = 0;
    let sx = 0;
    let sy = 0;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const loop = () => {
      sx += (tx - sx) * 0.05;
      sy += (ty - sy) * 0.05;
      const room = roomRef.current;
      if (room) room.style.transform = mq.matches ? "" : `scale(1.04) translate(${(sx * 18).toFixed(2)}px, ${(sy * 12).toFixed(2)}px)`;
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <SkyContext.Provider value={{ sky, setSky, saveSky }}>
      <div className={`${s.shell} ${isOverview ? s.shellOverview : ""}`}>
        <SkyBackdrop sky={sky} roomRef={roomRef} />

        <Rail pathname={pathname} />

        {isOverview ? (
          children
        ) : (
          <div className={s.page}>
            <SectionTabs pathname={pathname} />
            <main className={`${s.glass} ${s.window} glass-theme`}>
              <div className={s.content} key={pathname}>
                {children}
              </div>
            </main>
          </div>
        )}
      </div>
    </SkyContext.Provider>
  );
}

/* -------------------------------------------------------------------- sky */

/** The animated sky behind every admin screen (also used by the login page). */
export function SkyBackdrop({ sky, roomRef }: { sky: number; roomRef?: RefObject<HTMLDivElement | null> }) {
  return (
    <div className={s.room} ref={roomRef} aria-hidden="true">
      <div className={s.sky} />
      <div className={`${s.cloud} ${s.cloudA}`} />
      <div className={`${s.cloud} ${s.cloudB}`} />
      <div className={`${s.cloud} ${s.cloudC}`} />
      <div className={`${s.cloud} ${s.cloudD}`} />
      <div className={s.sun} style={{ opacity: 0.35 + (sky / 100) * 0.65 }} />
      <div className={s.vignette} />
      <div className={s.dim} style={{ opacity: ((100 - sky) / 100) * 0.34 }} />
    </div>
  );
}

/** Login screen: the same sky with one centred glass card — no rail, no tabs. */
export function AdminLoginShell({ children }: { children: ReactNode }) {
  const [sky, setSky] = useState(72);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SKY_KEY);
      if (raw) setSky(clamp(Number(raw) || 72, 1, 100));
    } catch {
      /* storage blocked — keep default */
    }
  }, []);
  return (
    <div className={s.shell}>
      <SkyBackdrop sky={sky} />
      <main className={s.loginStage}>
        <div className={`${s.glass} ${s.loginCard} glass-theme`}>{children}</div>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------- rail */

function Rail({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  const tDash = useTranslations("dashboard");
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const activeGroup = groupForPath(pathname);

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <nav className={`${s.glass} ${s.rail}`} aria-label={tDash("railLabel")}>
      {GROUPS.map((group, i) => {
        const active = group.key === activeGroup.key;
        return (
          <Link
            key={group.key}
            href={group.links[0].href}
            className={`${s.railBtn} ${active ? s.railActive : ""}`}
            style={{ "--i": i } as CSSProperties}
            aria-current={active ? "page" : undefined}
            aria-label={t(group.key)}
          >
            <Icon>{ICONS[group.icon]}</Icon>
            <span className={`${s.glass} ${s.tip}`} aria-hidden="true">
              {t(group.key)}
            </span>
          </Link>
        );
      })}
      <span className={s.railSep} />
      <AdminLocaleSwitcher className={`${s.railBtn} ${s.railLocale}`} />
      <button type="button" className={s.railBtn} onClick={logout} disabled={loggingOut} style={{ "--i": 8 } as CSSProperties} aria-label={t("signOut")}>
        <Icon>{ICONS.logout}</Icon>
        <span className={`${s.glass} ${s.tip}`} aria-hidden="true">
          {loggingOut ? t("signingOut") : t("signOut")}
        </span>
      </button>
    </nav>
  );
}

/* ----------------------------------------------------------- section tabs */

function SectionTabs({ pathname }: { pathname: string }) {
  const t = useTranslations("nav");
  const group = groupForPath(pathname);
  const barRef = useRef<HTMLElement>(null);
  const refs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const activeHref = group.links.find((l) => isActiveLink(pathname, l.href))?.href;
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = activeHref ? refs.current[activeHref] : null;
      setInd(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
      el?.scrollIntoView({ block: "nearest", inline: "nearest" });
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [activeHref, group.key]);

  return (
    <nav ref={barRef} className={`${s.glass} ${s.tabs}`} aria-label={t(group.key)}>
      {ind ? <span className={s.tabIndicator} style={{ left: ind.left, width: ind.width }} aria-hidden="true" /> : null}
      {group.links.map((link) => {
        const active = link.href === activeHref;
        return (
          <Link
            key={link.href}
            href={link.href}
            ref={(el) => {
              refs.current[link.href] = el;
            }}
            className={`${s.tab} ${active ? s.tabActive : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
