"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import type { AnalyticsSnapshot } from "@/lib/admin/analytics";
import type { DashboardStats } from "@/lib/admin/queries";
import type { WeekdaySchedule } from "@/lib/ai/model-config";
import type { Channel } from "@/lib/ai/types";

import { AdminLocaleSwitcher } from "../AdminLocaleSwitcher";
import { ChannelBreakdownChart, CostByModelChart } from "../DashboardCharts";
import s from "./spatial.module.css";

/* ------------------------------------------------------------------ types */

export interface SpatialChannel {
  channel: Channel;
  conversations: number;
  model: {
    activeModel: string;
    label: string;
    temperature: number;
    maxTokens: number;
    topP: number;
    fallbackModel: string | null;
    schedule: WeekdaySchedule | null;
  };
  latest: {
    id: string;
    lastActiveAt: string;
    who: string;
    isEmail: boolean;
    messages: Array<{ id: string; role: "user" | "assistant"; content: string }>;
  } | null;
}

interface OverdueItem {
  id: string;
  subject: string;
  contactId: string;
  contactName: string;
  dueAt: string | null;
}

interface Props {
  days: number;
  locale: string;
  channels: SpatialChannel[];
  stats: DashboardStats;
  analytics: AnalyticsSnapshot;
  overdue: OverdueItem[];
}

/* ---------------------------------------------------------------- helpers */

const RANGE_OPTIONS = [7, 30, 90];
const TEMP_MIN = 0;
const TEMP_MAX = 2;
const LIVE_WINDOW_MS = 15 * 60 * 1000;
const SKY_KEY = "admin.spatial.sky";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

function numberFormat(locale: string, digits = 0) {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** Ease-out tween toward `target`; `instant` follows it 1:1 (used while dragging). */
function useTween(target: number, { ms = 700, instant = false }: { ms?: number; instant?: boolean } = {}) {
  const [value, setValue] = useState(target);
  const ref = useRef(target);

  useEffect(() => {
    if (instant) {
      ref.current = target;
      setValue(target);
      return;
    }
    const start = ref.current;
    if (start === target) return;
    const t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = start + (target - start) * eased;
      ref.current = v;
      setValue(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, instant]);

  return value;
}

/** Flips to true after `delay` ms — drives the intro sweeps (dial, slider, counters). */
function useIntro(delay: number) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setDone(true), delay);
    return () => window.clearTimeout(id);
  }, [delay]);
  return done;
}

/* ------------------------------------------------------------------ icons */

