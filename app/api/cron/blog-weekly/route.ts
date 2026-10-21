import { NextResponse } from "next/server";

import { runPipeline, startRun } from "@/lib/ai/blog-agents/orchestrator";
import { getRun } from "@/lib/ai/blog-agents/store";
import { isOpenRouterConfigured } from "@/lib/ai/providers/openrouter";

export const maxDuration = 300;

/**
 * Weekly article (vercel.json: Mondays 06:00 UTC). Vercel Cron sends
 * "Authorization: Bearer $CRON_SECRET". With no secret set the endpoint stays
 * closed, so nobody on the internet can spend AI credits through it. The
 * result is always a pair of drafts waiting in /admin/blog/studio.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isOpenRouterConfigured()) return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });

  const started = await startRun("cron", null);
  if (!started.ok) return NextResponse.json({ error: started.error }, { status: 409 });
  // Awaited rather than after(): nobody waits on a cron response, and this keeps the run inside maxDuration.
  await runPipeline(started.runId, null);
  const run = await getRun(started.runId);
  return NextResponse.json({ ok: run?.status === "done", runId: started.runId, status: run?.status });
}
