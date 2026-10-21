import "server-only";

import { runAgentJSON } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { BriefSchema, type Brief, type Idea } from "../types";

/**
 * Agent 2 — strategist. Separates deciding WHAT the article is from producing
 * it: audience, keyword, outline, length and CTA are fixed here, so the writer
 * only has to write and the editor has a brief to judge the draft against.
 */
export async function writeBrief(input: { idea: Idea; lessons?: string[] }): Promise<Brief> {
  const system = `${sharedContext()}

# Your job: content strategist
Turn the chosen idea into a brief a writer can follow without guessing.
- audience: who exactly is reading (role, company size, situation).
- readerProblem: the one problem the article solves, in the reader's own words.
- primaryKeyword: 2–5 words — the short phrase a manager would actually type into Google (e.g. "company document chatbot"), not a full sentence. It must fit naturally into a heading. secondaryKeywords: related phrases.
- outline: 4–6 sections. Each heading is a plain, specific statement or question (no clever wordplay). Points are what that section must cover. The first section opens with the reader's concrete problem; the last section gives the next step.
- targetWords: 900–1400 for most topics.
- cta: the closing next step — usually requesting Roya's free 30-minute consultation, framed around this article's problem.${lessonsBlock(input.lessons)}`;

  const user = `Chosen idea:\n${JSON.stringify(input.idea, null, 2)}\n\nReturn the brief: {"workingTitle", "audience", "readerProblem", "primaryKeyword", "secondaryKeywords", "outline": [{"heading", "points"}], "targetWords", "cta"}.`;

  return runAgentJSON({ agent: "strategist", system, user, temperature: 0.7 }, BriefSchema);
}
