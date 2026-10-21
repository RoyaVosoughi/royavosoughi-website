import { NextResponse } from "next/server";
import { z } from "zod";

import { gate, jsonError, parseBody } from "@/lib/admin/api";
import { writeAuditLog } from "@/lib/admin/queries";
import { lessonsFromFeedback } from "@/lib/ai/blog-agents/agents/critic";
import { addLessons, listActiveLessons } from "@/lib/ai/blog-agents/lessons";
import { AgentError } from "@/lib/ai/blog-agents/llm";
import { addRunFeedback, getPostBody, getRun } from "@/lib/ai/blog-agents/store";

export const maxDuration = 60;

const FeedbackSchema = z.object({ rating: z.enum(["up", "down"]), comment: z.string().trim().max(2000) });

/**
 * Human feedback → lessons. The feedback row is always kept; a 👍 with no
 * comment is just recorded (nothing to correct), anything else goes through
 * the critic and lands in the same lessons memory the critic writes to.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await gate("editor");
  if ("response" in auth) return auth.response;
  const body = await parseBody(request, FeedbackSchema);
  if ("response" in body) return body.response;

  const { id } = await params;
  try {
    const run = await getRun(id);
    if (!run?.postEnId) return jsonError("not_found", 404);
    // Read the post as it is now: if Roya already edited it, the critic sees her version.
    const post = await getPostBody(run.postEnId);
    if (!post) return jsonError("not_found", 404);

    await addRunFeedback(id, body.data.rating, body.data.comment);
    await writeAuditLog("blog.feedback", id);
    if (body.data.rating === "up" && !body.data.comment) return NextResponse.json({ ok: true, lessons: [] });

    const existing = await listActiveLessons();
    const lessons = await lessonsFromFeedback({
      ...body.data,
      title: post.title,
      article: post.bodyMd,
      existingLessons: existing.map((l) => `${l.agent}: ${l.lesson}`),
    });
    await addLessons(lessons, "human", id);
    return NextResponse.json({ ok: true, lessons });
  } catch (err) {
    console.error("[blog-studio] feedback failed:", err);
    if (err instanceof AgentError) return err.code === "no_credits" ? jsonError("ai_no_credits", 402) : jsonError("ai_failed", 502);
    return jsonError("storage_failed", 500);
  }
}
