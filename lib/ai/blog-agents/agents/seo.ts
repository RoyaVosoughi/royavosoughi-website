import "server-only";

import { runAgentJSON } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { checkSeo, failed, type Check } from "../seo-checks";
import { SeoSchema, type Brief, type Seo } from "../types";

/**
 * Agent 6 — SEO specialist. Half LLM, half code: the model writes the parts
 * that need judgement (title, meta copy, FAQ); seo-checks.ts measures them.
 * If the measurements fail, the model gets one correction round with the
 * exact numbers — the same validate-and-retry idea as runAgentJSON, one
 * level up.
 */
export async function optimise(input: { brief: Brief; article: string; lessons?: string[] }): Promise<{ seo: Seo; checks: Check[] }> {
  const system = `${sharedContext()}

# Your job: SEO specialist
Write the search metadata for the finished article. Don't change the article.
- slug: 3–6 lowercase English words with dashes, built around the primary keyword.
- title: the on-page headline — specific, benefit-led, contains the primary keyword, no clickbait.
- metaTitle: ≤ 60 characters, contains the primary keyword. Don't append the site name; the site adds it.
- metaDescription: 120–160 characters, contains the primary keyword, says what the reader gets.
- excerpt: 1–2 sentences for the blog list.
- tags: 2–5 short topic tags.
- faq: 3–4 questions a manager would ask, answered in 1–3 sentences each from the article's content (these become FAQPage structured data).${lessonsBlock(input.lessons)}`;

  const user = `Primary keyword: ${input.brief.primaryKeyword}\nSecondary: ${input.brief.secondaryKeywords.join(", ")}\n\nArticle:\n${input.article}\n\nReturn {"slug", "title", "metaTitle", "metaDescription", "excerpt", "tags", "faq": [{"question", "answer"}]}.`;

  let seo = await runAgentJSON({ agent: "seo", system, user, temperature: 0.3 }, SeoSchema);
  let checks = checkSeo(seo, input.brief);
  if (failed(checks).length) {
    seo = await runAgentJSON(
      {
        agent: "seo",
        system,
        user: `${user}\n\nYour previous metadata:\n${JSON.stringify(seo)}\n\nIt failed these measured checks — fix them:\n${failed(checks).map((m) => `- ${m}`).join("\n")}`,
        temperature: 0.2,
      },
      SeoSchema,
    );
    checks = checkSeo(seo, input.brief);
  }
  return { seo, checks };
}
