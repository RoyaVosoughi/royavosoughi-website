import { after, NextResponse } from "next/server";

import { gate, jsonError } from "@/lib/admin/api";
import { workOn } from "@/lib/ai/blog-agents/continuation";
import { claimRun, getRun, needsWorker } from "@/lib/ai/blog-agents/store";

/** Long enough to carry a resumed run for one invocation (see below). */
export const maxDuration = 300;

/**
 * Polled by the studio every few seconds while a run is live. It also resumes
 * a run that's waiting with no worker (paused, or its invocation was killed) —
 * the safety net behind the pipeline's own self-continuation.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await gate("viewer");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const run = await getRun(id);
    if (!run) return jsonError("not_found", 404);
    if (needsWorker(run) && (await claimRun(id))) after(() => workOn(id));
    return NextResponse.json({ run });
  } catch (err) {
    console.error("[blog-studio] get run failed:", err);
    return jsonError("storage_failed", 500);
  }
}
