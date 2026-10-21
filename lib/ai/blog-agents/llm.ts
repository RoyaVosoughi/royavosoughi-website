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
 */

export const PIPELINE_MODEL = process.env.PIPELINE_MODEL || "google/gemini-2.5-flash";
export const WRITER_MODEL = process.env.WRITER_MODEL || PIPELINE_MODEL;

/**
 * Some OpenRouter models reason by default and can spend the whole token
 * budget thinking, returning an empty answer. Low effort keeps runs stable and
 * cheap; `exclude` keeps the reasoning text out of `content`. OpenRouter
 * ignores both for models without reasoning.
 */
const REASONING_PARAMS = { reasoning: { effort: "low", exclude: true } };

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
  const model = call.model ?? PIPELINE_MODEL;

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await client.chat.completions.create({
      model,
      temperature: call.temperature,
      max_tokens: call.maxTokens ?? 4000,
      messages,
      ...REASONING_PARAMS,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming);
  } catch (err) {
    const status = err && typeof err === "object" && "status" in err ? (err as { status: unknown }).status : null;
    if (status === 402) throw new AgentError(call.agent, "no_credits", "OpenRouter is out of credits");
    throw new AgentError(call.agent, "failed", err instanceof Error ? err.message : "model request failed");
  }

  const tokensIn = response.usage?.prompt_tokens ?? null;
  const tokensOut = response.usage?.completion_tokens ?? null;
  await logAiUsage("blog_pipeline", tokensIn, tokensOut, tokensIn !== null && tokensOut !== null ? estimateCostUsd(model, tokensIn, tokensOut) : null);

  const text = (response.choices[0]?.message?.content ?? "").trim();
  if (!text) throw new AgentError(call.agent, "empty", "the model returned an empty answer");
  return text;
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
  return JSON.parse(unfenced.slice(start, end + 1));
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

  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await complete(call, messages);
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
