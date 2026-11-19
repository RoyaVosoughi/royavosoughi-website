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

import { Icon, ICONS } from "../shell/icons";
import { useSky } from "../shell/AdminShell";
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

const CHANNEL_ICON: Record<Channel, ReactNode> = { web: ICONS.globe, telegram: ICONS.send, widget: ICONS.bubble };
const CHANNEL_LABEL_KEY = { web: "channelWeb", telegram: "channelTelegram", widget: "channelWidget" } as const;


/* --------------------------------------------------------------- the page */

export function SpatialOverview({ days, locale, channels, stats, analytics, overdue }: Props) {
  const t = useTranslations("dashboard");
  const tOverdue = useTranslations("crmOverdue");
  const router = useRouter();

  const tiltRef = useRef<HTMLDivElement>(null);

  const [active, setActive] = useState<Channel>("web");
  const [shown, setShown] = useState<Channel>("web"); // what the camera tile shows (swaps behind the curtain)
  const [curtain, setCurtain] = useState<"idle" | "cover" | "reveal">("idle");
  const [dip, setDip] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [temps, setTemps] = useState<Record<Channel, number>>(() =>
    Object.fromEntries(channels.map((c) => [c.channel, c.model.temperature])) as Record<Channel, number>,
  );
  const { sky, setSky, saveSky } = useSky();
  const [now, setNow] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ text: string; id: number } | null>(null);
  const [pendingDays, setPendingDays] = useState(days);

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
      const ui = tiltRef.current;
      if (ui) {
        if (mq.matches) {
          ui.style.transform = "";
        } else {
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

  const isLive = Boolean(now && shownChannel.latest && now.getTime() - new Date(shownChannel.latest.lastActiveAt).getTime() < LIVE_WINDOW_MS);
  const clock = now ? now.toLocaleTimeString(locale === "fa" ? "fa-IR" : "en-GB", { hour12: false }) : "--:--:--";

  return (
    <div className={s.stage}>
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
