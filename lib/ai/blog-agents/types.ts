import { z } from "zod";

/**
 * Output contracts. Each agent's output is the next agent's input, so these
 * schemas play the role an interface plays in ordinary code: the strategist
 * can rely on `idea.angle` existing because runAgentJSON refused anything
 * that didn't match. Bounds (min/max) are deliberate — they turn "the model
 * returned one idea" or "a 400-character meta description" into a retry
 * instead of a silent downstream bug.
 *
 * No "server-only": the studio UI imports the types to render step outputs.
 */

/** Agents that learn — each has its own slot in blog_agent_lessons. */
export const LEARNING_AGENTS = ["idea_scout", "strategist", "researcher", "writer", "editor", "seo", "translator"] as const;
export type LearningAgent = (typeof LEARNING_AGENTS)[number];

/** Every step the studio shows, in pipeline order. Publisher is code, critic produces lessons rather than receiving them. */
export const PIPELINE_STEPS = [...LEARNING_AGENTS, "publisher", "critic"] as const;
export type PipelineStep = (typeof PIPELINE_STEPS)[number];

// 1 — Idea scout
export const IdeaSchema = z.object({
  title: z.string().min(10).max(140),
  angle: z.string().min(10).max(400),
  searchIntent: z.string().min(5).max(200),
  score: z.number().min(0).max(10),
  reason: z.string().min(10).max(400),
});
export const IdeasSchema = z.object({ ideas: z.array(IdeaSchema).min(3).max(6) });
export type Idea = z.infer<typeof IdeaSchema>;

// 2 — Strategist
export const BriefSchema = z.object({
  workingTitle: z.string().min(10).max(140),
  audience: z.string().min(10).max(300),
  readerProblem: z.string().min(10).max(400),
  primaryKeyword: z.string().min(2).max(50).refine((k) => k.trim().split(/\s+/).length <= 5, "the primary keyword must be 2–5 words"),
  secondaryKeywords: z.array(z.string().min(2).max(80)).min(2).max(8),
  outline: z
    .array(z.object({ heading: z.string().min(3).max(120), points: z.array(z.string().min(3).max(300)).min(1).max(6) }))
    .min(3)
    .max(8),
  targetWords: z.number().int().min(600).max(2000),
  cta: z.string().min(10).max(300),
});
export type Brief = z.infer<typeof BriefSchema>;

// 3 — Researcher
export const ResearchQueriesSchema = z.object({ queries: z.array(z.string().min(3).max(200)).min(1).max(4) });
export const ResearchSchema = z.object({
  /** `source` is a URL from the search results, or null for general knowledge — the writer may only quote numbers that have one. */
  facts: z.array(z.object({ claim: z.string().min(5).max(400), source: z.string().max(500).nullable() })).max(10),
  examples: z.array(z.string().min(5).max(400)).max(6),
  readerQuestions: z.array(z.string().min(5).max(200)).min(2).max(6),
  // Models often answer a "notes" field with a bullet list — same content, so accept it as prose instead of failing the run.
  angleNotes: z.preprocess((v) => (Array.isArray(v) ? v.join(" ") : v), z.string().min(10).max(1500)),
});
export type Research = z.infer<typeof ResearchSchema>;

// 5 — Editor
export const ReviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  verdict: z.enum(["approve", "revise"]),
  strengths: z.array(z.string().min(3).max(300)).max(5),
  issues: z
    .array(
      z.object({
        severity: z.enum(["major", "minor"]),
        where: z.string().min(2).max(120),
        problem: z.string().min(5).max(400),
        fix: z.string().min(5).max(400),
      }),
    )
    .max(10),
});
export type Review = z.infer<typeof ReviewSchema>;

// 6 — SEO (the LLM half; seo-checks.ts is the deterministic half)
export const FaqItemSchema = z.object({ question: z.string().min(5).max(200), answer: z.string().min(10).max(600) });
export type FaqItem = z.infer<typeof FaqItemSchema>;
export const SeoSchema = z.object({
  slug: z.string().min(3).max(80).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words separated by single dashes"),
  title: z.string().min(10).max(120),
  metaTitle: z.string().min(10).max(65),
  metaDescription: z.string().min(70).max(160),
  excerpt: z.string().min(40).max(300),
  tags: z.array(z.string().min(2).max(40)).min(2).max(6),
  faq: z.array(FaqItemSchema).min(2).max(5),
});
export type Seo = z.infer<typeof SeoSchema>;

// 7 — Translator (metadata half; the body is translated as free text)
export const TranslationMetaSchema = z.object({
  title: z.string().min(5).max(140),
  metaTitle: z.string().min(5).max(70),
  metaDescription: z.string().min(40).max(200),
  excerpt: z.string().min(20).max(350),
  tags: z.array(z.string().min(2).max(40)).min(1).max(6),
  faq: z.array(FaqItemSchema).min(1).max(5),
});
export type TranslationMeta = z.infer<typeof TranslationMetaSchema>;

// 9 — Critic
export const LessonsSchema = z.object({
  lessons: z.array(z.object({ agent: z.enum(LEARNING_AGENTS), lesson: z.string().min(10).max(300) })).max(3),
});
export type ProposedLesson = z.infer<typeof LessonsSchema>["lessons"][number];

// Run log — what the studio polls.
export interface RunStep {
  agent: PipelineStep;
  /** Writer and editor repeat during the revision loop — round 0 is the first draft. */
  round?: number;
  status: "running" | "done" | "error";
  startedAt: string;
  finishedAt?: string;
  summary?: string;
  output?: unknown;
}

export interface PipelineRun {
  id: string;
  status: "running" | "done" | "error";
  trigger: "manual" | "cron";
  topicHint: string | null;
  steps: RunStep[];
  postEnId: string | null;
  postFaId: string | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  /** While a worker holds this run; null or past means nobody is working on it. */
  leaseUntil: string | null;
}

export interface AgentLesson {
  id: string;
  agent: LearningAgent;
  lesson: string;
  source: "critic" | "human";
  runId: string | null;
  createdAt: string;
}
