import { after, NextResponse } from "next/server";

import { gate, jsonError } from "@/lib/admin/api";
import { writeAuditLog } from "@/lib/admin/queries";
import { workOn } from "@/lib/ai/blog-agents/continuation";
import { hasRunningRun, reopenRun } from "@/lib/ai/blog-agents/store";

export const maxDuration = 300;

/** Continues a failed run from the step that failed; finished steps aren't redone. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await gate("editor");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    if (await hasRunningRun()) return jsonError("already_running", 409);
    if (!(await reopenRun(id))) return jsonError("not_found", 404);
    await writeAuditLog("blog.pipeline_retry", id);
    after(() => workOn(id));
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[blog-studio] retry failed:", err);
    return jsonError("storage_failed", 500);
  }
}
