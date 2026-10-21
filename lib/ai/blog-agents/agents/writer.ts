import "server-only";

import { runAgentText, WRITER_MODEL } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import type { Brief, Research, Review } from "../types";

/**
 * Agent 4 — writer. The only agent with free-text output (see runAgentText).
 * Two modes: a first draft from brief + research, and a revision that gets
 * the editor's issues as a to-do list. Revisions run cooler (0.5): the job is
 * to fix specific problems, not to reinvent an article that was mostly fine.
 */

/** Matches what components/blog/Markdown.tsx can render — anything else would show up as literal symbols. */
const MARKDOWN_RULES = `# Format (strict — the site's renderer supports only this)
- Do NOT write a "# " title line: the title is shown separately. Start directly with the opening paragraph.
- Sections: "## " headings; sub-sections "### ".
- Allowed inline: **bold**, *italic*, \`code\`, [text](https://full-url).
- Allowed blocks: paragraphs, "- " bullets, "1. " numbered lists, "> " quotes, \`\`\` code fences.
- No tables, no images, no HTML, no horizontal rules, no footnotes.`;

function system(lessons?: string[]): string {
  return `${sharedContext()}

# Your job: writer
Write the article in English, in Roya's first-person voice, following the brief exactly.
- Open with the reader's concrete problem in the first two sentences — no throat-clearing, no "In today's fast-paced world".
- Use the primary keyword in the first paragraph and in at least one "## " heading, naturally.
- Short paragraphs (2–4 sentences). Explain every technical term the first time.
- Only quote a number or statistic if the research gives it a source URL, and link that URL inline. Facts with no source may be used as general statements, never as figures.
- Examples are generic business situations ("a 20-person logistics company…"), never presented as Roya's clients.
- End with a "## " section that gives the brief's CTA as one specific next step.
- Hit the brief's target length within ±15%.

${MARKDOWN_RULES}

Return ONLY the article body in Markdown.${lessonsBlock(lessons)}`;
}

export async function writeDraft(input: { brief: Brief; research: Research; lessons?: string[] }): Promise<string> {
  const user = `Brief:\n${JSON.stringify(input.brief, null, 2)}\n\nResearch:\n${JSON.stringify(input.research, null, 2)}`;
  return runAgentText({ agent: "writer", system: system(input.lessons), user, temperature: 0.7, model: WRITER_MODEL, maxTokens: 6000 });
}

export async function reviseDraft(input: { brief: Brief; research: Research; draft: string; review: Review; failedChecks: string[]; lessons?: string[] }): Promise<string> {
  const issues = input.review.issues.map((i) => `- [${i.severity}] ${i.where}: ${i.problem} → ${i.fix}`);
  const checks = input.failedChecks.map((c) => `- [check] ${c}`);
  const user = `Brief:\n${JSON.stringify(input.brief, null, 2)}

Research:\n${JSON.stringify(input.research, null, 2)}

Current draft:
${input.draft}

The editor scored this ${input.review.score}/100. Fix every issue below; keep what already works (strengths: ${input.review.strengths.join("; ") || "—"}).
${[...issues, ...checks].join("\n")}

Return the full revised article.`;
  return runAgentText({ agent: "writer", system: system(input.lessons), user, temperature: 0.5, model: WRITER_MODEL, maxTokens: 6000 });
}
