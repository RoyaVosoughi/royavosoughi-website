import "server-only";

import { critiqueRun } from "./agents/critic";
import { reviewDraft } from "./agents/editor";
import { scoutIdeas } from "./agents/idea-scout";
import { research } from "./agents/researcher";
import { optimise } from "./agents/seo";
import { writeBrief } from "./agents/strategist";
import { translateToPersian } from "./agents/translator";
import { reviseDraft, writeDraft } from "./agents/writer";
import { addLessons, loadLessonsByAgent } from "./lessons";
import { AgentError } from "./llm";
import { checkDraft, checkFormat, failed, wordCount } from "./seo-checks";
import { createRun, failStaleRuns, freeSlug, hasRunningRun, insertDraftPost, listExistingTitles, updateRun } from "./store";
import type { PipelineStep, Review, RunStep } from "./types";

/**
 * The orchestrator runs the newsroom, and it is NOT an LLM — it's ordinary,
 * deterministic code.
 *
 *   idea scout → strategist → researcher → writer ⇄ editor → SEO → translator → publisher → critic
 *
 * Creative decisions (which idea, what to write, is it good) belong to the
 * agents. The workflow (order, the revision loop, the quality gate, what gets
 * saved) belongs here. The most common multi-agent mistake is handing the
 * workflow to a "manager" LLM too: then the flow itself becomes
 * unpredictable, impossible to step through in a debugger and impossible to
 * test. A for-loop with a threshold is all of those things.
 */

/** Editor score at or above which a draft is accepted. */
export const APPROVE_THRESHOLD = 75;
/** Rewrites allowed after the first draft. After that, the call is Roya's, not the loop's. */
export const MAX_REVISION_ROUNDS = 2;

