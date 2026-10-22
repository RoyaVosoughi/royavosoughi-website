import "server-only";

import type OpenAI from "openai";
import type { z } from "zod";

import { logAiUsage } from "@/lib/admin/queries";

import { estimateCostUsd } from "../model-catalog";
import { getOpenRouterClient } from "../providers/openrouter";

/**
 * The AI core every blog agent is built on. An "agent" here is nothing more
 * than: a specialised system prompt + an output contract + its own settings
 * (model, temperature). These two helpers are the only place that talks to a
 * model, so cost logging, reasoning limits and error handling live once.
 *
 * Models: PIPELINE_MODEL for every agent (default google/gemini-2.5-flash),
 * WRITER_MODEL optionally for the writer alone — the one job where a stronger
 * model visibly pays off. Switching provider is changing a slug.
 *
 * Either may be a comma-separated list: OpenRouter tries them in order and
 * falls through to the next when one is retired, rate-limited or down —
 * essential on free models, which come and go without notice.
 */

export const PIPELINE_MODEL = process.env.PIPELINE_MODEL || "google/gemini-2.5-flash";
export const WRITER_MODEL = process.env.WRITER_MODEL || PIPELINE_MODEL;

function modelParams(setting: string): { model: string; models?: string[] } {
  const list = setting.split(",").map((m) => m.trim()).filter(Boolean);
  // OpenRouter's fallback routing caps the list at 3 models.
  return list.length > 1 ? { model: list[0], models: list.slice(0, 3) } : { model: list[0] };
}

/**
 * Some OpenRouter models reason by default and can spend the whole token
 * budget thinking, returning an empty answer. Low effort keeps runs stable and
 * cheap; `exclude` keeps the reasoning text out of `content`. OpenRouter
 * ignores both for models without reasoning.
 */
const REASONING_PARAMS = { reasoning: { effort: "low", exclude: true } };

/** A hung free model should fail fast and fall through to the next one, not eat the whole invocation. */
const CALL_TIMEOUT_MS = 120_000;

export class AgentError extends Error {
  constructor(
    public readonly agent: string,
    public readonly code: "not_configured" | "no_credits" | "empty" | "invalid_output" | "failed",
    message: string,
  ) {
    super(`${agent}: ${message}`);
  }
}

interface AgentCall {
  agent: string;
  system: string;
  user: string;
  temperature: number;
  model?: string;
  maxTokens?: number;
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam;

async function complete(call: AgentCall, messages: Message[]): Promise<string> {
  const client = getOpenRouterClient();
  if (!client) throw new AgentError(call.agent, "not_configured", "OPENROUTER_API_KEY is not set");
  const list = (call.model ?? PIPELINE_MODEL).split(",").map((m) => m.trim()).filter(Boolean);

  // OpenRouter falls back on errors, but not when a model answers with nothing —
  // so an empty answer moves on to the next model in the list here.
  let lastError: AgentError | null = null;
  for (let start = 0; start < list.length; start++) {
    const models = modelParams(list.slice(start).join(","));
    let response: OpenAI.Chat.Completions.ChatCompletion;
    try {
      response = await client.chat.completions.create({
        ...models,
        temperature: call.temperature,
        max_tokens: call.maxTokens ?? 4000,
        messages,
        ...REASONING_PARAMS,
      } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming, { timeout: CALL_TIMEOUT_MS, maxRetries: 0 });
    } catch (err) {
      const status = err && typeof err === "object" && "status" in err ? (err as { status: unknown }).status : null;
      if (status === 402) throw new AgentError(call.agent, "no_credits", "OpenRouter is out of credits");
      // A timeout aborts OpenRouter's own fallback too, so the next model is tried from here.
      lastError = new AgentError(call.agent, "failed", err instanceof Error ? err.message : "model request failed");
      continue;
    }

    const tokensIn = response.usage?.prompt_tokens ?? null;
    const tokensOut = response.usage?.completion_tokens ?? null;
    // response.model is whichever model in the list actually answered.
    const used = response.model || models.model;
    await logAiUsage("blog_pipeline", tokensIn, tokensOut, tokensIn !== null && tokensOut !== null ? estimateCostUsd(used, tokensIn, tokensOut) : null);

    // Free providers sometimes answer 200 with an error body and no `choices` at all.
    const text = (response.choices?.[0]?.message?.content ?? "").trim();
    if (text) return text;
    const upstream = (response as unknown as { error?: { message?: string } }).error?.message;
    lastError = new AgentError(call.agent, "empty", upstream ? `${used}: ${upstream}` : `${used} returned an empty answer`);
    // Skip past the model that answered empty, not just the first in the list.
    const index = list.findIndex((m) => used.startsWith(m.replace(/:free$/, "")));
    if (index > start) start = index;
  }
  throw lastError ?? new AgentError(call.agent, "empty", "the model returned an empty answer");
}

/**
 * Free-text output. Only the writer uses this: its output is read by a human
 * (and by the editor as prose), so forcing it into JSON would only add a
 * failure mode — escaped newlines in a 1,500-word string break often.
 */
export async function runAgentText(call: AgentCall): Promise<string> {
  const text = await complete(call, [
    { role: "system", content: call.system },
    { role: "user", content: call.user },
  ]);
  // Some models wrap the whole article in a ```markdown fence.
  return text.replace(/^```(?:markdown|md)?\s*\n/i, "").replace(/\n```\s*$/, "").trim();
}

/** Pulls the first {...} block out of a reply — tolerates ```json fences and a sentence before/after. */
export function extractJson(text: string): unknown {
  const unfenced = text.replace(/```(?:json)?/gi, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object found in the reply");
  const raw = unfenced.slice(start, end + 1);
  try {
    return JSON.parse(raw);
  } catch (err) {
    // Trailing commas are the most common near-miss from smaller models; fix that one thing, nothing cleverer.
    try {
      return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      throw err;
    }
  }
}

/**
 * Structured output: extract → validate with Zod → on failure, send the
 * concrete error back to the model and let it correct itself once.
 *
 * Why not the SDK's JSON mode / tool calling? Across OpenRouter's many models,
 * support for both is inconsistent. Plain extraction + a schema check works on
 * every model, and the mechanism stays visible. The schema is the contract
 * between agents: whatever passes it is safe for the next agent to consume.
 */
export async function runAgentJSON<T>(call: AgentCall, schema: z.ZodType<T>): Promise<T> {
  const messages: Message[] = [
    { role: "system", content: `${call.system}\n\nRespond with ONLY one JSON object — no prose, no code fences.` },
    { role: "user", content: call.user },
  ];

  // With a model list, each retry leads with the next model: if one model keeps
  // producing broken JSON, asking it again rarely helps — a different one usually does.
  const list = (call.model ?? PIPELINE_MODEL).split(",").map((m) => m.trim()).filter(Boolean);
  const attempts = Math.max(2, Math.min(list.length, 3));

  let lastError = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    const k = attempt % list.length;
    const text = await complete({ ...call, model: [...list.slice(k), ...list.slice(0, k)].join(",") }, messages);
    try {
      const parsed = schema.safeParse(extractJson(text));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    } catch (err) {
      lastError = err instanceof Error ? err.message : "unparseable JSON";
    }
    // Validate + retry: the model sees its own answer and exactly what was wrong with it.
    messages.push(
      { role: "assistant", content: text },
      { role: "user", content: `That JSON did not match the required shape: ${lastError}. Return the corrected JSON object only.` },
    );
  }
  throw new AgentError(call.agent, "invalid_output", lastError);
}
