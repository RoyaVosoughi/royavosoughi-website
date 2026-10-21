import { NextResponse } from "next/server";

import { gate, jsonError } from "@/lib/admin/api";
import { listActiveLessons } from "@/lib/ai/blog-agents/lessons";

export async function GET() {
  const auth = await gate("viewer");
  if ("response" in auth) return auth.response;
  try {
    return NextResponse.json({ lessons: await listActiveLessons() });
  } catch (err) {
    console.error("[blog-studio] list lessons failed:", err);
    return jsonError("storage_failed", 500);
  }
}
