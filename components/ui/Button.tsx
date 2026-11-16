import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "onDark" | "onDarkGhost";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium " +
  "px-6 py-3.5 text-[0.9375rem] leading-none transition-colors duration-200 " +
  "focus-visible:outline-3 focus-visible:outline-offset-3 " +
  "disabled:opacity-50 disabled:pointer-events-none";

/* Flat pills, no shadows: Cobalt is the one filled action per screen,
   everything else is a hairline outline. */
const variants: Record<Variant, string> = {
  // Cobalt solid. Text on cobalt is white in light (8:1; ink on cobalt is only
  // 2.2:1) — on-cobalt flips it in dark. Hover deepens to cobalt-dark.
  primary: "bg-cobalt text-on-cobalt hover:bg-cobalt-dark",
  // Hairline outline on light
  secondary:
    "border border-ink/25 text-ink hover:border-ink hover:bg-ink/[0.04]",
  // Cobalt on Ink sections — white text keeps 8:1; hover flips to cream
  onDark: "bg-cobalt text-on-cobalt hover:bg-canvas hover:text-ink",
  onDarkGhost:
    "border border-canvas/30 text-canvas hover:border-canvas hover:bg-canvas/[0.06]",
};

type LinkProps = { href: string; variant?: Variant; children: ReactNode } & Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "className"
>;

/** For in-page anchors and external URLs. Locale routes use LocaleButtonLink. */
export function ButtonLink({
  href,
  variant = "primary",
  children,
  ...rest
}: LinkProps) {
  return (
    <a href={href} className={`${base} ${variants[variant]}`} {...rest}>
      {children}
    </a>
  );
}

type ButtonProps = { variant?: Variant; children: ReactNode } & Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className"
>;

export function Button({ variant = "primary", children, ...rest }: ButtonProps) {
  return (
    <button className={`${base} ${variants[variant]}`} {...rest}>
      {children}
    </button>
  );
}

export const buttonStyles = (variant: Variant = "primary") =>
  `${base} ${variants[variant]}`;
