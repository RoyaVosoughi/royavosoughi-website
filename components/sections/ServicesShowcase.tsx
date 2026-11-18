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
      <div dir="ltr" className="relative h-[230px] text-ink sm:h-[400px] md:h-[480px]">
        <CircularCarousel
          items={items.map((i) => ({ src: i.card, alt: i.alt, title: i.title, subtitle: i.serviceName }))}
          preset="cylinder"
          intro="rise"
          cardWidth={320}
          aspectRatio={4 / 3}
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
        <h3 key={item.key} className="mt-3 text-2xl text-ink md:text-3xl">
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
