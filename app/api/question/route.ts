import { NextResponse } from "next/server";
import { z } from "zod";

import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase";
import { sendQuestionNotification } from "@/lib/resend";

/**
 * The short "Have a question?" form in the closing section of the home page:
 * name, email and an optional message. Saved to the same contact_messages
 * table as the full contact form, tagged source = "quick-question".
 */
const QuestionSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.email().max(200),
  message: z.string().trim().max(4000).optional().or(z.literal("")),
  locale: z.enum(["en", "fa"]).default("en"),
  /** Honeypot — see /api/contact. */
  website: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const parsed = QuestionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "validation_failed", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const { website, ...data } = parsed.data;
  if (website) return NextResponse.json({ ok: true });

  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const message = data.message || "(no message)";
  const supabase = getSupabaseClient()!;
  const { error } = await supabase.from("contact_messages").insert({
    name: data.name,
    email: data.email,
    message,
    locale: data.locale,
    source: "quick-question",
  });

  if (error) {
    console.error("[question] insert failed:", error.message);
    return NextResponse.json({ error: "storage_failed" }, { status: 500 });
  }

  await sendQuestionNotification({ name: data.name, email: data.email, message });

  return NextResponse.json({ ok: true });
}
