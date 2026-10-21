import "server-only";

import { runAgentJSON } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { IdeasSchema, type Idea } from "../types";

/**
 * Agent 1 — idea scout. The only job here is divergence: many distinct ideas,
 * each scored, so a later step can pick. High temperature (0.8) because
 * variety is the point; the existing titles are passed in so the scout doesn't
 * keep rediscovering the same three topics.
 */
export async function scoutIdeas(input: { existingTitles: string[]; topicHint: string | null; lessons?: string[] }): Promise<Idea[]> {
  const system = `${sharedContext()}

# Your job: idea scout for Roya's blog
Propose 4 article ideas a business owner or manager would actually search for or click on. Each idea must:
- solve one concrete problem the reader has (time lost, a process that breaks, a decision about AI they're unsure of);
- have a clear angle that differs from generic "10 ways AI helps your business" content;
- connect naturally to one of Roya's services without being an ad for it.
Score each 0–10 for: reader value × fit with Roya's services × freshness against the existing titles. Be honest — not everything is an 8.
Fields: title, angle (what makes this take different), searchIntent (what the reader typed or wondered), score, reason (why that score).${lessonsBlock(input.lessons)}`;

  const user = [
    input.topicHint ? `Roya's topic hint for this run (stay within it): ${input.topicHint}` : "No topic hint — choose freely.",
    "",
    "Existing articles (do not repeat these topics or near-duplicates):",
    ...(input.existingTitles.length ? input.existingTitles.map((t) => `- ${t}`) : ["(none yet)"]),
    "",
    'Return {"ideas": [{"title", "angle", "searchIntent", "score", "reason"}, ...]}.',
  ].join("\n");

  const { ideas } = await runAgentJSON({ agent: "idea_scout", system, user, temperature: 0.8 }, IdeasSchema);
  return [...ideas].sort((a, b) => b.score - a.score);
}
