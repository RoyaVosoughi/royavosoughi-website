"use client";

import dynamic from "next/dynamic";
import { useRef, useState, type ComponentType } from "react";

// Browser-only: the ring writes long float transforms that the browser
// shortens, which React reports as a hydration mismatch if server-rendered.
// It's invisible until its images load anyway, so nothing is lost.
// Cast because React Bits ships it as plain JS (TS would infer every prop as required).
const CircularCarousel = dynamic(() => import("@/components/ui/CircularCarousel"), {
  ssr: false,
}) as unknown as ComponentType<Record<string, unknown>>;

export type ShowcaseItem = {
  key: string;
  /** 4:3 card image shown on the ring. */
  card: string;
  /** Uncropped image opened by "View full image". */
  full: string;
  alt: string;
  title: string;
  body: string;
  serviceName: string;
  /** Optional demo opened in the dialog: a silent looping clip, or a clip with sound + captions. */
  media?: { kind: "watch" | "listen"; src: string; poster: string; captions?: string };
};

type Labels = {
  carouselLabel: string;
  watch: string;
  listen: string;
  viewFull: string;
  close: string;
  captions: string;
};

/**
 * Front face of one ring card: the screenshot under a dark scrim, service +
 * count chips on top, the headline and what you can open at the bottom.
 * Sizes are px because the whole ring is scaled as one 3D stage. No
 * backdrop-filter: it's costly and glitchy inside preserve-3d.
 */
function ShowcaseCard({
  item,
  index,
  total,
  pad,
  labels,
  rtl,
}: {
  item: ShowcaseItem;
  index: number;
  total: number;
  pad: (n: number) => string;
  labels: Labels;
  rtl: boolean;
}) {
  const action = item.media ? (item.media.kind === "watch" ? labels.watch : labels.listen) : labels.viewFull;
  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="flex h-full w-full flex-col justify-between p-5 text-white"
      style={{
        background:
          "linear-gradient(180deg, rgba(20,20,22,0.6) 0%, rgba(20,20,22,0.1) 24%, rgba(20,20,22,0.55) 44%, rgba(20,20,22,0.9) 60%, rgba(20,20,22,0.96) 100%)",
      }}
    >
      <div className="flex flex-wrap gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/90 ring-1 ring-white/30">
          {item.serviceName}
        </span>
        <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium tracking-wider text-white/90 tabular-nums ring-1 ring-white/30">
          {pad(index + 1)} / {pad(total)}
        </span>
      </div>
      <div>
        <p className="font-display text-[22px] leading-[1.15] tracking-tight text-white">{item.title}</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25">
            {item.media ? (
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden="true">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect width="20" height="14" x="2" y="3" rx="2" />
                <line x1="8" x2="16" y1="21" y2="21" />
                <line x1="12" x2="12" y1="17" y2="21" />
              </svg>
            )}
          </span>
          <span className="text-xs font-medium text-white/85">{action}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * The /services "real work" ring: a React Bits CircularCarousel of project
 * screenshots, with the front-facing item's headline, sentence and service
 * name underneath. The ring itself is decorative-interactive; the panel
 * below is the readable, screen-reader-friendly part (aria-live).
 */
export function ServicesShowcase({ items, labels, locale }: { items: ShowcaseItem[]; labels: Labels; locale: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState<"media" | "image" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const num = new Intl.NumberFormat(locale);
  const pad = (n: number) => num.format(n).padStart(2, num.format(0));
  const item = items[active] ?? items[0];

  const show = (what: "media" | "image") => {
    setOpen(what);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <div>
      {/* The ring's geometry assumes left-to-right; text direction is handled by the panel below. */}
      <div dir="ltr" className="relative h-[300px] text-ink sm:h-[440px] md:h-[520px]">
        <CircularCarousel
          items={items.map((i) => ({ src: i.card, alt: i.alt, title: i.title, subtitle: i.serviceName }))}
          renderOverlay={(_: unknown, index: number) => (
            <ShowcaseCard item={items[index]} index={index} total={items.length} pad={pad} labels={labels} rtl={locale === "fa"} />
          )}
          preset="cylinder"
          intro="rise"
          cardWidth={320}
          aspectRatio={320 / 300}
          gap={28}
          speed={9}
          parallax={0.25}
          depthFade={0.65}
          fadeColor="var(--color-canvas)"
          innerShade={0.35}
          cornerRadius={18}
          onChange={setActive}
          onItemClick={(_: unknown, index: number) => setActive(index)}
        />
      </div>

      <div aria-live="polite" className="mx-auto mt-6 max-w-2xl text-center">
        <p className="label-eyebrow text-cobalt">
          <span>{item.serviceName}</span>
          <span aria-hidden="true" className="mx-2 text-ink/30">·</span>
          <span className="text-ink/50">
            {pad(active + 1)} / {pad(items.length)}
          </span>
        </p>
        {/* The headline is printed on the front card; keep it here for screen readers. */}
        <h3 key={item.key} className="sr-only">
          {item.title}
        </h3>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-ink/75">{item.body}</p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {item.media && (
            <button
              type="button"
              onClick={() => show("media")}
              className="inline-flex items-center gap-2 rounded-full bg-cobalt px-5 py-2.5 text-sm font-semibold text-on-cobalt transition-colors hover:bg-cobalt-dark"
            >
              <span aria-hidden="true">▶</span>
              {item.media.kind === "watch" ? labels.watch : labels.listen}
            </button>
          )}
          <button
            type="button"
            onClick={() => show("image")}
            className="inline-flex items-center rounded-full border border-ink/20 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-ink/50"
          >
            {labels.viewFull}
          </button>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        onClose={() => setOpen(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        aria-label={item.title}
        className="m-auto max-h-[92vh] w-[min(96vw,1200px)] overflow-visible bg-transparent p-0 backdrop:bg-night/80"
      >
        <div className="relative flex max-h-[92vh] flex-col items-center">
          <button
            type="button"
            onClick={close}
            className="mb-3 self-end rounded-full bg-paper px-4 py-2 text-sm font-semibold text-ink"
          >
            {labels.close} ✕
          </button>
          {open === "media" && item.media ? (
            item.media.kind === "watch" ? (
              <video
                key={item.media.src}
                src={item.media.src}
                poster={item.media.poster}
                autoPlay
                muted
                loop
                playsInline
                className="max-h-[80vh] rounded-2xl"
              />
            ) : (
              <video
                key={item.media.src}
                src={item.media.src}
                poster={item.media.poster}
                controls
                autoPlay
                playsInline
                crossOrigin="anonymous"
                className="max-h-[80vh] rounded-2xl"
              >
                {item.media.captions && (
                  <track kind="captions" src={item.media.captions} srcLang={locale} label={labels.captions} default />
                )}
              </video>
            )
          ) : open === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.full} alt={item.alt} className="max-h-[82vh] w-auto rounded-2xl bg-paper object-contain" />
          ) : null}
        </div>
      </dialog>
    </div>
  );
}
