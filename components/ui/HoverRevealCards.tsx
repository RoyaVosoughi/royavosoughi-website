import Image from "next/image";
import type { ReactNode } from "react";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export interface HoverRevealCardItem {
  id: string | number;
  title: string;
  subtitle: string;
  imageUrl: string;
  href: string;
  /** Small label in the top corner, e.g. "01". */
  eyebrow?: string;
  /** Extra content under the subtitle (rarely needed). */
  footer?: ReactNode;
}

interface HoverRevealCardsProps {
  items: HoverRevealCardItem[];
  className?: string;
  cardClassName?: string;
  /** Inline style for the title (font family, letter-spacing per locale). */
  titleStyle?: React.CSSProperties;
  /** Wraps each card, e.g. a scroll-reveal; receives the card and its index. */
  wrap?: (card: ReactNode, index: number) => ReactNode;
}

/**
 * A grid of image cards with a hover-reveal effect (adapted from 21st.dev's
 * HoverRevealCards). When one card is hovered or keyboard-focused, it lifts
 * while the others dim and soften. `group-has-[...]` is used instead of plain
 * `group-hover` so the gaps between cards don't dim everything. Motion is
 * dropped for people who prefer reduced motion; the dimming stays.
 */
export function HoverRevealCards({ items, className, cardClassName, titleStyle, wrap }: HoverRevealCardsProps) {
  return (
    <ul role="list" className={cn("group grid gap-3 sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.map((item, i) => {
        const card = (
          <Link
            href={item.href}
            aria-label={`${item.title}, ${item.subtitle}`}
            className={cn(
              "group/card soft-shadow relative isolate flex h-80 flex-col justify-between overflow-hidden rounded-[1.875rem] bg-night p-7 text-white md:p-8",
              "transition-[transform,opacity,filter] duration-500 ease-out motion-reduce:transition-opacity",
              "group-has-[a:hover]:scale-[0.97] group-has-[a:hover]:opacity-60 group-has-[a:hover]:blur-[2px]",
              "group-has-[a:focus-visible]:scale-[0.97] group-has-[a:focus-visible]:opacity-60 group-has-[a:focus-visible]:blur-[2px]",
              "hover:z-10 hover:!scale-[1.03] hover:!opacity-100 hover:!blur-none",
              "focus-visible:z-10 focus-visible:!scale-[1.03] focus-visible:!opacity-100 focus-visible:!blur-none",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
              "motion-reduce:group-has-[a:hover]:scale-100 motion-reduce:group-has-[a:hover]:blur-none motion-reduce:hover:!scale-100",
              cardClassName,
            )}
          >
            <Image
              src={item.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
              className="-z-20 object-cover object-top transition-transform duration-700 ease-out group-hover/card:scale-105"
            />
            {/* Gradient scrim keeps the white text readable over busy screenshots. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-10 bg-gradient-to-t from-night via-night/85 to-night/60"
            />

            <div className="flex items-center justify-between">
              {item.eyebrow && (
                <span aria-hidden="true" className="label-eyebrow text-white/80">
                  {item.eyebrow}
                </span>
              )}
              <span
                aria-hidden="true"
                className="ms-auto grid h-9 w-9 place-items-center rounded-full border border-white/30 bg-night/30 backdrop-blur-sm rtl:-scale-x-100"
              >
                →
              </span>
            </div>

            <div>
              {/* Explicit colours: the global h3 rule paints headings in --color-ink. */}
              <h3 className="text-3xl font-light text-cream md:text-4xl" style={titleStyle}>
                {item.title}
              </h3>
              <p className="mt-3 text-sm text-cream/80">{item.subtitle}</p>
              {item.footer}
            </div>
          </Link>
        );

        return (
          <li key={item.id} className="relative">
            {wrap ? wrap(card, i) : card}
          </li>
        );
      })}
    </ul>
  );
}
