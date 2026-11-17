import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

/** Account pages are private utility pages — keep them out of search results. */
export async function authMetadata(
  params: Promise<{ locale: string }>,
  key: string,
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t(`${key}.metaTitle`), robots: { index: false, follow: false } };
}
