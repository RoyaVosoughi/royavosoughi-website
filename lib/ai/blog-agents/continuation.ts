import "server-only";

import { continueRun } from "./orchestrator";

/**
 * Keeps a paused run moving. Two independent triggers, so one failing isn't fatal:
 *
 * 1. Self-chaining: when an invocation pauses, it calls /api/cron/blog-continue
 *    on its own deployment, which claims the run and works on in a fresh
 *    invocation. This is what carries the unattended weekly run to the end.
 * 2. The studio's poll (/api/admin/blog-studio/runs/[id]) resumes any running
 *    run nobody holds — covers a self-call that failed or an invocation that
 *    was killed mid-step, as long as the studio is open.
 */

async function scheduleContinuation(runId: string): Promise<void> {
  const secret = process.env.CRON_SECRET;
  const host = process.env.VERCEL_URL; // this exact deployment, so a preview continues on preview code
  if (!secret || !host) return; // local dev: the studio's poll resumes instead
  const headers: Record<string, string> = { Authorization: `Bearer ${secret}` };
  // Preview deployments sit behind Vercel's login unless the automation bypass is used.
  const bypass = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  if (bypass) headers["x-vercel-protection-bypass"] = bypass;
  try {
    await fetch(`https://${host}/api/cron/blog-continue?run=${encodeURIComponent(runId)}`, { method: "POST", headers, signal: AbortSignal.timeout(15_000) });
  } catch (err) {
    console.error("[blog-agents] self-continue failed; the studio will resume it:", err);
  }
}

/** Runs one invocation's worth of work (caller holds the lease), then hands off if there's more. */
export async function workOn(runId: string): Promise<void> {
  if ((await continueRun(runId)) === "paused") await scheduleContinuation(runId);
}
