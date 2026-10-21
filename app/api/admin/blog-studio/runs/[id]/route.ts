import { NextResponse } from "next/server";

import { gate, jsonError } from "@/lib/admin/api";
import { getRun } from "@/lib/ai/blog-agents/store";

/** Polled by the studio every few seconds while a run is live. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await gate("viewer");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  try {
    const run = await getRun(id);
    if (!run) return jsonError("not_found", 404);
    return NextResponse.json({ run });
  } catch (err) {
    console.error("[blog-studio] get run failed:", err);
    return jsonError("storage_failed", 500);
  }
}
