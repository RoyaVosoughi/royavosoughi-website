import { after, NextResponse } from "next/server";

import { workOn } from "@/lib/ai/blog-agents/continuation";
import { claimRun } from "@/lib/ai/blog-agents/store";

export const maxDuration = 300;

/**
 * Continues a paused pipeline run in a fresh invocation (see
 * lib/ai/blog-agents/continuation.ts). Called by the pipeline itself, with
 * CRON_SECRET; the lease makes a duplicate call harmless.
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const runId = new URL(request.url).searchParams.get("run");
  if (!runId) return NextResponse.json({ error: "missing_run" }, { status: 400 });

  if (!(await claimRun(runId))) return NextResponse.json({ ok: true, claimed: false });
  after(() => workOn(runId));
  return NextResponse.json({ ok: true, claimed: true }, { status: 202 });
}
