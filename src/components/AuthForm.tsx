"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

type Mode = "login" | "register";

interface Props {
  mode: Mode;
  googleEnabled: boolean;
}

const COPY: Record<Mode, {
  title: string;
  subtitle: string;
  submit: string;
  altPrompt: string;
  altLink: string;
  altHref: string;
  googleLabel: string;
}> = {
  login: {
    title: "Вхід",
    subtitle: "Радо тебе бачимо знову.",
    submit: "Увійти",
    altPrompt: "Ще немає акаунта?",
    altLink: "Зареєструватися",
    altHref: "/register",
    googleLabel: "Увійти з Google",
  },
  register: {
    title: "Реєстрація",
    subtitle: "Створи акаунт — і твої задачі будуть тільки твоїми.",
    submit: "Створити акаунт",
    altPrompt: "Вже маєш акаунт?",
    altLink: "Увійти",
    altHref: "/login",
    googleLabel: "Продовжити з Google",
  },
};

export function AuthForm({ mode, googleEnabled }: Props) {
  const router = useRouter();
  const copy = COPY[mode];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState(false);
  const [googlePending, setGooglePending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Введи email");
      return;
    }
    if (password.length < 8) {
      setError("Пароль має містити щонайменше 8 символів");
      return;
    }

    setPending(true);
    try {
      if (mode === "register") {
        const trimmedName = name.trim();
        if (!trimmedName) {
          setError("Введи імʼя");
          setPending(false);
          return;
        }
        const { error: err } = await authClient.signUp.email({
          email: trimmedEmail,
          password,
          name: trimmedName,
        });
        if (err) {
          setError(err.message ?? "Не вдалося зареєструватися");
          setPending(false);
          return;
        }
      } else {
        const { error: err } = await authClient.signIn.email({
          email: trimmedEmail,
          password,
        });
        if (err) {
          setError(err.message ?? "Невірний email або пароль");
          setPending(false);
          return;
        }
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Невідома помилка");
      setPending(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    setGooglePending(true);
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не вдалося ввійти через Google");
      setGooglePending(false);
    }
  }

  const busy = pending || googlePending;

  return (
    <div className="w-full max-w-sm rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 shadow-[var(--shadow-card)] sm:p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {copy.title}
        </h1>
        <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
          {copy.subtitle}
        </p>
      </header>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit} noValidate>
        {mode === "register" && (
          <Field
            label="Імʼя"
            type="text"
            autoComplete="name"
            value={name}
            onChange={setName}
            disabled={busy}
            required
          />
        )}
        <Field
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={setEmail}
          disabled={busy}
          required
        />
        <Field
          label="Пароль"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          disabled={busy}
          minLength={8}
          required
          hint={mode === "register" ? "Щонайменше 8 символів" : undefined}
        />

        {error && (
          <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-3 py-2 text-sm font-medium text-[var(--color-danger)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-1 inline-flex h-11 items-center justify-center rounded-full bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Зачекай…" : copy.submit}
        </button>
      </form>

      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.18em] text-[var(--color-muted)]">
            <span className="h-px flex-1 bg-[var(--color-border)]" />
            або
            <span className="h-px flex-1 bg-[var(--color-border)]" />
          </div>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-4 text-sm font-semibold text-[var(--color-foreground)] shadow-[var(--shadow-soft)] transition hover:bg-[var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <GoogleIcon className="h-5 w-5" />
            {googlePending ? "Перенаправлення…" : copy.googleLabel}
          </button>
        </>
      )}

      <p className="mt-6 text-center text-sm text-[var(--color-foreground-muted)]">
        {copy.altPrompt}{" "}
        <Link
          href={copy.altHref}
          className="font-semibold text-[var(--color-accent)] hover:underline"
        >
          {copy.altLink}
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  autoComplete,
  required,
  disabled,
  minLength,
  hint,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  minLength?: number;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-foreground-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        disabled={disabled}
        minLength={minLength}
        className="h-11 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent)_20%,transparent)] disabled:cursor-not-allowed disabled:opacity-60"
      />
      {hint && (
        <span className="text-[11px] text-[var(--color-muted)]">{hint}</span>
      )}
    </label>
  );
}

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M21.6 12.227c0-.681-.061-1.336-.175-1.964H12v3.71h5.385a4.605 4.605 0 0 1-1.997 3.022v2.51h3.232c1.892-1.742 2.98-4.31 2.98-7.278z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.62-2.422l-3.232-2.509c-.895.6-2.04.955-3.388.955-2.604 0-4.808-1.76-5.595-4.123H3.064v2.59A9.997 9.997 0 0 0 12 22z"
        fill="#34A853"
      />
      <path
        d="M6.405 13.9a5.99 5.99 0 0 1 0-3.8V7.51H3.064a10 10 0 0 0 0 8.98l3.341-2.59z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.468 0 2.785.504 3.823 1.496l2.867-2.867C16.96 2.99 14.696 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.341 2.59C7.193 7.737 9.396 5.977 12 5.977z"
        fill="#EA4335"
      />
    </svg>
  );
}
