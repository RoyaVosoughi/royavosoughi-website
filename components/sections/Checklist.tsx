"use client";

import { useRef, useState, type FormEvent } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Button, buttonStyles } from "@/components/ui/Button";
import en from "@/messages/en.json";

const questionKeys = ["q1", "q2", "q3", "q4", "q5", "q6", "q7", "q8"] as const;
type QuestionKey = (typeof questionKeys)[number];
type Answers = Partial<Record<QuestionKey, boolean>>;
type Status = "idle" | "sending" | "sent" | "error";
type FieldErrors = { name?: boolean; email?: boolean };

/** Leaks listed on the result before the rest collapse into "+N more". */
const MAX_LEAKS = 3;

const darkField =
  "w-full rounded-2xl border-2 border-canvas/25 bg-transparent px-4 py-3.5 text-canvas " +
  "transition-colors hover:border-canvas/50 focus:border-canvas focus:outline-none";

/**
 * The Time Leak Checklist — StoryBrand's free transitional offer. Eight yes/no
 * questions, an instant on-page result built only from the visitor's own
 * answers (no invented benchmarks), then an optional email step that asks for
 * the full written plan. The request goes through /api/service-requests so it
 * lands where every other lead does.
 */
export function Checklist({ email }: { email: string }) {
  const t = useTranslations("checklist");
  const services = useTranslations("services");
  const locale = useLocale();
  const num = new Intl.NumberFormat(locale);

  const [answers, setAnswers] = useState<Answers>({});
  const [showError, setShowError] = useState(false);
  const [done, setDone] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const resultRef = useRef<HTMLDivElement>(null);

  const answered = questionKeys.filter((k) => answers[k] !== undefined).length;
  const yesKeys = questionKeys.filter((k) => answers[k]);
  const level = yesKeys.length <= 1 ? 0 : yesKeys.length <= 4 ? 1 : 2;

  function answer(key: QuestionKey, value: boolean) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
    setShowError(false);
  }

  function showResult(event: FormEvent) {
    event.preventDefault();
    if (answered < questionKeys.length) {
      setShowError(true);
      return;
    }
    setDone(true);
    requestAnimationFrame(() => {
      resultRef.current?.focus();
      resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function restart() {
    setAnswers({});
    setDone(false);
    setStatus("idle");
    setFieldErrors({});
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function requestPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const emailInput = form.elements.namedItem("email") as HTMLInputElement;

    const errors: FieldErrors = {
      name: data.name.trim().length < 2,
      email: !emailInput.validity.valid || emailInput.value.trim() === "",
    };
    setFieldErrors(errors);
    if (errors.name || errors.email) return;

    // The owner reads this in English, whatever language the visitor used.
    const leaks = yesKeys.map((k) => en.checklist.questions[k].leak).join("; ") || "none";
    const message =
      `Time Leak Checklist (${locale}): ${yesKeys.length} of ${questionKeys.length} yes. ` +
      `Leaks: ${leaks}. Asked for the full written plan.`;

    setStatus("sending");
    try {
      const response = await fetch("/api/service-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service: "consulting",
          name: data.name,
          business: "Time Leak Checklist",
          contact: data.email,
          email: data.email,
          message,
          website: data.website,
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setStatus("sent");
    } catch {
      setStatus("error");
    }
  }

  if (done) {
    const shown = yesKeys.slice(0, MAX_LEAKS);
    const more = yesKeys.length - shown.length;

    return (
      <div ref={resultRef} tabIndex={-1} className="focus:outline-none">
        <p className="label-eyebrow text-cobalt">{t("resultEyebrow")}</p>
        <h2 className="text-section mt-5 max-w-[22ch] text-ink">
          {t(`level${level}.title`)}
        </h2>
        <p className="mt-4 text-sm font-medium text-ink/70">
          {t("youSaid", {
            count: num.format(yesKeys.length),
            total: num.format(questionKeys.length),
          })}
        </p>
        <p className="mt-4 max-w-[60ch] text-lg leading-relaxed text-ink/80">
          {t(`level${level}.body`)}
        </p>

        {shown.length > 0 ? (
          <>
            <h3 className="mt-12 text-xl text-ink">{t("leaksTitle")}</h3>
            <ol className="mt-5 grid gap-4">
              {shown.map((key, i) => {
                const service = en.checklist.questions[key].service as "agent" | "automation";
                return (
                  <li key={key} className="rounded-2xl border border-ink/10 bg-paper p-6">
                    <span aria-hidden="true" className="label-eyebrow block text-cobalt">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-3 text-lg text-ink">{t(`questions.${key}.leak`)}</p>
                    <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink/75">
                      {t(`questions.${key}.fix`)}
                    </p>
                    <p className="label-eyebrow mt-4 text-ink/60">
                      {t("bestFit")}:{" "}
                      <span className="text-cobalt">{services(`items.${service}.name`)}</span>
                    </p>
                  </li>
                );
              })}
            </ol>
            {more > 0 ? (
              <p className="mt-4 text-sm text-ink/70">
                {t("moreLeaks", { count: num.format(more) })}
              </p>
            ) : null}
          </>
        ) : null}

        {/* Request the full plan */}
        <div className="surface-ink mt-12 rounded-2xl bg-ink p-6 text-canvas md:p-8">
          {status === "sent" ? (
            <div role="status">
              <h3 className="text-xl">{t("sentTitle")}</h3>
              <p className="mt-3 text-fog">{t("sentBody")}</p>
            </div>
          ) : (
            <form onSubmit={requestPlan} noValidate className="relative grid gap-4">
              <div>
                <h3 className="text-xl">{t("planTitle")}</h3>
                <p className="mt-3 max-w-[56ch] text-fog">{t("planBody")}</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cl-name" className="mb-2 block text-sm font-medium">
                    {t("nameLabel")}
                  </label>
                  <input
                    id="cl-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    maxLength={120}
                    aria-invalid={fieldErrors.name || undefined}
                    className={darkField}
                  />
                  {fieldErrors.name ? (
                    <p role="alert" className="mt-1.5 text-sm text-canvas">
                      {t("nameError")}
                    </p>
                  ) : null}
                </div>
                <div>
                  <label htmlFor="cl-email" className="mb-2 block text-sm font-medium">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="cl-email"
                    name="email"
                    type="email"
                    dir="ltr"
                    autoComplete="email"
                    maxLength={200}
                    aria-invalid={fieldErrors.email || undefined}
                    className={darkField}
                  />
                  {fieldErrors.email ? (
                    <p role="alert" className="mt-1.5 text-sm text-canvas">
                      {t("emailError")}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Honeypot — hidden from people, same idea as the other forms. */}
              <div aria-hidden="true" className="absolute -start-[9999px] h-0 w-0 overflow-hidden">
                <label>
                  Website
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                </label>
              </div>

              {status === "error" ? (
                <p role="alert" className="text-sm text-canvas">
                  {t("errorBody")}{" "}
                  <a href={`mailto:${email}`} className="underline" dir="ltr">
                    {email}
                  </a>
                </p>
              ) : null}

              <div>
                <Button type="submit" variant="onDark" disabled={status === "sending"}>
                  {status === "sending" ? t("sending") : t("send")}
                </Button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-10 max-w-[56ch] text-ink/75">{t("bookLine")}</p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <a href={`/${locale}/contact`} className={buttonStyles("secondary")}>
            {t("bookCta")}
          </a>
          <button type="button" onClick={restart} className={buttonStyles("secondary")}>
            {t("restart")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={showResult} noValidate>
      <ol className="grid gap-4">
        {questionKeys.map((key, i) => {
          const value = answers[key];
          return (
            <li key={key}>
              <fieldset className="rounded-2xl border border-ink/10 bg-paper p-5 md:p-6">
                <legend className="sr-only">{t(`questions.${key}.q`)}</legend>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <p className="flex gap-4 text-lg leading-snug text-ink" aria-hidden="true">
                    <span className="label-eyebrow pt-1.5 text-cobalt">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{t(`questions.${key}.q`)}</span>
                  </p>
                  <div className="flex shrink-0 gap-2">
                    {([true, false] as const).map((option) => {
                      const selected = value === option;
                      return (
                        <label
                          key={String(option)}
                          className={`cursor-pointer rounded-full border px-6 py-2.5 text-[0.9375rem] font-medium transition-colors has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 ${
                            selected
                              ? "border-cobalt bg-cobalt text-on-cobalt"
                              : "border-ink/25 text-ink hover:border-ink"
                          }`}
                        >
                          <input
                            type="radio"
                            name={key}
                            checked={selected}
                            onChange={() => answer(key, option)}
                            className="sr-only"
                          />
                          {option ? t("yes") : t("no")}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </fieldset>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button type="submit">{t("submit")}</Button>
        <p role={showError ? "alert" : "status"} className="text-sm text-ink/70">
          {showError
            ? t("answerAll")
            : t("progress", {
                done: num.format(answered),
                total: num.format(questionKeys.length),
              })}
        </p>
      </div>
    </form>
  );
}