export async function runPipeline(runId: string, topicHint: string | null): Promise<void> {
  const steps: RunStep[] = [];

  /**
   * Wraps one agent call: the step is saved as "running" before it starts and
   * "done"/"error" when it ends, so the studio's poll always sees the truth.
   */
  async function step<T>(agent: PipelineStep, fn: () => Promise<T>, describe: (out: T) => { summary: string; output?: unknown }, round?: number): Promise<T> {
    const entry: RunStep = { agent, round, status: "running", startedAt: new Date().toISOString() };
    steps.push(entry);
    await updateRun(runId, { steps });
    try {
      const out = await fn();
      Object.assign(entry, { status: "done", finishedAt: new Date().toISOString(), ...describe(out) });
      await updateRun(runId, { steps });
      return out;
    } catch (err) {
      Object.assign(entry, { status: "error", finishedAt: new Date().toISOString(), summary: err instanceof Error ? err.message : String(err) });
      await updateRun(runId, { steps });
      throw err;
    }
  }

  try {
    // One snapshot of the memory per run, so every agent learns from the same lessons.
    const lessons = await loadLessonsByAgent();
    const existingTitles = await listExistingTitles();

    const ideas = await step(
      "idea_scout",
      () => scoutIdeas({ existingTitles, topicHint, lessons: lessons.get("idea_scout") }),
      (out) => ({ summary: `${out.length} ideas — picked “${out[0].title}” (${out[0].score}/10)`, output: out }),
    );
    const idea = ideas[0];

    const brief = await step(
      "strategist",
      () => writeBrief({ idea, lessons: lessons.get("strategist") }),
      (out) => ({ summary: `Keyword “${out.primaryKeyword}” · ${out.outline.length} sections · ~${out.targetWords} words`, output: out }),
    );

    const facts = await step(
      "researcher",
      () => research({ brief, lessons: lessons.get("researcher") }),
      (out) => ({
        summary: `${out.facts.length} facts (${out.facts.filter((f) => f.source).length} sourced) · ${out.examples.length} examples · ${out.webResults ? `${out.webResults} web results` : "no web search"}`,
        output: out,
      }),
    );

    // --- Writer ⇄ editor: the quality gate --------------------------------
    let draft = await step(
      "writer",
      () => writeDraft({ brief, research: facts, lessons: lessons.get("writer") }),
      (out) => ({ summary: `First draft · ${wordCount(out)} words`, output: out }),
      0,
    );

    let review: Review;
    let draftChecks: string[];
    for (let round = 0; ; round++) {
      draftChecks = failed(checkDraft(draft, brief));
      const checksNow = draftChecks;
      review = await step(
        "editor",
        () => reviewDraft({ brief, draft, failedChecks: checksNow, lessons: lessons.get("editor") }),
        (out) => ({ summary: `${out.score}/100 · ${out.verdict} · ${out.issues.length} issues · ${checksNow.length} failed checks`, output: { ...out, failedChecks: checksNow } }),
        round,
      );

      // The gate is code: the editor's opinion is input, the threshold decides.
      if (review.score >= APPROVE_THRESHOLD && review.verdict === "approve") break;
      if (round >= MAX_REVISION_ROUNDS) break;

      const reviewNow = review;
      draft = await step(
        "writer",
        () => reviseDraft({ brief, research: facts, draft, review: reviewNow, failedChecks: checksNow, lessons: lessons.get("writer") }),
        (out) => ({ summary: `Revision ${round + 1} · ${wordCount(out)} words`, output: out }),
        round + 1,
      );
    }
    const approved = review.score >= APPROVE_THRESHOLD && review.verdict === "approve";
    const rewrites = steps.filter((s) => s.agent === "writer").length - 1;

    const { seo, checks: seoChecks } = await step(
      "seo",
      () => optimise({ brief, article: draft, lessons: lessons.get("seo") }),
      (out) => ({ summary: `/${out.seo.slug} · ${out.checks.filter((c) => c.pass).length}/${out.checks.length} checks pass`, output: out }),
    );

    const fa = await step(
      "translator",
      () => translateToPersian({ title: seo.title, article: draft, seo, lessons: lessons.get("translator") }),
      (out) => {
        const formatProblems = failed(checkFormat(out.bodyMd));
        return { summary: `“${out.title}”${formatProblems.length ? ` · ${formatProblems.length} format issues` : ""}`, output: { ...out, formatProblems } };
      },
    );

    // --- Publisher: code, not an agent. Always drafts — Roya publishes. -----
    const published = await step(
      "publisher",
      async () => {
        const slug = await freeSlug(seo.slug);
        const shared = { slug, aiScore: review.score, runId };
        const enId = await insertDraftPost({ ...shared, locale: "en", title: seo.title, excerpt: seo.excerpt, bodyMd: draft, tags: seo.tags, metaTitle: seo.metaTitle, metaDescription: seo.metaDescription, faq: seo.faq });
        const faId = await insertDraftPost({ ...shared, locale: "fa", title: fa.title, excerpt: fa.excerpt, bodyMd: fa.bodyMd, tags: fa.tags, metaTitle: fa.metaTitle, metaDescription: fa.metaDescription, faq: fa.faq });
        await updateRun(runId, { postEnId: enId, postFaId: faId });
        return { slug, enId, faId };
      },
      (out) => ({
        summary: approved
          ? `EN + FA drafts saved at /${out.slug} — editor approved, ready for your review`
          : `EN + FA drafts saved at /${out.slug} — below the bar after ${rewrites} rewrites (${review.score}/100), needs your edit`,
        output: { ...out, approved },
      }),
    );

    // --- Critic: learning from this run. A failure here never loses the post. ---
    const report = [
      `Topic hint: ${topicHint ?? "(none)"}`,
      `Chosen idea: ${idea.title} — ${idea.angle} (scout score ${idea.score}/10). Runner-ups: ${ideas.slice(1).map((i) => `${i.title} (${i.score})`).join("; ")}`,
      `Brief: keyword "${brief.primaryKeyword}", ${brief.outline.length} sections, target ${brief.targetWords} words.`,
      `Research: ${facts.facts.length} facts, ${facts.facts.filter((f) => f.source).length} with sources.`,
      `Editor rounds: ${steps.filter((s) => s.agent === "editor").map((s) => s.summary).join(" → ")}`,
      `Final editor issues: ${review.issues.map((i) => `[${i.severity}] ${i.where}: ${i.problem}`).join("; ") || "none"}`,
      `Draft checks still failing: ${draftChecks.join("; ") || "none"}`,
      `SEO checks failing: ${failed(seoChecks).join("; ") || "none"}`,
      `Outcome: ${approved ? "approved" : `not approved after ${rewrites} rewrites`}, saved as /${published.slug}.`,
      "",
      "Final article:",
      draft,
    ].join("\n");
    try {
      await step(
        "critic",
        async () => {
          const proposed = await critiqueRun({ report, existingLessons: [...lessons.entries()].flatMap(([agent, ls]) => ls.map((l) => `${agent}: ${l}`)) });
          await addLessons(proposed, "critic", runId);
          return proposed;
        },
        (out) => ({ summary: out.length ? `${out.length} new lessons: ${out.map((l) => l.agent).join(", ")}` : "No new lessons — nothing to correct", output: out }),
      );
    } catch {
      // Already recorded on the critic step; the run itself still succeeded.
    }

    await updateRun(runId, { status: "done" });
  } catch (err) {
    console.error("[blog-agents] run failed:", err);
    const message = err instanceof AgentError ? err.message : err instanceof Error ? err.message : "unknown error";
    await updateRun(runId, { status: "error", error: message, steps }).catch(() => undefined);
  }
}

export type StartResult = { ok: true; runId: string } | { ok: false; error: "already_running" };

/** Creates the run row (so the caller has an id to poll) — the caller then awaits or defers runPipeline. */
export async function startRun(trigger: "manual" | "cron", topicHint: string | null): Promise<StartResult> {
  await failStaleRuns();
  if (await hasRunningRun()) return { ok: false, error: "already_running" };
  return { ok: true, runId: await createRun(trigger, topicHint) };
}
