import { after, NextResponse } from "next/server";
import { z } from "zod";

import { gate, jsonError, parseBody } from "@/lib/admin/api";
import { writeAuditLog } from "@/lib/admin/queries";
import { runPipeline, startRun } from "@/lib/ai/blog-agents/orchestrator";
import { listRuns } from "@/lib/ai/blog-agents/store";
import { isOpenRouterConfigured } from "@/lib/ai/providers/openrouter";

/** A full run is ~12 model calls; it keeps going in after() once this response is sent. */
export const maxDuration = 300;

const StartSchema = z.object({ topicHint: z.string().trim().max(300).optional() });

export async function GET() {
  const auth = await gate("viewer");
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json({ runs: await listRuns() });
  } catch (err) {
    console.error("[blog-studio] list runs failed:", err);
    return jsonError("storage_failed", 500);
  }
}

export async function POST(request: Request) {
  const auth = await gate("editor");
  if ("response" in auth) return auth.response;
  if (!isOpenRouterConfigured()) return jsonError("ai_not_configured", 503);

  const body = await parseBody(request, StartSchema);
  if ("response" in body) return body.response;
  const topicHint = body.data.topicHint || null;

  try {
    const started = await startRun("manual", topicHint);
    if (!started.ok) return jsonError(started.error, 409);
    await writeAuditLog("blog.pipeline_run", started.runId);
    // Respond with the id right away; the studio polls the run while it works.
    after(() => runPipeline(started.runId, topicHint));
    return NextResponse.json({ ok: true, runId: started.runId });
  } catch (err) {
    console.error("[blog-studio] start failed:", err);
    return jsonError("storage_failed", 500);
  }
}
