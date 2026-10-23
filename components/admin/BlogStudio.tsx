"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";

import { cardClass, inputClass, primaryButton, secondaryButton, Spinner, StatusChip, textareaClass } from "@/components/admin/crm/ui";
import { LEARNING_AGENTS, type AgentLesson, type PipelineRun, type RunStep } from "@/lib/ai/blog-agents/types";

/**
 * /admin/blog/studio. The live view is plain polling of the run row: the
 * orchestrator writes every step to the database as it happens, so the UI
 * needs no websocket or stream — just GET the run every few seconds while
 * it's running.
 */

const POLL_MS = 2500;

const RUN_CHIP: Record<PipelineRun["status"], string> = { running: "sent", done: "accepted", error: "failed" };

interface Props {
  initialRuns: PipelineRun[];
  initialLessons: AgentLesson[];
  canEdit: boolean;
  webResearch: boolean;
  models: { pipeline: string; writer: string };
}

export function BlogStudio({ initialRuns, initialLessons, canEdit, webResearch, models }: Props) {
  const t = useTranslations("blogStudio");
  const [runs, setRuns] = useState(initialRuns);
  const [lessons, setLessons] = useState(initialLessons);
  const [selectedId, setSelectedId] = useState<string | null>(initialRuns[0]?.id ?? null);
  const [tab, setTab] = useState<"runs" | "lessons">("runs");
  const [topic, setTopic] = useState("");
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = runs.find((r) => r.id === selectedId) ?? null;

  const errorText = useCallback(
    (code: string | undefined) => (code && ["already_running", "ai_not_configured", "ai_no_credits", "timed_out"].includes(code) ? t(`errors.${code}`) : t("errors.generic")),
    [t],
  );

  const refreshRuns = useCallback(async () => {
    const response = await fetch("/api/admin/blog-studio/runs");
    if (response.ok) setRuns((await response.json()).runs);
  }, []);

  const refreshLessons = useCallback(async () => {
    const response = await fetch("/api/admin/blog-studio/lessons");
    if (response.ok) setLessons((await response.json()).lessons);
  }, []);

  // Poll the selected run while it's live; refresh the lessons once it ends (the critic may have added some).
  const live = selected?.status === "running";
  useEffect(() => {
    if (!live || !selectedId) return;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/admin/blog-studio/runs/${selectedId}`);
      if (!response.ok) return;
      const { run } = (await response.json()) as { run: PipelineRun };
      setRuns((prev) => prev.map((r) => (r.id === run.id ? run : r)));
      if (run.status !== "running") void refreshLessons();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, selectedId, refreshLessons]);

  async function start() {
    setStarting(true);
    setError(null);
    const response = await fetch("/api/admin/blog-studio/runs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicHint: topic.trim() || undefined }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setStarting(false);
      setError(errorText(data.error));
      return;
    }
    const list = await fetch("/api/admin/blog-studio/runs").then((r) => r.json());
    setRuns(list.runs);
    setSelectedId(data.runId);
    setTab("runs");
    setTopic("");
    setStarting(false);
  }

  async function retire(id: string) {
    if (!window.confirm(t("confirmRetire"))) return;
    const response = await fetch(`/api/admin/blog-studio/lessons/${id}`, { method: "DELETE" });
    if (response.ok) setLessons((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <div className="flex flex-col gap-8">
      {canEdit ? (
        <div className={cardClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink/60">{t("topicLabel")}</span>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} placeholder={t("topicPlaceholder")} className={inputClass} dir="auto" />
            </label>
            <button type="button" onClick={start} disabled={starting || runs.some((r) => r.status === "running")} className={primaryButton}>
              {starting ? <Spinner /> : null}
              {starting ? t("starting") : t("start")}
            </button>
          </div>
          {error ? <p className="mt-3 text-sm text-amber-deep">{error}</p> : null}
          <p className="mt-4 text-xs text-ink/50">
            {webResearch ? t("webOn") : t("webOff")} · <span dir="ltr">{t("models", models)}</span> · {t("weekly")}
          </p>
        </div>
      ) : null}

      <div role="tablist" className="flex gap-2">
        {(["runs", "lessons"] as const).map((key) => (
          <button
            key={key}
            role="tab"
            type="button"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${tab === key ? "bg-ink text-canvas" : "text-ink/70 hover:bg-mist/60"}`}
          >
            {key === "runs" ? t("tabRuns") : t("tabLessons", { count: lessons.length })}
          </button>
        ))}
      </div>

      {tab === "runs" ? (
        runs.length === 0 ? (
          <p className="text-ink/60">{t("noRuns")}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
            <ul className="flex flex-col gap-2">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(run.id)}
                    aria-current={run.id === selectedId}
                    className={`w-full rounded-2xl border-2 p-3 text-start transition-colors ${run.id === selectedId ? "border-cobalt bg-cobalt/5" : "border-ink/10 hover:bg-mist/40"}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <StatusChip status={RUN_CHIP[run.status]} label={t(`status.${run.status}`)} />
                      <span className="text-xs text-ink/50">{t(`trigger.${run.trigger}`)}</span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm font-medium text-ink" dir="auto">
                      {runTitle(run) ?? run.topicHint ?? t("noTopic")}
                    </p>
                    <p className="mt-1 text-xs text-ink/50">{new Date(run.createdAt).toLocaleString()}</p>
                  </button>
                </li>
              ))}
            </ul>
            {selected ? <RunDetail key={selected.id} run={selected} canEdit={canEdit} onLessons={refreshLessons} onRetried={refreshRuns} errorText={errorText} /> : null}
          </div>
        )
      ) : (
        <LessonsPanel lessons={lessons} canEdit={canEdit} onRetire={retire} />
      )}
    </div>
  );
}

/** The idea the scout picked — the most useful label for a run in the list. */
function runTitle(run: PipelineRun): string | null {
  const scout = run.steps.find((s) => s.agent === "idea_scout" && s.status === "done");
  const ideas = scout?.output as { title: string }[] | undefined;
  return ideas?.[0]?.title ?? null;
}

function RetryButton({ runId, onRetried, errorText }: { runId: string; onRetried: () => void; errorText: (code?: string) => string }) {
  const t = useTranslations("blogStudio");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function retry() {
    setPending(true);
    setError(null);
    const response = await fetch(`/api/admin/blog-studio/runs/${runId}/retry`, { method: "POST" });
    const data = await response.json().catch(() => ({}));
    setPending(false);
    if (!response.ok) {
      setError(errorText(data.error));
      return;
    }
    onRetried();
  }

  return (
    <div className="mt-3">
      <button type="button" onClick={retry} disabled={pending} className={secondaryButton}>
        {pending ? <Spinner /> : null}
        {pending ? t("retrying") : t("retry")}
      </button>
      <p className="mt-2 text-xs text-ink/60">{t("retryHint")}</p>
      {error ? <p className="mt-1 text-xs">{error}</p> : null}
    </div>
  );
}

function RunDetail({
  run,
  canEdit,
  onLessons,
  onRetried,
  errorText,
}: {
  run: PipelineRun;
  canEdit: boolean;
  onLessons: () => void;
  onRetried: () => void;
  errorText: (code?: string) => string;
}) {
  const t = useTranslations("blogStudio");
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <ol className="flex flex-col gap-3">
        {run.steps.map((step, i) => (
          <StepRow key={i} step={step} />
        ))}
      </ol>
      {run.status === "error" ? (
        <div className="rounded-2xl bg-amber/15 p-4 text-sm text-amber-deep">
          <p dir="auto">{run.error === "timed_out" ? errorText("timed_out") : run.error}</p>
          {canEdit ? <RetryButton runId={run.id} onRetried={onRetried} errorText={errorText} /> : null}
        </div>
      ) : null}
      {run.postEnId || run.postFaId ? (
        <div className="flex flex-wrap gap-4">
          {run.postEnId ? (
            <Link href={`/admin/blog/${run.postEnId}`} className="text-sm font-semibold text-cobalt hover:underline">
              {t("openEn")}
            </Link>
          ) : null}
          {run.postFaId ? (
            <Link href={`/admin/blog/${run.postFaId}`} className="text-sm font-semibold text-cobalt hover:underline">
              {t("openFa")}
            </Link>
          ) : null}
        </div>
      ) : null}
      {canEdit && run.status === "done" && run.postEnId ? <FeedbackBox runId={run.id} onLessons={onLessons} errorText={errorText} /> : null}
    </div>
  );
}

function StepRow({ step }: { step: RunStep }) {
  const t = useTranslations("blogStudio");
  const seconds = step.finishedAt ? Math.round((Date.parse(step.finishedAt) - Date.parse(step.startedAt)) / 1000) : null;
  const output = step.output === undefined ? null : typeof step.output === "string" ? step.output : JSON.stringify(step.output, null, 2);
  return (
    <li className={`rounded-2xl border-2 p-4 ${step.status === "error" ? "border-amber-deep/30" : "border-ink/10"}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {step.status === "running" ? <Spinner className="text-cobalt" /> : <span aria-hidden="true">{step.status === "done" ? "✓" : "✕"}</span>}
        <span className="font-semibold text-ink">{t(`agents.${step.agent}`)}</span>
        {step.round ? <span className="text-xs text-ink/50">{t("revision", { n: step.round })}</span> : null}
        {seconds !== null ? <span className="ms-auto text-xs text-ink/45">{t("seconds", { s: seconds })}</span> : null}
      </div>
      {step.summary ? (
        <p className="mt-1.5 text-sm text-ink/75" dir="auto">
          {step.summary}
        </p>
      ) : null}
      {output ? (
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-semibold text-cobalt">{t("showOutput")}</summary>
          <pre className="mt-2 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-mist/50 p-3 text-xs leading-relaxed text-ink/85" dir="auto">
            {output}
          </pre>
        </details>
      ) : null}
    </li>
  );
}

function FeedbackBox({ runId, onLessons, errorText }: { runId: string; onLessons: () => void; errorText: (code?: string) => string }) {
  const t = useTranslations("blogStudio");
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ agent: string; lesson: string }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (!rating) return;
    setSending(true);
    setError(null);
    const response = await fetch(`/api/admin/blog-studio/runs/${runId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment }),
    });
    const data = await response.json().catch(() => ({}));
    setSending(false);
    if (!response.ok) {
      setError(errorText(data.error));
      return;
    }
    setResult(data.lessons);
    onLessons();
  }

  if (result) {
    return (
      <div className={cardClass}>
        <p className="text-sm font-semibold text-ink">{t("feedbackSaved")}</p>
        {result.length ? (
          <>
            <p className="mt-2 text-xs font-semibold text-ink/60">{t("lessonsLearned")}</p>
            <ul className="mt-1 list-disc ps-5 text-sm text-ink/80">
              {result.map((l, i) => (
                <li key={i} dir="auto">
                  <span className="font-semibold">{t(`agents.${l.agent}`)}:</span> {l.lesson}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <div className={cardClass}>
      <p className="font-semibold text-ink">{t("feedbackTitle")}</p>
      <p className="mt-1 text-sm text-ink/60">{t("feedbackBody")}</p>
      <div className="mt-4 flex gap-2">
        {(["up", "down"] as const).map((r) => (
          <button key={r} type="button" aria-pressed={rating === r} onClick={() => setRating(r)} className={`${secondaryButton} ${rating === r ? "border-cobalt bg-cobalt/10" : ""}`}>
            {t(r)}
          </button>
        ))}
      </div>
      <textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={2000} placeholder={t("feedbackPlaceholder")} className={`${textareaClass} mt-3`} dir="auto" />
      {error ? <p className="mt-2 text-sm text-amber-deep">{error}</p> : null}
      <button type="button" onClick={send} disabled={!rating || sending || (rating === "down" && !comment.trim())} className={`${primaryButton} mt-3`}>
        {sending ? <Spinner /> : null}
        {sending ? t("sending") : t("sendFeedback")}
      </button>
    </div>
  );
}

function LessonsPanel({ lessons, canEdit, onRetire }: { lessons: AgentLesson[]; canEdit: boolean; onRetire: (id: string) => void }) {
  const t = useTranslations("blogStudio");
  return (
    <div className="flex flex-col gap-6">
      <p className="max-w-3xl text-sm text-ink/70">{t("lessonsIntro")}</p>
      {lessons.length === 0 ? <p className="text-ink/60">{t("noLessons")}</p> : null}
      {LEARNING_AGENTS.filter((agent) => lessons.some((l) => l.agent === agent)).map((agent) => (
        <section key={agent}>
          <h2 className="text-sm font-semibold text-ink">{t(`agents.${agent}`)}</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {lessons
              .filter((l) => l.agent === agent)
              .map((l) => (
                <li key={l.id} className="flex items-start gap-3 rounded-2xl border-2 border-ink/10 p-3">
                  <StatusChip status={l.source === "human" ? "accepted" : "draft"} label={t(`source.${l.source}`)} />
                  <p className="flex-1 text-sm text-ink/85" dir="auto">
                    {l.lesson}
                  </p>
                  {canEdit ? (
                    <button type="button" onClick={() => onRetire(l.id)} className="text-xs font-semibold text-ink/50 hover:text-amber-deep">
                      {t("retire")}
                    </button>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
