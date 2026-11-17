import { useId } from "react";

/**
 * Roya Vosoughi lockup — "Reclaim your time".
 *
 * The mark is a "Signal R": a rounded single-stroke R whose leg is the one
 * Cobalt stroke — the step from idea to working system. In the wordmark the
 * mark *is* the R of "Roya", so no letter is repeated; on its own it is the
 * favicon / app icon.
 * The R follows currentColor (Ink on light, Canvas on the Ink footer); the
 * leg is Cobalt on light and Cobalt-light on dark (raw cobalt is 2.1:1 on ink).
 * The name is set in Space Grotesk. Always Latin — the wordmark does not change
 * per locale, and it is pinned to Space Grotesk even on Farsi pages.
 * Rules: never recolour the leg outside the palette, never stretch, min height 20px.
 */
export function SignalR({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <svg viewBox="0 0 74 100" aria-hidden="true" className={className}>
      <path
        d="M10 90 V10 H40 a22 22 0 0 1 0 44 H10"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <line
        x1="26"
        y1="54"
        x2="64"
        y2="90"
        className={onDark ? "stroke-cobalt-light" : "stroke-cobalt"}
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Gradient V: a coral-to-gold chevron with a glowing "ignition point" at
 * its centre. It sits in front of the Signal R in the wordmark.
 * The viewBox is cropped to the chevron (the original drawing was 100×100),
 * and gradient/filter ids come from useId so the header and footer copies
 * never share ids.
 */
export function GradientV({ className = "" }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  const main = `gv-main-${id}`;
  const ignition = `gv-ignition-${id}`;
  const glow = `gv-glow-${id}`;
  return (
    <svg viewBox="16 22 68 56" aria-hidden="true" className={className}>
      <defs>
        <linearGradient id={main} x1="0%" y1="0%" x2="100%" y2="50%">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="60%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#EAB308" />
        </linearGradient>
        <radialGradient id={ignition} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FDE047" />
          <stop offset="30%" stopColor="#FBBF24" />
          <stop offset="70%" stopColor="#F97316" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#F97316" stopOpacity="0" />
        </radialGradient>
        <filter id={glow} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* V shape */}
      <path
        d="M18 28 C18 26 20 24 22 26 L50 62 L78 26 C80 24 82 26 82 28 L50 75 C50 76 50 76 50 75 L18 28 Z"
        fill={`url(#${main})`}
      />
      {/* Inner cutout */}
      <path d="M32 35 L50 58 L68 35 C60 45 40 45 32 35 Z" fill="#1E1E1E" />
      {/* Ignition glow + core */}
      <ellipse cx="50" cy="52" rx="8" ry="6" fill={`url(#${ignition})`} filter={`url(#${glow})`} opacity="0.9" />
      <ellipse cx="50" cy="52" rx="2.5" ry="2" fill="#FEF3C7" />
    </svg>
  );
}

export function Wordmark({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <span
      dir="ltr"
      className={`inline-flex items-baseline text-[1.6rem] leading-none font-bold tracking-[-0.04em] whitespace-nowrap ${className}`}
      style={{ fontFamily: "var(--font-space-grotesk), system-ui, sans-serif" }}
      aria-hidden="true"
    >
      <GradientV className="me-[0.14em] h-[0.7em] w-auto" />
      {/* 0.7em ≈ Space Grotesk's cap height, so the mark sits as the "R" */}
      <SignalR onDark={onDark} className="h-[0.7em] w-auto" />
      <span className="ms-[0.02em]">oya</span>
      <span className="ms-[0.26em]">Vosoughi</span>
    </span>
  );
}
