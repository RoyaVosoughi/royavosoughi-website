import { NextResponse } from "next/server";

import { gate, jsonError } from "@/lib/admin/api";
import { writeAuditLog } from "@/lib/admin/queries";
import { retireLesson } from "@/lib/ai/blog-agents/lessons";

/** Human oversight of the memory: a wrong lesson is retired before it shapes another run. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await gate("editor");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    if (!(await retireLesson(id))) return jsonError("not_found", 404);
    await writeAuditLog("blog.lesson_retire", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[blog-studio] retire lesson failed:", err);
    return jsonError("storage_failed", 500);
  }
}
