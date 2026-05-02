"use client";

import { useState } from "react";
import { formatDeadline } from "@/lib/format";
import { getCategory } from "@/lib/categories";

interface DigestItem {
  id: string;
  title: string;
  priority: string;
  category: string;
  deadline: string | null;
  reason: string;
}

interface DigestPayload {
  morning: DigestItem[];
  day: DigestItem[];
  evening: DigestItem[];
  summary: string;
}

interface Props {
  disabled?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; digest: DigestPayload };

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-[var(--color-priority-high)]",
  medium: "bg-[var(--color-priority-medium)]",
  low: "bg-[var(--color-priority-low)]",
};

const SLOTS: Array<{
  key: "morning" | "day" | "evening";
  label: string;
  emoji: string;
  hint: string;
}> = [
  { key: "morning", label: "Ранок", emoji: "🌅", hint: "до 12:00" },
  { key: "day", label: "День", emoji: "☀️", hint: "12:00–18:00" },
  { key: "evening", label: "Вечір", emoji: "🌙", hint: "після 18:00" },
];

export function DigestPanel({ disabled }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function fetchDigest() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/digest", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося скласти план");
      }
      const data: { digest: DigestPayload } = await res.json();
      const total =
        data.digest.morning.length +
        data.digest.day.length +
        data.digest.evening.length;
      if (total === 0) {
        setState({ kind: "error", message: "AI не зміг скласти план — спробуй ще раз" });
        return;
      }
      setState({ kind: "result", digest: data.digest });
    } catch (e) {
      setState({
        kind: "error",
        message: e instanceof Error ? e.message : "Невідома помилка",
      });
    }
  }

  function reset() {
    setState({ kind: "idle" });
  }

  if (disabled) return null;

  if (state.kind === "idle" || state.kind === "loading") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <SparkleIcon />
          <div>
            <p className="text-sm font-semibold text-[var(--color-foreground)]">
              Що на сьогодні?
            </p>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              AI складе план дня — ранок, день і вечір.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchDigest}
          disabled={state.kind === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {state.kind === "loading" ? (
            <>
              <Spinner />
              Складаю план…
            </>
          ) : (
            <>
              Скласти план
              <ArrowRight />
            </>
          )}
        </button>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="flex flex-col gap-3 rounded-3xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-base">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-[var(--color-danger)]">
              {state.message}
            </p>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              Спробуй ще раз або перевір ключ OpenAI.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchDigest}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)]"
          >
            Повторити
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-muted)]"
            aria-label="Закрити"
          >
            <CloseIcon />
          </button>
        </div>
      </div>
    );
  }

  const { digest } = state;

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SparkleIcon />
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            План на сьогодні
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchDigest}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[var(--color-accent)] transition hover:bg-white/60"
            title="Оновити"
          >
            <RefreshIcon />
            Оновити
          </button>
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[var(--color-foreground-muted)] transition hover:bg-white/60"
            aria-label="Закрити"
          >
            <CloseIcon />
          </button>
        </div>
      </div>

      {digest.summary && (
        <p className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm italic text-[var(--color-foreground-muted)]">
          {digest.summary}
        </p>
      )}

      <div className="flex flex-col">
        {SLOTS.map((slot) => {
          const items = digest[slot.key];
          if (items.length === 0) return null;
          return (
            <section
              key={slot.key}
              className="border-b border-[var(--color-border)] last:border-b-0"
            >
              <div className="flex items-center gap-2 bg-[var(--color-surface-muted)] px-4 py-2">
                <span className="text-base leading-none" aria-hidden>
                  {slot.emoji}
                </span>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground)]">
                  {slot.label}
                </h3>
                <span className="text-[11px] text-[var(--color-muted)]">
                  {slot.hint}
                </span>
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface)] px-1.5 text-[11px] font-semibold text-[var(--color-accent)]">
                  {items.length}
                </span>
              </div>
              <ol className="flex flex-col divide-y divide-[var(--color-border)]">
                {items.map((item) => {
                  const priorityKey =
                    item.priority in PRIORITY_DOT ? item.priority : "medium";
                  const deadlineText = formatDeadline(item.deadline);
                  const cat = getCategory(item.category);
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 flex-none rounded-full ${PRIORITY_DOT[priorityKey]}`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <p className="min-w-0 text-sm font-semibold text-[var(--color-foreground)]">
                            {item.title}
                          </p>
                          <span
                            className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-foreground-muted)]"
                            title={cat.label}
                          >
                            <span aria-hidden>{cat.emoji}</span>
                            {cat.label}
                          </span>
                          {deadlineText && (
                            <span className="rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-foreground-muted)]">
                              {deadlineText}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-snug text-[var(--color-foreground-muted)]">
                          {item.reason}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)]">
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3zM18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2-2.2-.8 2.2-.8L18 14z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="M14 8a6 6 0 1 1-1.76-4.24M14 3v3h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M4 4l8 8M12 4l-8 8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      className="spinner h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M21 12a9 9 0 0 1-9 9"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
