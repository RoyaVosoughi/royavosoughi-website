/**
 * The deterministic half of SEO and formatting. Rule of thumb: if it can be
 * computed, don't ask a model. A model asked "is the meta description under
 * 160 characters?" is slower, costs money, and is sometimes wrong; .length is
 * none of those. The LLM half (seo.ts) is kept for judgement calls only —
 * phrasing a title, choosing FAQ questions.
 *
 * No "server-only": pure functions, also handy in a test or script.
 */

import type { Brief, Seo } from "./types";

export interface Check {
  id: string;
  pass: boolean;
  message: string;
}

const HYPE = /\b(revolutionary|revolutioni[sz]e|game[- ]chang(?:er|ing)|transformative|the secret (?:to|of)|hidden trick|unlock|supercharge)\b|انقلابی|تحول‌آفرین|ترفند مخفی/i;

export function wordCount(md: string): number {
  return md.replace(/[#>*`[\]()_-]/g, " ").split(/\s+/).filter(Boolean).length;
}

function firstParagraph(md: string): string {
  return md.split(/\n\s*\n/).find((p) => p.trim() && !p.trim().startsWith("#")) ?? "";
}

const includesCi = (text: string, needle: string) => text.toLowerCase().includes(needle.toLowerCase());

/** Format rules every body must pass, in any language — they mirror components/blog/Markdown.tsx. */
export function checkFormat(md: string): Check[] {
  const lines = md.split("\n");
  const fences = lines.filter((l) => l.trim().startsWith("```")).length;
  return [
    { id: "no_h1", pass: !lines.some((l) => /^#\s/.test(l)), message: 'Body must not contain a "# " title line — the page renders the title itself.' },
    { id: "sections", pass: lines.filter((l) => /^##\s/.test(l)).length >= 3, message: 'Use at least 3 "## " section headings.' },
    {
      id: "supported_markdown",
      pass: !lines.some((l) => /^\s*\|/.test(l) || /^\s*(---|\*\*\*)\s*$/.test(l)) && !/!\[|<\/?[a-z][^>]*>/i.test(md),
      message: "Remove tables, images, horizontal rules and HTML — the site's renderer doesn't support them.",
    },
    { id: "closed_fences", pass: fences % 2 === 0, message: "A ``` code fence is left open." },
  ];
}

/** Draft-level checks — run before the editor so it judges with the facts in hand. */
export function checkDraft(md: string, brief: Brief): Check[] {
  const words = wordCount(md);
  const keyword = brief.primaryKeyword;
  return [
    ...checkFormat(md),
    {
      id: "length",
      pass: words >= brief.targetWords * 0.8 && words <= brief.targetWords * 1.25,
      message: `Length is ${words} words; the brief targets ${brief.targetWords}.`,
    },
    { id: "keyword_intro", pass: includesCi(firstParagraph(md), keyword), message: `Primary keyword "${keyword}" should appear in the opening paragraph.` },
    {
      id: "keyword_heading",
      pass: md.split("\n").some((l) => /^##\s/.test(l) && includesCi(l, keyword)),
      message: `Primary keyword "${keyword}" should appear in at least one "## " heading.`,
    },
    { id: "no_hype", pass: !HYPE.test(md), message: `Remove hype words (found: "${md.match(HYPE)?.[0] ?? ""}").` },
  ];
}

/** Metadata checks on the SEO agent's output. */
export function checkSeo(seo: Seo, brief: Brief): Check[] {
  const keyword = brief.primaryKeyword;
  return [
    { id: "meta_title_length", pass: seo.metaTitle.length <= 60, message: `Meta title is ${seo.metaTitle.length} chars; keep it ≤ 60 so Google doesn't cut it.` },
    {
      id: "meta_description_length",
      pass: seo.metaDescription.length >= 120 && seo.metaDescription.length <= 160,
      message: `Meta description is ${seo.metaDescription.length} chars; aim for 120–160.`,
    },
    { id: "keyword_title", pass: includesCi(seo.title, keyword) || includesCi(seo.metaTitle, keyword), message: `Primary keyword "${keyword}" should be in the title.` },
    { id: "keyword_description", pass: includesCi(seo.metaDescription, keyword), message: `Primary keyword "${keyword}" should be in the meta description.` },
    { id: "slug_length", pass: seo.slug.split("-").length <= 8, message: "Slug is long; keep it to 8 words or fewer." },
  ];
}

export const failed = (checks: Check[]) => checks.filter((c) => !c.pass).map((c) => c.message);
