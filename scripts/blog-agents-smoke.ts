/**
 * Runs each blog agent once, in pipeline order, WITHOUT the database: no run
 * row, no posts, no lessons saved. For checking prompts and output contracts
 * after a change, one agent at a time. The orchestrator's loop and storage are
 * exercised by a real run from /admin/blog/studio.
 *
 *   npm run blog:smoke -- "optional topic hint"
 *
 * Costs a few cents of OpenRouter credit (≈10 calls on PIPELINE_MODEL).
 */
import { critiqueRun } from "@/lib/ai/blog-agents/agents/critic";
import { reviewDraft } from "@/lib/ai/blog-agents/agents/editor";
import { scoutIdeas } from "@/lib/ai/blog-agents/agents/idea-scout";
import { research } from "@/lib/ai/blog-agents/agents/researcher";
import { optimise } from "@/lib/ai/blog-agents/agents/seo";
import { writeBrief } from "@/lib/ai/blog-agents/agents/strategist";
import { translateToPersian } from "@/lib/ai/blog-agents/agents/translator";
import { writeDraft } from "@/lib/ai/blog-agents/agents/writer";
import { checkDraft, checkFormat, failed, wordCount } from "@/lib/ai/blog-agents/seo-checks";

async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  const out = await fn();
  console.log(`\n=== ${label} (${((Date.now() - start) / 1000).toFixed(1)}s) ===`);
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 2));
  return out;
}

async function main() {
  const topicHint = process.argv[2] ?? null;

  const ideas = await timed("idea scout", () => scoutIdeas({ existingTitles: [], topicHint }));
  const brief = await timed("strategist", () => writeBrief({ idea: ideas[0] }));
  const facts = await timed("researcher", () => research({ brief }));
  const draft = await timed("writer", () => writeDraft({ brief, research: facts }));
  const checks = failed(checkDraft(draft, brief));
  console.log(`\n--- draft checks: ${wordCount(draft)} words · failing: ${checks.join(" | ") || "none"}`);
  const review = await timed("editor", () => reviewDraft({ brief, draft, failedChecks: checks }));
  const { seo, checks: seoChecks } = await timed("seo", () => optimise({ brief, article: draft }));
  console.log(`\n--- seo checks failing: ${failed(seoChecks).join(" | ") || "none"}`);
  const fa = await timed("translator", () => translateToPersian({ title: seo.title, article: draft, seo }));
  console.log(`\n--- fa format checks failing: ${failed(checkFormat(fa.bodyMd)).join(" | ") || "none"}`);
  await timed("critic", () =>
    critiqueRun({
      report: `Editor: ${review.score}/100 ${review.verdict}. Issues: ${review.issues.map((i) => i.problem).join("; ")}. Failing checks: ${checks.join("; ") || "none"}.\n\nFinal article:\n${draft}`,
      existingLessons: [],
    }),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
