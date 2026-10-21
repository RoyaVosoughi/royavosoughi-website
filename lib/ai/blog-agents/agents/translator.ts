import "server-only";

import { runAgentJSON, runAgentText, WRITER_MODEL } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { TranslationMetaSchema, type Seo, type TranslationMeta } from "../types";

/**
 * Agent 7 — translator. Produces the Persian twin of the approved English
 * post (same slug, its own row — the blog's one-row-per-language design).
 * Split in two calls on purpose: the body as free text (a long Markdown string
 * inside JSON is the classic way to break a parser), the short metadata as
 * validated JSON. It's a localisation, not a word-for-word copy, so it gets
 * the writer's model when one is set.
 */

function system(lessons?: string[]): string {
  return `${sharedContext()}

# Your job: Persian localiser
Adapt Roya's English article for Persian-speaking business owners and managers.
- Formal «شما» throughout; natural, fluent Persian a manager would read comfortably — not a literal translation.
- Keep technical terms recognisable: on first use write the Persian term with the English in parentheses, e.g. «تولید افزوده با بازیابی (RAG)».
- Use the Persian half-space (نیم‌فاصله) correctly: می‌شود، کسب‌وکار، داده‌ها.
- Keep every link URL, code block and the Markdown structure exactly as they are; translate link text only.
- Keep the brand name "Roya Vosoughi" in Latin script.${lessonsBlock(lessons)}`;
}

export async function translateToPersian(input: { title: string; article: string; seo: Seo; lessons?: string[] }): Promise<TranslationMeta & { bodyMd: string }> {
  const bodyMd = await runAgentText({
    agent: "translator",
    system: `${system(input.lessons)}\n\nReturn ONLY the translated Markdown body — no "# " title line, nothing before or after.`,
    user: input.article,
    temperature: 0.3,
    model: WRITER_MODEL,
    maxTokens: 8000,
  });

  const meta = await runAgentJSON(
    {
      agent: "translator",
      system: system(input.lessons),
      user: `Translate this post metadata to Persian. metaTitle ≤ 60 characters, metaDescription 100–160 characters. Tags: short Persian topic words.\n\n${JSON.stringify({ title: input.title, metaTitle: input.seo.metaTitle, metaDescription: input.seo.metaDescription, excerpt: input.seo.excerpt, tags: input.seo.tags, faq: input.seo.faq }, null, 2)}\n\nReturn {"title", "metaTitle", "metaDescription", "excerpt", "tags", "faq": [{"question", "answer"}]}.`,
      temperature: 0.3,
    },
    TranslationMetaSchema,
  );

  return { ...meta, bodyMd };
}
