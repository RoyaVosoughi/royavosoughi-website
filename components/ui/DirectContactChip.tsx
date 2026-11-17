import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { gmailComposeUrl } from "@/lib/site";

/**
 * "Ask directly" profile chip: small photo, role label, name and a dark pill
 * that opens an email to Roya. A white card with a soft shadow, lifted off the
 * cream canvas. Uses logical spacing (ms-*) so it mirrors in Persian.
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
        href={gmailComposeUrl}
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
          <path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" />
        </svg>
      </a>
    </div>
  );
}
