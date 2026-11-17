import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { site } from "@/lib/site";

/**
 * "Ask directly" profile chip: small photo, role label, name and a dark pill
 * that opens a Telegram chat with Roya (her own account, not the Nura bot).
 * The form next to it is the email route; this is the instant one. A white
 * card with a soft shadow, lifted off the cream canvas. Uses logical spacing (ms-*) so it mirrors in Persian.
 */
export async function DirectContactChip() {
  const t = await getTranslations("hero");

  return (
    <div className="inline-flex items-center gap-3 rounded-2xl bg-white/95 px-3 py-3 shadow-lg ring-1 ring-white/20 backdrop-blur">
      <Image
        src="/photos/roya-chip.jpg"
        alt={t("directPhotoAlt")}
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-xl object-cover"
      />
      <div className="min-w-0">
        <p className="truncate text-[11px] uppercase leading-none tracking-wider text-neutral-500">
          {t("directRole")}
        </p>
        <p className="mt-1 truncate font-semibold tracking-tight text-neutral-900">
          {t("directName")}
        </p>
      </div>
      <a
        href={site.social.telegram}
        target="_blank"
        rel="noreferrer noopener"
        className="ms-1 inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-neutral-900 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-neutral-800"
      >
        {t("directCta")}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-3.5 w-3.5"
          aria-hidden="true"
        >
          <path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z" />
          <path d="m21.854 2.147-10.94 10.939" />
        </svg>
      </a>
    </div>
  );
}
