import "server-only";

import { runAgentJSON } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { ReviewSchema, type Brief, type Review } from "../types";

/**
 * Agent 5 — editor. The Generator/Critic pattern: the model that wrote a draft
 * is the worst judge of it (it shares the draft's blind spots and tends to
 * approve itself), so judging is a separate agent with its own prompt. Low
 * temperature (0.3) because a score must be stable — the same draft should
 * not pass on one run and fail on the next.
 *
 * The editor only judges. Whether a score means "rewrite" or "ship" is
 * decided by the orchestrator's threshold, in code.
 */
export async function reviewDraft(input: { brief: Brief; draft: string; failedChecks: string[]; lessons?: string[] }): Promise<Review> {
  const system = `${sharedContext()}

# Your job: editor (critic)
Judge the draft strictly against the brief and the brand voice. You are the last line before Roya reads it.
Score 0–100 with this rubric:
- 30 — Usefulness: does a manager leave with something concrete they can do?
- 20 — Brief fit: covers the outline, targets the right reader, keyword used naturally, CTA present.
- 20 — Voice: practical, hopeful, creative; first person; no hype words; terms explained.
- 15 — Clarity: opening states the problem fast, short paragraphs, logical flow.
- 15 — Honesty: no unsourced statistics, no invented clients or results, no location details.
verdict: "approve" only if score ≥ 75 AND there is no major issue; otherwise "revise".
issues: specific and actionable — say where (section heading or "opening"), what's wrong, and the fix. Don't list nitpicks as major.${lessonsBlock(input.lessons)}`;

  const user = `Brief:\n${JSON.stringify(input.brief, null, 2)}

Automated checks that failed (count them under Brief fit / Clarity): ${input.failedChecks.length ? input.failedChecks.join("; ") : "none"}

Draft:
${input.draft}

Return {"score", "verdict", "strengths", "issues": [{"severity", "where", "problem", "fix"}]}.`;

  return runAgentJSON({ agent: "editor", system, user, temperature: 0.3 }, ReviewSchema);
}
