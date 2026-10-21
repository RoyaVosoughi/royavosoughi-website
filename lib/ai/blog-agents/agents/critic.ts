import "server-only";

import { runAgentJSON } from "../llm";
import { sharedContext } from "../profile";
import { LessonsSchema, type ProposedLesson } from "../types";

/**
 * Agent 9 — critic: the self-improvement engine. The editor judges one
 * article; the critic judges the PROCESS that produced it and writes at most
 * three lessons, each addressed to the one agent that can act on it. Those
 * lessons are injected into that agent's prompt on every later run
 * (lessons.ts) — the system improves without fine-tuning or code changes.
 *
 * Capped at three because a pile of lessons dilutes each one; it's told to
 * skip anything already in memory so the same lesson doesn't fill all 8 slots.
 */

const AGENT_ROLES = `Agents you can address:
- idea_scout: proposes and scores topics
- strategist: brief, keyword, outline, CTA
- researcher: facts, sources, examples, reader questions
- writer: writes and revises the English article
- editor: scores drafts (if its scores look too lenient or too harsh, say so)
- seo: slug, titles, meta description, FAQ
- translator: Persian version`;

export async function critiqueRun(input: { report: string; existingLessons: string[] }): Promise<ProposedLesson[]> {
  const system = `${sharedContext()}

# Your job: process critic
You review a whole pipeline run and extract up to 3 lessons that would make the NEXT run better.
A good lesson is specific, actionable, and general enough to apply to future articles — e.g. "writer: open with one concrete situation the reader recognises instead of a general statement about AI." Not: "writer: write better."
Only propose a lesson for a real, observed problem in this run. If the run went well, return fewer lessons or none. Never repeat or rephrase a lesson that already exists.

${AGENT_ROLES}`;

  const user = `Existing lessons (do not duplicate):\n${input.existingLessons.length ? input.existingLessons.map((l) => `- ${l}`).join("\n") : "(none)"}\n\nRun report:\n${input.report}\n\nReturn {"lessons": [{"agent", "lesson"}]} — 0 to 3 items.`;

  const { lessons } = await runAgentJSON({ agent: "critic", system, user, temperature: 0.4 }, LessonsSchema);
  return lessons;
}

/** Roya's 👍/👎 goes through the critic too, so human feedback lands in memory in the same shape as automated lessons. */
export async function lessonsFromFeedback(input: { rating: "up" | "down"; comment: string; title: string; article: string; existingLessons: string[] }): Promise<ProposedLesson[]> {
  const report = `Roya (the blog owner) rated this article ${input.rating === "up" ? "👍 good" : "👎 not good enough"}.
Her comment: ${input.comment || "(no comment)"}

Treat her comment as the most important signal — turn it into lessons for the agents responsible.

Title: ${input.title}
Article:
${input.article}`;
  return critiqueRun({ report, existingLessons: input.existingLessons });
}