function Icon({ children, size = 22 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  pen: (
    <>
      <path d="M4 20h4L19 9l-4-4L4 16z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />,
  inbox: (
    <>
      <path d="M4 13h4l1.5 3h5L16 13h4" />
      <path d="M5.5 5h13L20 13v6H4v-6z" />
    </>
  ),
  people: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M16 5.2a3 3 0 0 1 0 5.6M17.5 14.3c1.6.6 2.7 2.2 3 4.7" />
    </>
  ),
  broadcast: (
    <>
      <circle cx="12" cy="12" r="2" />
      <path d="M8 8a5.6 5.6 0 0 0 0 8M16 8a5.6 5.6 0 0 1 0 8M5.2 5.2a9.6 9.6 0 0 0 0 13.6M18.8 5.2a9.6 9.6 0 0 1 0 13.6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M3.5 12h17M12 3.5c2.4 2.4 3.5 5.2 3.5 8.5S14.4 18.1 12 20.5C9.6 18.1 8.5 15.3 8.5 12S9.6 5.9 12 3.5z" />
    </>
  ),
  send: <path d="M21 3 3 10.5l7 2.5 2.5 7zM10 13l5-5" />,
  bubble: <path d="M5 5h14a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-6l-4 3.5V17H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  handoff: (
    <>
      <path d="M3 12h10M9 8l4 4-4 4" />
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4" />
    </>
  ),
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  reset: (
    <>
      <path d="M4 12a8 8 0 1 0 2.4-5.7" />
      <path d="M4 4v4.5h4.5" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3" />
      <path d="M10 8l-4 4 4 4M6 12h10" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

const CHANNEL_ICON: Record<Channel, ReactNode> = { web: ICONS.globe, telegram: ICONS.send, widget: ICONS.bubble };
const CHANNEL_LABEL_KEY = { web: "channelWeb", telegram: "channelTelegram", widget: "channelWidget" } as const;

const RAIL: Array<{ href: string; icon: ReactNode; labelKey: "groupOverview" | "groupContent" | "groupKnowledgeAi" | "groupInboxPeople" | "groupCrm" | "groupChannels" | "groupSystem" }> = [
  { href: "/admin", icon: ICONS.home, labelKey: "groupOverview" },
  { href: "/admin/blog", icon: ICONS.pen, labelKey: "groupContent" },
  { href: "/admin/knowledge", icon: ICONS.spark, labelKey: "groupKnowledgeAi" },
  { href: "/admin/conversations", icon: ICONS.inbox, labelKey: "groupInboxPeople" },
  { href: "/admin/leads", icon: ICONS.people, labelKey: "groupCrm" },
  { href: "/admin/channels", icon: ICONS.broadcast, labelKey: "groupChannels" },
  { href: "/admin/team", icon: ICONS.gear, labelKey: "groupSystem" },
];

/* --------------------------------------------------------------- the page */

export function SpatialOverview({ days, locale, channels, stats, analytics, overdue }: Props) {
  const t = useTranslations("dashboard");
  const tNav = useTranslations("nav");
  const tOverdue = useTranslations("crmOverdue");
  const router = useRouter();

  const roomRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState<Channel>("web");
  const [shown, setShown] = useState<Channel>("web"); // what the camera tile shows (swaps behind the curtain)
  const [curtain, setCurtain] = useState<"idle" | "cover" | "reveal">("idle");
  const [dip, setDip] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [temps, setTemps] = useState<Record<Channel, number>>(() =>
    Object.fromEntries(channels.map((c) => [c.channel, c.model.temperature])) as Record<Channel, number>,
  );
  const [sky, setSky] = useState(72);
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [pendingDays, setPendingDays] = useState(days);
  const [loggingOut, setLoggingOut] = useState(false);

  const introDone = useIntro(1500);
  const fmt0 = numberFormat(locale);
  const fmt1 = numberFormat(locale, 1);
  const fmt2 = numberFormat(locale, 2);

  const current = channels.find((c) => c.channel === active) ?? channels[0];
  const shownChannel = channels.find((c) => c.channel === shown) ?? channels[0];
  const channelName = (c: Channel) => t(CHANNEL_LABEL_KEY[c]);

  /* toast */
  const toastTimer = useRef<number | undefined>(undefined);
  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast({ text, id: Date.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 2400);
  }, []);

  /* clock */
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* sky brightness — a per-viewer preference */
  useEffect(() => {
    let saved = 72;
    try {
      const raw = window.localStorage.getItem(SKY_KEY);
      if (raw) saved = clamp(Number(raw) || 72, 1, 100);
    } catch {
      /* storage blocked — keep default */
    }
    setSky(20);
    const id = window.setTimeout(() => setSky(saved), 1300);
    return () => window.clearTimeout(id);
  }, []);
  const saveSky = useCallback((v: number) => {
    try {
      window.localStorage.setItem(SKY_KEY, String(Math.round(v)));
    } catch {
      /* ignore */
    }
  }, []);

  /* keep the server's days in sync once a range navigation lands */
  useEffect(() => setPendingDays(days), [days]);

  /* parallax + 3D tilt */
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
      const ui = tiltRef.current;
      if (room && ui) {
        if (mq.matches) {
          room.style.transform = "";
          ui.style.transform = "";
        } else {
          room.style.transform = `scale(1.04) translate(${(sx * 18).toFixed(2)}px, ${(sy * 12).toFixed(2)}px)`;
          ui.style.transform = `translate(${(sx * -14).toFixed(2)}px, ${(sy * -10).toFixed(2)}px) rotateY(${(sx * 4).toFixed(3)}deg) rotateX(${(-sy * 3).toFixed(3)}deg)`;
        }
      }
      raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove);
    raf = requestAnimationFrame(loop);
    return () => {
      window.removeEventListener("pointermove", onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* channel switch: curtain wipe on the tile, titles roll, cards dip, dial re-animates */
  const switchTimers = useRef<number[]>([]);
  function switchChannel(next: Channel) {
    if (next === active) return;
    switchTimers.current.forEach((id) => window.clearTimeout(id));
    setActive(next);
    setExpanded(false);
    setCurtain("cover");
    setDip(true);
    switchTimers.current = [
      window.setTimeout(() => {
        setShown(next);
        setCurtain("reveal");
      }, 450),
      window.setTimeout(() => setCurtain("idle"), 1000),
      window.setTimeout(() => setDip(false), 650),
    ];
    showToast(t("switchedToast", { channel: channelName(next) }));
  }

  async function saveTemperature(channel: Channel, value: number) {
    const row = channels.find((c) => c.channel === channel);
    if (!row) return;
    const rounded = Math.round(value * 100) / 100;
    try {
      const res = await fetch("/api/admin/model-config", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          channel,
          activeModel: row.model.activeModel,
          temperature: rounded,
          maxTokens: row.model.maxTokens,
          topP: row.model.topP,
          fallbackModel: row.model.fallbackModel,
          schedule: row.model.schedule,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      showToast(t("dialSaved", { channel: channelName(channel), value: fmt2.format(rounded) }));
    } catch {
      setTemps((prev) => ({ ...prev, [channel]: row.model.temperature }));
      showToast(t("dialFailed"));
    }
  }

  function changeRange(d: number) {
    if (d === pendingDays) return;
    setPendingDays(d);
    router.push(`/admin?days=${d}`, { scroll: false });
    showToast(t("toastRange", { days: fmt0.format(d) }));
  }

  function runMorningCheck() {
    router.refresh();
    showToast(
      t("sceneToast", {
        handoffs: fmt0.format(stats.openHandoffsCount),
        overdue: fmt0.format(overdue.length),
        leads: fmt0.format(analytics.leadsCount),
      }),
    );
  }

  async function logout() {
    setLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  const dimOpacity = ((100 - sky) / 100) * 0.34;
  const isLive = Boolean(now && shownChannel.latest && now.getTime() - new Date(shownChannel.latest.lastActiveAt).getTime() < LIVE_WINDOW_MS);
  const clock = now ? now.toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-GB", { hour12: false }) : "--:--:--";

  return (
    <div className={s.stage}>
      {/* ---------- sky ---------- */}
      <div className={s.room} ref={roomRef} aria-hidden="true">
        <div className={s.sky} />
        <div className={`${s.cloud} ${s.cloudA}`} />
        <div className={`${s.cloud} ${s.cloudB}`} />
        <div className={`${s.cloud} ${s.cloudC}`} />
        <div className={`${s.cloud} ${s.cloudD}`} />
        <div className={s.sun} style={{ opacity: 0.35 + (sky / 100) * 0.65 }} />
        <div className={s.vignette} />
        <div className={s.dim} style={{ opacity: dimOpacity }} />
      </div>

      <div className={s.screen}>
        <div className={s.artboard}>
          <div className={s.tilt} ref={tiltRef}>
            {/* ---------- channel tabs ---------- */}
            <ChannelTabs
              label={t("tabsLabel")}
              active={active}
              channels={channels.map((c) => c.channel)}
              channelName={channelName}
              onSelect={switchChannel}
              manageLabel={t("manageChannels")}
            />

            {/* ---------- icon rail ---------- */}
            <nav className={`${s.glass} ${s.rail}`} aria-label={t("railLabel")}>
              {RAIL.map((item, i) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${s.railBtn} ${item.href === "/admin" ? s.railActive : ""}`}
                  style={{ "--i": i } as CSSProperties}
                  aria-current={item.href === "/admin" ? "page" : undefined}
                >
                  <Icon>{item.icon}</Icon>
                  <span className={`${s.glass} ${s.tip}`}>{tNav(item.labelKey)}</span>
                </Link>
              ))}
              <span className={s.railSep} />
              <AdminLocaleSwitcher className={`${s.railBtn} ${s.railLocale}`} />
              <button type="button" className={s.railBtn} onClick={logout} disabled={loggingOut} style={{ "--i": 8 } as CSSProperties}>
                <Icon>{ICONS.logout}</Icon>
                <span className={`${s.glass} ${s.tip}`}>{loggingOut ? tNav("signingOut") : tNav("signOut")}</span>
              </button>
            </nav>

            {/* ---------- window ---------- */}
            <main className={`${s.glass} ${s.window}`}>
              <h1 className={s.srOnly}>{t("title")}</h1>

              {/* live conversation tile */}
              <LiveTile
                className={`${s.card} ${s.cam} ${expanded ? s.camExpanded : ""} ${dip ? s.dip : ""}`}
                style={{ "--i": 0 } as CSSProperties}
                expanded={expanded}
                onToggle={() => setExpanded((v) => !v)}
                curtain={curtain}
                channel={shownChannel}
                channelName={channelName(shown)}
                isLive={isLive}
                clock={clock}
              />

              {/* temperature dial */}
              <section className={`${s.card} ${s.dialCard} ${dip ? s.dip : ""}`} style={{ "--i": 1 } as CSSProperties} aria-labelledby="dial-title">
                <TemperatureDial
                  key="dial"
                  titleId="dial-title"
                  locale={locale}
                  channel={active}
                  channelName={channelName(active)}
                  modelLabel={current.model.label}
                  value={introDone ? temps[active] : TEMP_MIN}
                  onChange={(v) => setTemps((prev) => ({ ...prev, [active]: v }))}
                  onCommit={(v) => saveTemperature(active, v)}
                  onReset={() => {
                    setTemps((prev) => ({ ...prev, [active]: 0.7 }));
                    saveTemperature(active, 0.7);
                  }}
                />
              </section>

              {/* scene pill */}
              <ScenePill className={`${s.card} ${s.scene} ${dip ? s.dip : ""}`} style={{ "--i": 2 } as CSSProperties} onPlay={runMorningCheck} />

              {/* handoffs */}
              <section className={`${s.card} ${s.small} ${dip ? s.dip : ""}`} style={{ "--i": 3 } as CSSProperties}>
                <div className={s.smallTop}>
                  <span className={`${s.roundIcon} ${stats.openHandoffsCount ? s.roundIconPulse : ""}`}>
                    <Icon>{ICONS.handoff}</Icon>
                  </span>
                  <Link href="/admin/handoffs" className={`${s.roundIcon} ${s.roundIconLight}`} aria-label={`${t("open")}: ${t("handoffsTitle")}`}>
                    <Icon>{ICONS.arrow}</Icon>
                  </Link>
                  <span className={s.smallStatus}>
                    {stats.openHandoffsCount ? t("handoffsOpen", { count: fmt0.format(stats.openHandoffsCount) }) : t("handoffsClear")}
                  </span>
                </div>
                <div className={s.smallBottom}>
                  <p className={s.cardTitle}>
                    <span className={s.roll} key={`h-${active}`}>{t("handoffsTitle")}</span>
                  </p>
                  <p className={s.cardSub}>{t("handoffsSub")}</p>
                  <div className={s.bar}>
                    <span style={{ width: `${clamp(stats.openHandoffsCount * 10, 4, 100)}%` }} />
                  </div>
                </div>
              </section>

              {/* leads (gradient card) */}
              <section className={`${s.card} ${s.lights} ${dip ? s.dip : ""}`} style={{ "--i": 4, "--glow": (0.25 + (sky / 100) * 0.75).toFixed(2) } as CSSProperties}>
                <div className={s.smallTop}>
                  <span className={s.bulb}>
                    <Icon>{ICONS.target}</Icon>
                  </span>
                  <span className={s.lightsCount}>{fmt0.format(analytics.leadsCount)}</span>
                </div>
                <div className={s.smallBottom}>
                  <p className={s.cardTitle}>
                    <span className={s.roll} key={`l-${active}`}>{t("leadsTitle")}</span>
                  </p>
                  <p className={s.cardSub}>{t("leadsSub", { pct: fmt1.format(analytics.conversionRatePct), days: fmt0.format(days) })}</p>
                  <Link href="/admin/leads" className={s.lightsLink}>
                    {t("open")}
                    <Icon size={16}>{ICONS.arrow}</Icon>
                  </Link>
                </div>
              </section>

              {/* sky brightness slider */}
              <SkySlider
                className={`${s.card} ${s.slider} ${dip ? s.dip : ""}`}
                style={{ "--i": 5 } as CSSProperties}
                label={t("skyLabel")}
                value={sky}
                locale={locale}
                onChange={setSky}
                onCommit={saveSky}
              />

              {/* activity (replaces the music player) */}
              <ActivityCard
                className={`${s.card} ${s.music} ${dip ? s.dip : ""}`}
                style={{ "--i": 6 } as CSSProperties}
                locale={locale}
                days={days}
                pendingDays={pendingDays}
                onRange={changeRange}
                analytics={analytics}
                introDone={introDone}
              />
            </main>
          </div>
        </div>
      </div>

      {/* ---------- details below the fold ---------- */}
      <section className={s.details} aria-label={t("moreTitle")}>
        <div className={`${s.glass} ${s.detailsWindow}`}>
          <div className={`${s.card} ${s.detailCard} ${s.detailWide}`}>
            <div className={s.detailHead}>
              <h2 className={s.detailTitle}>
                {tOverdue("title")}
                {overdue.length ? <span className={s.badge}>{fmt0.format(overdue.length)}</span> : null}
              </h2>
              <Link href="/admin/activities?overdue=1" className={s.detailLink}>
                {tOverdue("viewAll")}
              </Link>
            </div>
            {overdue.length === 0 ? (
              <p className={s.cardSub}>{tOverdue("empty")}</p>
            ) : (
              <ul className={s.overdueList}>
                {overdue.map((a) => (
                  <li key={a.id}>
                    <Link href={`/admin/contacts/${a.contactId}`}>
                      {a.subject} <span>· {a.contactName}</span>
                    </Link>
                    {a.dueAt ? (
                      <span className={s.due}>
                        {tOverdue("due", {
                          when: new Date(a.dueAt).toLocaleString(locale === "fa" ? "fa-IR" : "en-GB", { dateStyle: "medium", timeStyle: "short" }),
                        })}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className={`${s.card} ${s.detailCard}`}>
            <h2 className={s.detailTitle}>{t("chartByChannelTitle")}</h2>
            <ChannelBreakdownChart sessionsByChannel={analytics.sessionsByChannel} tone="glass" />
          </div>

          <div className={`${s.card} ${s.detailCard}`}>
            <h2 className={s.detailTitle}>{t("chartCostTitle")}</h2>
            <p className={s.cardSub}>{t("chartCostSubtitle", { amount: analytics.monthlySpendUsd.toFixed(2) })}</p>
            <CostByModelChart byModel={analytics.byModel} tone="glass" />
          </div>

          <div className={`${s.card} ${s.detailCard} ${s.detailWide}`}>
            <h2 className={s.detailTitle}>{t("topTopicsTitle")}</h2>
            <p className={s.cardSub}>{t("topTopicsSubtitle", { days })}</p>
            {analytics.topTopics.length === 0 ? (
              <p className={s.cardSub}>{t("topTopicsEmpty")}</p>
            ) : (
              <div className={s.topics}>
                {analytics.topTopics.map((topic) => (
                  <span key={topic.title}>
                    {topic.title} <em>· {fmt0.format(topic.count)}</em>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={`${s.card} ${s.detailCard} ${s.detailWide} ${s.kb}`}>
            <h2 className={s.detailTitle}>{t("statDocuments")}</h2>
            <p className={s.cardSub}>
              {fmt0.format(stats.documentsCount)} · {t("hintChunks", { count: fmt0.format(stats.chunksCount) })}
            </p>
          </div>
        </div>
      </section>

      {/* ---------- toast ---------- */}
      <div className={`${s.glass} ${s.toast} ${toast ? s.toastOn : ""}`} role="status" aria-live="polite">
        <span className={s.toastCheck}>
          <Icon size={16}>{ICONS.check}</Icon>
        </span>
        <span>{toast?.text ?? ""}</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ channel tabs */

function ChannelTabs({
  label,
  active,
  channels,
  channelName,
  onSelect,
  manageLabel,
}: {
  label: string;
  active: Channel;
  channels: Channel[];
  channelName: (c: Channel) => string;
  onSelect: (c: Channel) => void;
  manageLabel: string;
}) {
  const refs = useRef<Partial<Record<Channel, HTMLButtonElement | null>>>({});
  const [ind, setInd] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = refs.current[active];
      if (el) setInd({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  return (
    <div className={`${s.glass} ${s.tabs}`} role="tablist" aria-label={label}>
      {ind ? <span className={s.tabIndicator} style={{ left: ind.left, width: ind.width }} aria-hidden="true" /> : null}
      {channels.map((c) => (
        <button
          key={c}
          ref={(el) => {
            refs.current[c] = el;
          }}
          type="button"
          role="tab"
          aria-selected={c === active}
          className={`${s.tab} ${c === active ? s.tabActive : ""}`}
          onClick={() => onSelect(c)}
        >
          <Icon size={20}>{CHANNEL_ICON[c]}</Icon>
          <span>{channelName(c)}</span>
        </button>
      ))}
      <Link href="/admin/channels" className={s.tabPlus} aria-label={manageLabel} title={manageLabel}>
        <Icon size={20}>{ICONS.plus}</Icon>
      </Link>
    </div>
  );
}

/* --------------------------------------------------------------- live tile */

function LiveTile({
  className,
  style,
  expanded,
  onToggle,
  curtain,
  channel,
  channelName,
  isLive,
  clock,
}: {
  className: string;
  style: CSSProperties;
  expanded: boolean;
  onToggle: () => void;
  curtain: "idle" | "cover" | "reveal";
  channel: SpatialChannel;
  channelName: string;
  isLive: boolean;
  clock: string;
}) {
  const t = useTranslations("dashboard");
  const latest = channel.latest;
  const messages = latest ? (expanded ? latest.messages : latest.messages.slice(-2)) : [];
  const who = latest ? (latest.isEmail ? latest.who : t("visitor", { id: latest.who })) : "";

  function onKey(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggle();
    }
    if (e.key === "Escape" && expanded) onToggle();
  }

  return (
    <div
      className={className}
      style={style}
      role="button"
      tabIndex={0}
      aria-expanded={expanded}
      aria-label={expanded ? t("collapseTile") : t("expandTile")}
      onClick={onToggle}
      onKeyDown={onKey}
    >
      <div className={s.camFeed} key={channel.channel}>
        <div className={s.camSky} />
        <div className={s.camMessages}>
          {latest ? (
            messages.map((m) => (
              <p key={m.id} dir="auto" className={m.role === "user" ? s.msgUser : s.msgBot}>
                <span className={s.msgRole}>{m.role === "user" ? t("roleUser") : t("roleBot")}</span>
                <span className={s.msgText}>{m.content}</span>
              </p>
            ))
          ) : (
            <p className={s.camEmpty}>{t("noConversation")}</p>
          )}
        </div>
      </div>
      <div className={s.scanlines} aria-hidden="true" />
      <div className={s.camShade} aria-hidden="true" />

      <span className={`${s.glass} ${s.liveChip}`}>
        <span className={`${s.liveDot} ${isLive ? "" : s.liveDotIdle}`} />
        {isLive ? t("liveChip") : t("idleChip")}
      </span>
      <span className={s.rec}>
        {t("rec")} · <span dir="ltr">{clock}</span>
      </span>

      <div className={s.camCaption}>
        <p className={s.camTitle}>
          <span className={s.roll} key={`c-${channel.channel}`}>{channelName}</span>
        </p>
        <p className={s.camSub}>
          {t("latestConversation")}
          {who ? ` · ${who}` : ""}
        </p>
      </div>

      {expanded && latest ? (
        <Link href={`/admin/conversations/${latest.id}`} className={`${s.glass} ${s.camOpen}`} onClick={(e) => e.stopPropagation()}>
          {t("openInInbox")}
          <Icon size={16}>{ICONS.arrow}</Icon>
        </Link>
      ) : null}

      <div className={`${s.curtain} ${curtain === "cover" ? s.curtainCover : curtain === "reveal" ? s.curtainReveal : ""}`} aria-hidden="true" />
    </div>
  );
}

/* --------------------------------------------------------- temperature dial */

const R = 104;
const C = 130;

function polar(angleDeg: number, r = R) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: C + r * Math.sin(a), y: C - r * Math.cos(a) };
}

function arcPath(fromDeg: number, toDeg: number) {
  const a = polar(fromDeg);
  const b = polar(toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 ${large} 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

function TemperatureDial({
  titleId,
  locale,
  channel,
  channelName,
  modelLabel,
  value,
  onChange,
  onCommit,
  onReset,
}: {
  titleId: string;
  locale: string;
  channel: Channel;
  channelName: string;
  modelLabel: string;
  value: number;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
  onReset: () => void;
}) {
  const t = useTranslations("dashboard");
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState(false);
  const lastRef = useRef(value);
  const shown = useTween(value, { ms: 700, instant: dragging });
  const fmt2 = numberFormat(locale, 2);

  const f = clamp((shown - TEMP_MIN) / (TEMP_MAX - TEMP_MIN), 0, 1);
  const angle = -135 + 270 * f;
  const knob = polar(angle);
  const status = value < 0.4 ? "dialPrecise" : value <= 1 ? "dialBalanced" : "dialCreative";

  function valueFromPointer(e: ReactPointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return value;
    const box = svg.getBoundingClientRect();
    const dx = e.clientX - (box.left + box.width / 2);
    const dy = e.clientY - (box.top + box.height / 2);
    let deg = (Math.atan2(dx, -dy) * 180) / Math.PI; // 0 at top, clockwise
    if (deg > 135) deg = 135;
    if (deg < -135) deg = -135;
    const v = TEMP_MIN + ((deg + 135) / 270) * (TEMP_MAX - TEMP_MIN);
    return Math.round(v / 0.05) * 0.05;
  }

  function onDown(e: ReactPointerEvent<SVGSVGElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    const v = valueFromPointer(e);
    lastRef.current = v;
    onChange(v);
  }
  function onMove(e: ReactPointerEvent<SVGSVGElement>) {
    if (!dragging) return;
    const v = valueFromPointer(e);
    lastRef.current = v;
    onChange(v);
  }
  function onUp() {
    if (!dragging) return;
    setDragging(false);
    onCommit(lastRef.current);
  }
  function onKey(e: ReactKeyboardEvent<SVGSVGElement>) {
    const step = e.shiftKey ? 0.25 : 0.05;
    let next: number | null = null;
    if (e.key === "ArrowUp" || e.key === "ArrowRight") next = value + step;
    if (e.key === "ArrowDown" || e.key === "ArrowLeft") next = value - step;
    if (e.key === "Home") next = TEMP_MIN;
    if (e.key === "End") next = TEMP_MAX;
    if (next === null) return;
    e.preventDefault();
    const v = Math.round(clamp(next, TEMP_MIN, TEMP_MAX) * 100) / 100;
    onChange(v);
    onCommit(v);
  }

  return (
    <>
      <div className={s.dialHead}>
        <div>
          <h2 id={titleId} className={s.dialTitle}>
            <span className={s.roll} key={`d-${channel}`}>
              {t("dialTitle")} · {channelName}
            </span>
          </h2>
          <span className={`${s.statusChip} ${s[status]}`}>
            <span className={s.statusDot} />
            {t(status)}
          </span>
        </div>
        <Link href="/admin/settings" className={s.gear} aria-label={t("modelSettings")} title={t("modelSettings")}>
          <Icon>{ICONS.gear}</Icon>
        </Link>
      </div>

      <div className={s.dialWrap}>
        <svg
          ref={svgRef}
          viewBox="0 0 260 260"
          className={`${s.dial} ${dragging ? s.dialDragging : ""}`}
          role="slider"
          tabIndex={0}
          aria-label={t("dialAria", { channel: channelName })}
          aria-valuemin={TEMP_MIN}
          aria-valuemax={TEMP_MAX}
          aria-valuenow={Math.round(value * 100) / 100}
          aria-valuetext={fmt2.format(value)}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onKeyDown={onKey}
        >
          <defs>
            <linearGradient id="dialGrad" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#eef9ff" />
              <stop offset="45%" stopColor="#9fdcff" />
              <stop offset="100%" stopColor="#3d9ff0" />
            </linearGradient>
            <filter id="dialGlow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="7" />
            </filter>
          </defs>
          <path d={arcPath(-135, 135)} className={s.dialTrack} />
          {f > 0.002 ? (
            <>
              <path d={arcPath(-135, angle)} className={s.dialGlow} filter="url(#dialGlow)" />
              <path d={arcPath(-135, angle)} className={s.dialArc} />
            </>
          ) : null}
          {Array.from({ length: 31 }, (_, i) => {
            const a = -135 + 9 * i;
            const long = i % 5 === 0;
            const p1 = polar(a, 82);
            const p2 = polar(a, long ? 72 : 77);
            return (
              <line
                key={i}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                className={i / 30 <= f + 0.0001 ? s.tickOn : s.tick}
              />
            );
          })}
          <circle cx={knob.x} cy={knob.y} r={13} className={s.knob} />
        </svg>
        <button type="button" className={s.dialCenter} onClick={onReset} aria-label={t("dialReset")} title={t("dialReset")}>
          <Icon size={26}>{ICONS.reset}</Icon>
        </button>
      </div>

      <div className={s.dialReadout}>
        <p className={s.dialValue}>{fmt2.format(shown)}</p>
        <p className={s.cardSub}>
          {t("dialCaption")} · {modelLabel}
        </p>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- scene pill */

function ScenePill({ className, style, onPlay }: { className: string; style: CSSProperties; onPlay: () => void }) {
  const t = useTranslations("dashboard");
  const [spin, setSpin] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  function play(e: ReactMouseEvent<HTMLButtonElement>) {
    const host = e.currentTarget.closest(`.${s.scene}`) as HTMLElement | null;
    const box = host?.getBoundingClientRect();
    if (box) {
      const id = Date.now();
      setRipples((r) => [...r, { id, x: e.clientX - box.left, y: e.clientY - box.top }]);
      window.setTimeout(() => setRipples((r) => r.filter((x) => x.id !== id)), 900);
    }
    setSpin(true);
    window.setTimeout(() => setSpin(false), 2400);
    onPlay();
  }

  return (
    <section className={className} style={style}>
      {ripples.map((r) => (
        <span key={r.id} className={s.ripple} style={{ left: r.x, top: r.y }} aria-hidden="true" />
      ))}
      <span className={`${s.sceneSun} ${spin ? s.sceneSpin : ""}`}>
        <Icon size={26}>{ICONS.sun}</Icon>
      </span>
      <span className={s.sceneText}>
        <span className={s.sceneTitle}>{t("sceneTitle")}</span>
        <span className={s.cardSub}>{t("sceneSub")}</span>
      </span>
      <button type="button" className={s.scenePlay} onClick={play} aria-label={t("scenePlay")}>
        <Icon size={20}>{ICONS.play}</Icon>
      </button>
    </section>
  );
}

/* --------------------------------------------------------------- sky slider */

function SkySlider({
  className,
  style,
  label,
  value,
  locale,
  onChange,
  onCommit,
}: {
  className: string;
  style: CSSProperties;
  label: string;
  value: number;
  locale: string;
  onChange: (v: number) => void;
  onCommit: (v: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const shown = useTween(value, { ms: 900, instant: dragging });
  const trackRef = useRef<HTMLDivElement>(null);
  const lastRef = useRef(value);
  const rtl = typeof document !== "undefined" && document.documentElement.dir === "rtl";

  function fromPointer(e: ReactPointerEvent<HTMLDivElement>) {
    const box = trackRef.current?.getBoundingClientRect();
    if (!box) return value;
    const raw = (e.clientX - box.left) / box.width;
    return Math.round(clamp((rtl ? 1 - raw : raw) * 100, 1, 100));
  }

  return (
    <div
      ref={trackRef}
      className={`${className} ${dragging ? s.sliderDragging : ""}`}
      style={style}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      aria-valuetext={`${Math.round(value)}%`}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
        const v = fromPointer(e);
        lastRef.current = v;
        onChange(v);
      }}
      onPointerMove={(e) => {
        if (!dragging) return;
        const v = fromPointer(e);
        lastRef.current = v;
        onChange(v);
      }}
      onPointerUp={() => {
        if (!dragging) return;
        setDragging(false);
        onCommit(lastRef.current);
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        let next: number | null = null;
        if (e.key === "ArrowRight" || e.key === "ArrowUp") next = value + 5;
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") next = value - 5;
        if (next === null) return;
        e.preventDefault();
        const v = clamp(next, 1, 100);
        onChange(v);
        onCommit(v);
      }}
    >
      <span className={s.sliderFill} style={{ width: `${Math.max(18, shown)}%` }} />
      <span className={s.sliderSun}>
        <Icon size={22}>{ICONS.sun}</Icon>
      </span>
      <span className={s.sliderLabel}>{label}</span>
      <span className={s.sliderValue}>{numberFormat(locale).format(Math.round(shown))}%</span>
    </div>
  );
}

/* ------------------------------------------------------------ activity card */

function Stat({ label, value, digits = 0, locale, suffix = "" }: { label: string; value: number | null; digits?: number; locale: string; suffix?: string }) {
  const shown = useTween(value ?? 0, { ms: 900 });
  return (
    <div className={s.stat}>
      <p className={s.statValue}>{value === null ? "—" : `${numberFormat(locale, digits).format(shown)}${suffix}`}</p>
      <p className={s.statLabel}>{label}</p>
    </div>
  );
}

function ActivityCard({
  className,
  style,
  locale,
  days,
  pendingDays,
  onRange,
  analytics,
  introDone,
}: {
  className: string;
  style: CSSProperties;
  locale: string;
  days: number;
  pendingDays: number;
  onRange: (d: number) => void;
  analytics: AnalyticsSnapshot;
  introDone: boolean;
}) {
  const t = useTranslations("dashboard");
  const conversations = useTween(introDone ? analytics.conversationsCount : 0, { ms: 1100 });
  const fmt0 = numberFormat(locale);
  const idx = RANGE_OPTIONS.indexOf(pendingDays);
  const loading = pendingDays !== days;

  return (
    <section className={`${className} ${loading ? s.loading : ""}`} style={style}>
      <div className={s.art}>
        <span className={s.artNumber}>{fmt0.format(Math.round(conversations))}</span>
        <span className={s.artLabel}>{t("statConversations")}</span>
      </div>
      <div className={s.musicBody}>
        <div className={s.musicTop}>
          <span className={`${s.glass} ${s.nowChip}`}>
            <span className={s.noteBadge}>
              <span className={`${s.eq} ${loading ? s.eqPaused : ""}`}>
                <i />
                <i />
                <i />
              </span>
            </span>
            {t("activityTitle")} · {t("activitySub", { days: fmt0.format(days) })}
          </span>
          <div className={s.range} role="group" aria-label={t("rangeLabel")}>
            <span className={s.rangeIndicator} style={{ "--idx": Math.max(0, idx) } as CSSProperties} aria-hidden="true" />
            {RANGE_OPTIONS.map((d) => (
              <button key={d} type="button" className={d === pendingDays ? s.rangeActive : ""} aria-pressed={d === pendingDays} onClick={() => onRange(d)}>
                {fmt0.format(d)}
                {t("rangeSuffix")}
              </button>
            ))}
          </div>
        </div>
        <div className={s.stats}>
          <Stat locale={locale} label={t("statUniqueUsers")} value={introDone ? analytics.uniqueUsersCount : 0} />
          <Stat locale={locale} label={t("statMessages")} value={introDone ? analytics.messagesCount : 0} />
          <Stat locale={locale} label={t("statAvgLength")} value={introDone ? analytics.avgConversationMinutes : 0} digits={1} suffix={locale === "fa" ? "" : " min"} />
          <Stat
            locale={locale}
            label={t("statSatisfaction")}
            value={analytics.feedbackCount ? (introDone ? analytics.satisfactionRatePct : 0) : null}
            suffix="%"
          />
        </div>
      </div>
    </section>
  );
}
