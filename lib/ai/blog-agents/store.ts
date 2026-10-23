import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase-admin";

import type { FaqItem, PipelineRun, RunStep } from "./types";

/**
 * Persistence for the pipeline. State lives in the database, not in memory:
 * every step is written the moment it starts and ends, so (1) the studio can
 * show a live view by simply polling the run row, (2) a run that crashes
 * mid-way still leaves a readable trail, and (3) serverless instances, which
 * share no memory, all see the same run.
 */

function requireClient() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("supabase_not_configured");
  return supabase;
}

const RUN_COLUMNS = "id, status, trigger, topic_hint, steps, post_en_id, post_fa_id, error, created_at, finished_at, lease_until";

function toRun(row: Record<string, unknown>): PipelineRun {
  return {
    id: row.id as string,
    status: row.status as PipelineRun["status"],
    trigger: row.trigger as PipelineRun["trigger"],
    topicHint: (row.topic_hint as string) ?? null,
    steps: (row.steps as RunStep[]) ?? [],
    postEnId: (row.post_en_id as string) ?? null,
    postFaId: (row.post_fa_id as string) ?? null,
    error: (row.error as string) ?? null,
    createdAt: row.created_at as string,
    finishedAt: (row.finished_at as string) ?? null,
    leaseUntil: (row.lease_until as string) ?? null,
  };
}

export async function createRun(trigger: PipelineRun["trigger"], topicHint: string | null): Promise<string> {
  const { data, error } = await requireClient()
    .from("blog_pipeline_runs")
    // The creator holds the first lease: it starts working on the run right away.
    .insert({ trigger, topic_hint: topicHint, lease_until: leaseExpiry() })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export interface RunPatch {
  status?: PipelineRun["status"];
  steps?: RunStep[];
  postEnId?: string;
  postFaId?: string;
  error?: string;
}

export async function updateRun(id: string, patch: RunPatch): Promise<void> {
  const row: Record<string, unknown> = {};
  if (patch.status) row.status = patch.status;
  if (patch.steps) row.steps = patch.steps;
  if (patch.postEnId) row.post_en_id = patch.postEnId;
  if (patch.postFaId) row.post_fa_id = patch.postFaId;
  if (patch.error) row.error = patch.error;
  if (patch.status && patch.status !== "running") row.finished_at = new Date().toISOString();
  const { error } = await requireClient().from("blog_pipeline_runs").update(row).eq("id", id);
  if (error) throw error;
}

export async function getRun(id: string): Promise<PipelineRun | null> {
  const { data, error } = await requireClient().from("blog_pipeline_runs").select(RUN_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? toRun(data) : null;
}

export async function listRuns(limit = 20): Promise<PipelineRun[]> {
  const { data, error } = await requireClient()
    .from("blog_pipeline_runs")
    .select(RUN_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map(toRun);
}

/**
 * Leases make a run resumable across serverless invocations (each capped at a
 * few minutes): a worker claims the run, works until its time budget is spent,
 * then releases it for the next invocation. The claim is one conditional
 * UPDATE, so two invocations can never both win it.
 */
const LEASE_SECONDS = 320; // a little over the routes' maxDuration (300s)

function leaseExpiry(): string {
  return new Date(Date.now() + LEASE_SECONDS * 1000).toISOString();
}

export async function claimRun(id: string): Promise<boolean> {
  const { data, error } = await requireClient()
    .from("blog_pipeline_runs")
    .update({ lease_until: leaseExpiry() })
    .eq("id", id)
    .eq("status", "running")
    .or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** Expires the lease now (rather than clearing it), so the timestamp also records when work last stopped. */
export async function releaseRun(id: string): Promise<void> {
  await requireClient().from("blog_pipeline_runs").update({ lease_until: new Date().toISOString() }).eq("id", id);
}

/** True when a running run has no live worker — it's waiting to be resumed. */
export function needsWorker(run: PipelineRun): boolean {
  return run.status === "running" && (!run.leaseUntil || Date.parse(run.leaseUntil) < Date.now());
}

/** Runs nobody has worked on for half an hour (nothing resumed them) — shown as failed, and retryable, instead of spinning forever. */
export async function failStaleRuns(idleMinutes = 30): Promise<void> {
  const cutoff = new Date(Date.now() - idleMinutes * 60_000).toISOString();
  await requireClient()
    .from("blog_pipeline_runs")
    .update({ status: "error", error: "timed_out", finished_at: new Date().toISOString() })
    .eq("status", "running")
    .or(`lease_until.lt.${cutoff},and(lease_until.is.null,created_at.lt.${cutoff})`);
}

/**
 * Re-opens a failed run so it continues from the step that failed — finished
 * steps are kept and replayed from the log, so a run that hit a daily model
 * limit at the translator only redoes the translator. Leased to the caller.
 */
export async function reopenRun(id: string): Promise<boolean> {
  const { data, error } = await requireClient()
    .from("blog_pipeline_runs")
    .update({ status: "running", error: null, finished_at: null, lease_until: leaseExpiry() })
    .eq("id", id)
    .eq("status", "error")
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

/** English titles of every existing post, draft or published — the idea scout must not pitch them again. */
export async function listExistingTitles(limit = 60): Promise<string[]> {
  const { data, error } = await requireClient()
    .from("blog_posts")
    .select("title")
    .eq("locale", "en")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((r) => r.title as string);
}

/** First free slug across both languages: the EN and FA versions share one, so it must be free in each. */
export async function freeSlug(base: string): Promise<string> {
  const { data, error } = await requireClient().from("blog_posts").select("slug").like("slug", `${base}%`);
  if (error) throw error;
  const taken = new Set((data ?? []).map((r) => r.slug as string));
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
}

export interface DraftPostInput {
  locale: "en" | "fa";
  slug: string;
  title: string;
  excerpt: string;
  bodyMd: string;
  tags: string[];
  metaTitle: string;
  metaDescription: string;
  faq: FaqItem[];
  aiScore: number;
  runId: string;
}

/** Always a draft — publishing stays a human decision in /admin/blog. */
export async function insertDraftPost(input: DraftPostInput): Promise<string> {
  const { data, error } = await requireClient()
    .from("blog_posts")
    .insert({
      locale: input.locale,
      slug: input.slug,
      title: input.title,
      excerpt: input.excerpt,
      body_md: input.bodyMd,
      tags: input.tags,
      status: "draft",
      meta_title: input.metaTitle,
      meta_description: input.metaDescription,
      faq: input.faq,
      ai_score: input.aiScore,
      run_id: input.runId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function addRunFeedback(runId: string, rating: "up" | "down", comment: string): Promise<void> {
  const { error } = await requireClient().from("blog_run_feedback").insert({ run_id: runId, rating, comment });
  if (error) throw error;
}

export async function getPostBody(id: string): Promise<{ title: string; bodyMd: string } | null> {
  const { data, error } = await requireClient().from("blog_posts").select("title, body_md").eq("id", id).maybeSingle();
  if (error) throw error;
  return data ? { title: data.title as string, bodyMd: (data.body_md as string) ?? "" } : null;
}

/** One run at a time: two concurrent runs would pitch the same idea and race for the same slug. */
export async function hasRunningRun(): Promise<boolean> {
  const { count, error } = await requireClient()
    .from("blog_pipeline_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", "running");
  if (error) throw error;
  return (count ?? 0) > 0;
}
