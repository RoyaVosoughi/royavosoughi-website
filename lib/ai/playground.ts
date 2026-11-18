import "server-only";

import { ThinkingLevel } from "@google/genai";

import { getGeminiClient, isGeminiConfigured } from "./gemini";
import { getModelCatalogEntry } from "./model-catalog";
import { buildSystemInstruction } from "./prompt";
import { getActivePromptContent } from "./prompt-versions";
import { retrieveContext, type RetrievedChunk } from "./retrieval";
import { getOpenRouterClient, isOpenRouterConfigured } from "./providers/openrouter";
import { openAiToolDeclarations, toolDeclarations } from "./tools";
import type { Locale } from "./types";

export interface PlaygroundInput {
  message: string;
  locale: Locale;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  /** Test a draft persona without saving it as the active prompt_versions row. */
  promptOverride?: string;
}

export interface PlaygroundOutput {
  reply: string;
  model: string;
  tokensIn?: number;
  tokensOut?: number;
  retrievedChunks: RetrievedChunk[];
  toolCalls: string[];
}

/**
 * A single-turn, never-persisted version of brain.ts's generation call —
 * reuses the same retrieval/prompt-building so what an admin sees here
 * matches production, but skips memory (no conversation history) and never
 * writes to conversations/messages/leads/handoff_requests. Tool calls are
 * detected and reported, never executed — a test message shouldn't be able
 * to capture a real lead or page a human.
 */
export async function runPlaygroundTurn(input: PlaygroundInput): Promise<PlaygroundOutput> {
  // Same provider split as brain.ts: "gemini" catalog entries go straight to
  // Google with Roya's own key; everything else goes through OpenRouter.
  const isGemini = getModelCatalogEntry(input.model)?.provider === "gemini";
  if (isGemini ? !isGeminiConfigured() : !isOpenRouterConfigured()) throw new Error("not_configured");

  const [context, activePrompt] = await Promise.all([
    retrieveContext(input.message, input.locale),
    input.promptOverride !== undefined ? Promise.resolve(input.promptOverride) : getActivePromptContent(input.locale),
  ]);

  const systemInstruction = buildSystemInstruction(input.locale, context, [], { prompt: activePrompt });

  if (isGemini) {
    const response = await getGeminiClient()!.models.generateContent({
      model: input.model,
      contents: [{ role: "user", parts: [{ text: input.message }] }],
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: toolDeclarations }],
        thinkingConfig: { includeThoughts: false, thinkingLevel: ThinkingLevel.LOW },
        temperature: input.temperature,
        topP: input.topP,
        maxOutputTokens: input.maxTokens,
      },
    });

    return {
      reply: response.text ?? "",
      model: input.model,
      tokensIn: response.usageMetadata?.promptTokenCount,
      tokensOut: response.usageMetadata?.candidatesTokenCount,
      retrievedChunks: context,
      toolCalls: (response.functionCalls ?? []).map((c) => c.name ?? "").filter(Boolean),
    };
  }

  const client = getOpenRouterClient()!;
  const response = await client.chat.completions.create({
    model: input.model,
    messages: [
      { role: "system", content: systemInstruction },
      { role: "user", content: input.message },
    ],
    tools: openAiToolDeclarations,
    temperature: input.temperature,
    top_p: input.topP,
    max_tokens: input.maxTokens,
  });

  const message = response.choices[0]?.message;
  const toolCalls = (message?.tool_calls ?? []).filter((c) => c.type === "function").map((c) => c.function.name);

  return {
    reply: message?.content ?? "",
    model: input.model,
    tokensIn: response.usage?.prompt_tokens,
    tokensOut: response.usage?.completion_tokens,
    retrievedChunks: context,
    toolCalls,
  };
}
