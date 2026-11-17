"use client";

import { useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

type Status = "idle" | "sending" | "sent" | "error";

const inputClass =
  "w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 text-ink transition-colors " +
  "placeholder:text-ink/40 hover:border-ink/30 focus:border-cobalt focus:outline-none";

/**
 * "Have a question?" card for the closing section of the home page:
 * name, email, message and one dark submit bar. Posts to /api/question.
 */
export function QuickQuestionForm() {
  const t = useTranslations("question");
  const locale = useLocale();
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setStatus("sending");
    try {
      const response = await fetch("/api/question", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, locale }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("sent");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="rounded-3xl bg-paper p-6 shadow-xl ring-1 ring-ink/10 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wider text-ink/60">{t("eyebrow")}</p>
          <h3 className="mt-2 text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            {t("title")}
          </h3>
        </div>
        <span
          aria-hidden="true"
          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-ink text-canvas"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5"
          >
            <path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z" />
          </svg>
        </span>
      </div>

      <form onSubmit={onSubmit} className="mt-8 space-y-6">
        {/* Honeypot — hidden from people, tempting to bots. */}
        <input
          type="text"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="hidden"
        />

        <div>
          <label htmlFor="q-name" className="mb-2 block text-sm text-ink/80">
            {t("nameLabel")} <span className="text-ink/40">*</span>
          </label>
          <input
            id="q-name"
            name="name"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            placeholder={t("namePlaceholder")}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="q-email" className="mb-2 block text-sm text-ink/80">
            {t("emailLabel")} <span className="text-ink/40">*</span>
          </label>
          <div className="relative">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="pointer-events-none absolute start-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/40"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
            <input
              id="q-email"
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
              className={`${inputClass} ps-12`}
            />
          </div>
        </div>

        <div>
          <label htmlFor="q-message" className="mb-2 block text-sm text-ink/80">
            {t("messageLabel")}
          </label>
          <textarea
            id="q-message"
            name="message"
            rows={5}
            maxLength={4000}
            placeholder={t("messagePlaceholder")}
            className={`${inputClass} resize-y`}
          />
        </div>

        <button
          type="submit"
          disabled={status === "sending"}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-6 py-4 font-semibold text-canvas transition-colors hover:bg-ink-soft disabled:opacity-60"
        >
          {status === "sending" ? t("sending") : t("submit")}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            className="h-4 w-4 rtl:-scale-x-100"
          >
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </button>

        <p role="status" aria-live="polite" className="text-sm text-ink/60">
          {status === "sent" ? (
            <span className="font-medium text-ink">{t("success")}</span>
          ) : status === "error" ? (
            <span className="font-medium text-amber-deep">{t("error")}</span>
          ) : (
            t("legal")
          )}
        </p>
      </form>
    </div>
  );
}
