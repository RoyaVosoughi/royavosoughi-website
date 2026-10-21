import "server-only";

import { runAgentJSON } from "../llm";
import { lessonsBlock } from "../lessons";
import { sharedContext } from "../profile";
import { ResearchQueriesSchema, ResearchSchema, type Brief, type Research } from "../types";

/**
 * Agent 3 — researcher. Pattern: "the model decides, the code executes." The
 * LLM writes the search queries; plain fetch() runs them against Tavily; the
 * LLM then distils the results. The model never gets network access itself.
 *
 * Tavily is optional. Without TAVILY_API_KEY the researcher works from its own
 * knowledge — and every fact is then marked source: null, which the writer is
 * told means "don't quote numbers from this". That's what stops a model from
 * inventing "73% of companies…" statistics.
 */

interface SearchHit {
  title: string;
  url: string;
  content: string;
}

async function tavilySearch(query: string): Promise<SearchHit[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) return [];
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query, max_results: 5, search_depth: "basic" }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { results?: SearchHit[] };
    return (data.results ?? []).map((r) => ({ title: r.title, url: r.url, content: (r.content ?? "").slice(0, 800) }));
  } catch {
    // A failed search narrows the research; it shouldn't stop the run.
    return [];
  }
}

export function isWebResearchEnabled(): boolean {
  return Boolean(process.env.TAVILY_API_KEY);
}

export async function research(input: { brief: Brief; lessons?: string[] }): Promise<Research & { queries: string[]; webResults: number }> {
  const briefJson = JSON.stringify(input.brief, null, 2);
  let queries: string[] = [];
  let hits: SearchHit[] = [];

  if (isWebResearchEnabled()) {
    // Step 1 — the model decides what to look up.
    ({ queries } = await runAgentJSON(
      {
        agent: "researcher",
        system: "You write web search queries for researching a business blog article. Prefer queries that surface recent, citable sources: surveys, official documentation, reputable industry reports.",
        user: `Brief:\n${briefJson}\n\nReturn {"queries": [up to 3 search queries]}.`,
        temperature: 0.4,
      },
      ResearchQueriesSchema,
    ));
    // Step 2 — the code executes it.
    const seen = new Set<string>();
    for (const batch of await Promise.all(queries.map(tavilySearch))) {
      for (const hit of batch) {
        if (seen.has(hit.url)) continue;
        seen.add(hit.url);
        hits.push(hit);
      }
    }
    hits = hits.slice(0, 12);
  }

  const sources = hits.length
    ? `Search results (cite a fact's source by its exact URL):\n${hits.map((h, i) => `[${i + 1}] ${h.title}\n${h.url}\n${h.content}`).join("\n\n")}`
    : "No web search is available for this run. Work from general knowledge only, and set every fact's source to null.";

  const system = `${sharedContext()}

# Your job: researcher
Gather the raw material the writer needs for this brief.
- facts: claims that support the article. "source" is the exact URL from the search results it came from, or null if it's general knowledge. Never invent or guess a URL, and never put a specific statistic in a fact whose source is null.
- examples: concrete, realistic business situations that illustrate the points (clearly generic — not presented as Roya's clients).
- readerQuestions: questions a manager would still have after reading the outline — these feed the FAQ.
- angleNotes: what most articles on this topic get wrong or leave out, and how this one can be more useful.${lessonsBlock(input.lessons)}`;

  const result = await runAgentJSON(
    {
      agent: "researcher",
      system,
      user: `Brief:\n${briefJson}\n\n${sources}\n\nReturn {"facts": [{"claim", "source"}], "examples", "readerQuestions", "angleNotes"}.`,
      temperature: 0.5,
      maxTokens: 5000,
    },
    ResearchSchema,
  );

  // Code, not trust: a source the search never returned is a hallucinated URL — drop it to null.
  const realUrls = new Set(hits.map((h) => h.url));
  const facts = result.facts.map((f) => ({ ...f, source: f.source && realUrls.has(f.source) ? f.source : null }));
  return { ...result, facts, queries, webResults: hits.length };
}
