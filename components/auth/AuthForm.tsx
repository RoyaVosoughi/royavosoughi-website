"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";

import { Link, useRouter } from "@/i18n/navigation";
import { getAuthBrowserClient, googleAuthEnabled } from "@/lib/auth/browser";

export type AuthMode = "register" | "signIn" | "forgot" | "reset";
type Status = "idle" | "working" | "done";
type FieldName = "name" | "email" | "password";

const MIN_PASSWORD = 8;

/* ---------- icons (stroke, currentColor — they follow the theme) ---------- */

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "h-5 w-5 shrink-0",
};

const UserIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
  </svg>
);
const MailIcon = () => (
  <svg {...iconProps}>
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8" />
  </svg>
);
const LockIcon = () => (
  <svg {...iconProps}>
    <rect x="4" y="10" width="16" height="11" rx="2.5" />
    <path d="M8 10V7a4 4 0 0 1 8 0v3" />
  </svg>
);
const EyeIcon = ({ off }: { off: boolean }) => (
  <svg {...iconProps}>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
    {off ? <path d="M4 4l16 16" /> : null}
  </svg>
);
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" aria-hidden="true" className="h-5 w-5 shrink-0">
    <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
    <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z" />
  </svg>
);

/* ---------- component ---------- */

export function AuthForm({ mode, next }: { mode: AuthMode; next?: string }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = getAuthBrowserClient();

  const [status, setStatus] = useState<Status>("idle");
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const showName = mode === "register";
  const showEmail = mode !== "reset";
  const showPassword_ = mode !== "forgot";
  const destination = next && /^\/(?!\/)/.test(next) ? next : "/account";

  /** Where Supabase links come back to (email confirm, Google, reset). */
  function callbackUrl(after: string) {
    const params = new URLSearchParams({ locale, next: `/${locale}${after}` });
    return `${window.location.origin}/api/auth/callback?${params}`;
  }

  /** Supabase error → a sentence the visitor can act on. */
  function explain(error: { code?: string; message: string }) {
    const code = error.code ?? "";
    const msg = error.message.toLowerCase();
    if (code === "invalid_credentials" || msg.includes("invalid login")) return t("errorInvalid");
    if (code === "email_not_confirmed" || msg.includes("not confirmed")) return t("errorUnconfirmed");
    if (code === "user_already_exists" || msg.includes("already registered")) return t("errorExists");
    if (code === "weak_password") return t("errorWeak");
    if (code.includes("rate_limit") || msg.includes("rate limit")) return t("errorRateLimit");
    if (code === "same_password") return t("errorSamePassword");
    return t("errorGeneric");
  }

  function validate(form: HTMLFormElement) {
    const errors: Partial<Record<FieldName, string>> = {};
    const value = (name: FieldName) =>
      String((form.elements.namedItem(name) as HTMLInputElement | null)?.value ?? "").trim();

    if (showName && value("name").length < 2) errors.name = t("nameError");
    if (showEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value("email"))) errors.email = t("emailError");
    if (showPassword_) {
      const pw = (form.elements.namedItem("password") as HTMLInputElement).value;
      if (mode === "signIn" ? pw.length === 0 : pw.length < MIN_PASSWORD) {
        errors.password = mode === "signIn" ? t("passwordRequired") : t("passwordError", { min: MIN_PASSWORD });
      }
    }
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) (form.elements.namedItem(first) as HTMLInputElement | null)?.focus();
    return !first;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!supabase) return;
    const form = event.currentTarget;
    setFormError(null);
    if (!validate(form)) return;

    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim().toLowerCase();
    const password = String(data.get("password") ?? "");

    setStatus("working");
    try {
      if (mode === "register") {
        const { data: res, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name, locale },
            emailRedirectTo: callbackUrl("/account"),
          },
        });
        if (error) throw error;
        // Supabase hides "already registered" behind an empty identities list.
        if (res.user && res.user.identities?.length === 0) throw { code: "user_already_exists", message: "" };
        if (res.session) {
          router.replace("/account");
          router.refresh();
          return;
        }
        setSentTo(email);
        setStatus("done");
      } else if (mode === "signIn") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace(destination);
        router.refresh();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: callbackUrl("/reset-password"),
        });
        if (error) throw error;
        setSentTo(email);
        setStatus("done");
      } else {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) throw error;
        router.replace("/account");
        router.refresh();
      }
    } catch (error) {
      setFormError(explain(error as { code?: string; message: string }));
      setStatus("idle");
    }
  }

  async function onGoogle() {
    if (!supabase) return;
    setFormError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl(destination) },
    });
    if (error) setFormError(t("errorGeneric"));
  }

  /* ---------- layout pieces ---------- */

  function field(name: FieldName, label: string, icon: ReactNode, input: ReactNode, aside?: ReactNode) {
    const error = fieldErrors[name];
    return (
      <div>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <label htmlFor={name} className="font-medium text-ink">
            {label}
          </label>
          {aside}
        </div>
        <div
          className={`flex h-14 items-center gap-3 rounded-2xl border-2 bg-canvas px-4 text-ink/50 transition-colors focus-within:text-cobalt ${
            error
              ? "border-amber-deep"
              : "border-ink/15 hover:border-ink/30 focus-within:border-cobalt"
          }`}
        >
          {icon}
          {input}
        </div>
        {error ? (
          <p id={`${name}-error`} role="alert" className="mt-1.5 text-sm font-medium text-amber-deep">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  function inputProps(name: FieldName) {
    return {
      id: name,
      name,
      required: true,
      "aria-invalid": Boolean(fieldErrors[name]),
      "aria-describedby": fieldErrors[name] ? `${name}-error` : undefined,
      className:
        "h-full min-w-0 flex-1 bg-transparent text-ink placeholder:text-ink/35 focus:outline-none",
    };
  }

  const cardClass = "rounded-[2rem] border border-ink/10 bg-paper p-6 sm:p-10";

  if (!supabase) {
    return (
      <div className={cardClass}>
        <p className="text-ink/80">{t("unavailable")}</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className={`${cardClass} text-center`} role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-auto h-12 w-12" fill="none" stroke="var(--color-cobalt)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <path d="m4 7 8 6 8-6" />
        </svg>
        <h2 className="mt-5 text-2xl text-ink">{t("checkInboxTitle")}</h2>
        <p className="mt-3 text-ink/75">
          {t(mode === "register" ? "checkInboxRegister" : "checkInboxReset", { email: sentTo })}
        </p>
        <p className="mt-6 text-sm text-ink/60">{t("checkInboxSpam")}</p>
      </div>
    );
  }

  const submitLabel = {
    register: t("registerSubmit"),
    signIn: t("signInSubmit"),
    forgot: t("forgotSubmit"),
    reset: t("resetSubmit"),
  }[mode];

  return (
    <form onSubmit={onSubmit} noValidate className={`${cardClass} flex flex-col gap-5`}>
      {showName
        ? field(
            "name",
            t("nameLabel"),
            <UserIcon />,
            <input {...inputProps("name")} autoComplete="name" placeholder={t("namePlaceholder")} />,
          )
        : null}

      {showEmail
        ? field(
            "email",
            t("emailLabel"),
            <MailIcon />,
            <input
              {...inputProps("email")}
              type="email"
              dir="ltr"
              autoComplete="email"
              placeholder={t("emailPlaceholder")}
            />,
          )
        : null}

      {showPassword_
        ? field(
            "password",
            mode === "reset" ? t("newPasswordLabel") : t("passwordLabel"),
            <LockIcon />,
            <>
              <input
                {...inputProps("password")}
                type={showPassword ? "text" : "password"}
                dir="ltr"
                minLength={mode === "signIn" ? undefined : MIN_PASSWORD}
                autoComplete={mode === "signIn" ? "current-password" : "new-password"}
                placeholder={mode === "signIn" ? t("passwordPlaceholder") : t("newPasswordPlaceholder", { min: MIN_PASSWORD })}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                aria-pressed={showPassword}
                className="-me-2 grid h-10 w-10 place-items-center rounded-full text-ink/50 transition-colors hover:text-ink"
              >
                <EyeIcon off={showPassword} />
              </button>
            </>,
            mode === "signIn" ? (
              <Link href="/forgot-password" className="text-sm font-medium text-cobalt hover:underline">
                {t("forgotLink")}
              </Link>
            ) : null,
          )
        : null}

      {formError ? (
        <p role="alert" className="rounded-2xl bg-amber/15 px-4 py-3 text-sm font-medium text-amber-deep">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === "working"}
        className="mt-3 h-14 w-full rounded-full bg-cobalt font-medium text-on-cobalt transition-colors hover:bg-cobalt-dark focus-visible:outline-3 focus-visible:outline-offset-3 disabled:opacity-60"
      >
        {status === "working" ? t("working") : submitLabel}
      </button>

      <p className="text-center text-sm text-ink/75">
        {mode === "register" ? (
          <>
            {t("haveAccount")}{" "}
            <Link href="/sign-in" className="font-medium text-cobalt hover:underline">
              {t("signInLink")}
            </Link>
          </>
        ) : mode === "signIn" ? (
          <>
            {t("noAccount")}{" "}
            <Link href="/register" className="font-medium text-cobalt hover:underline">
              {t("registerLink")}
            </Link>
          </>
        ) : (
          <Link href="/sign-in" className="font-medium text-cobalt hover:underline">
            {t("backToSignIn")}
          </Link>
        )}
      </p>

      {googleAuthEnabled && (mode === "register" || mode === "signIn") ? (
        <>
          <div className="flex items-center gap-4 text-sm text-ink/55" aria-hidden="true">
            <span className="h-px flex-1 bg-ink/15" />
            {t("orWith")}
            <span className="h-px flex-1 bg-ink/15" />
          </div>
          <button
            type="button"
            onClick={onGoogle}
            className="flex h-14 w-full items-center justify-center gap-3 rounded-full border border-ink/25 font-medium text-ink transition-colors hover:border-ink hover:bg-ink/[0.04]"
          >
            <GoogleIcon />
            {t("google")}
          </button>
        </>
      ) : null}
    </form>
  );
}
