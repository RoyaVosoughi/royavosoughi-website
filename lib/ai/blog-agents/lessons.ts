import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

import type { AgentLesson, LearningAgent, ProposedLesson } from "./types";

/**
 * Self-improvement without fine-tuning and without code changes: lessons are
 * plain sentences stored per agent and appended to that agent's system prompt
 * on every later run. The critic writes them after each run; Roya's 👍/👎
 * feedback becomes lessons through the same path.
 *
 * Memory needs its own guardrails, or one bad lesson poisons every future run:
 * at most MAX_ACTIVE per agent (oldest retire first, so the memory tracks
 * recent judgement), and every lesson can be retired by hand in the studio.
 */

const MAX_ACTIVE = 8;

function requireClient() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

function toLesson(row: Record<string, unknown>): AgentLesson {
  return {
    id: row.id as string,
    agent: row.agent as LearningAgent,
    lesson: row.lesson as string,
    source: row.source as AgentLesson["source"],
    runId: (row.run_id as string) ?? null,
    createdAt: row.created_at as string,
  };
}

export async function listActiveLessons(): Promise<AgentLesson[]> {
  const { data, error } = await requireClient()
    .from("blog_agent_lessons")
    .select("id, agent, lesson, source, run_id, created_at")
    .eq("active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(toLesson);
}

/** Loaded once per run, so every agent in that run learns from the same snapshot. */
export async function loadLessonsByAgent(): Promise<Map<LearningAgent, string[]>> {
  const byAgent = new Map<LearningAgent, string[]>();
  for (const l of await listActiveLessons()) byAgent.set(l.agent, [...(byAgent.get(l.agent) ?? []), l.lesson]);
  return byAgent;
}

/** The block appended to an agent's system prompt — empty when the agent has nothing to learn from yet. */
export function lessonsBlock(lessons: string[] | undefined): string {
  if (!lessons?.length) return "";
  return `\n\n# Lessons from earlier runs (follow these — they come from reviews of your past work)\n${lessons.map((l) => `- ${l}`).join("\n")}`;
}

export async function addLessons(lessons: ProposedLesson[], source: AgentLesson["source"], runId: string | null): Promise<void> {
  if (lessons.length === 0) return;
  const supabase = requireClient();
  const { error } = await supabase
    .from("blog_agent_lessons")
    .insert(lessons.map((l) => ({ agent: l.agent, lesson: l.lesson, source, run_id: runId })));
  if (error) throw error;

  for (const agent of new Set(lessons.map((l) => l.agent))) {
    const { data } = await supabase
      .from("blog_agent_lessons")
      .select("id")
      .eq("agent", agent)
      .eq("active", true)
      .order("created_at", { ascending: false });
    const overflow = (data ?? []).slice(MAX_ACTIVE).map((r) => r.id as string);
    if (overflow.length) await supabase.from("blog_agent_lessons").update({ active: false }).in("id", overflow);
  }
}

/** Retire, not delete: the row stays for the record but stops shaping prompts. */
export async function retireLesson(id: string): Promise<boolean> {
  const { data, error } = await requireClient().from("blog_agent_lessons").update({ active: false }).eq("id", id).select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}
