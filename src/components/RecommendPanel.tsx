"use client";

import { useState } from "react";
import { formatDeadline } from "@/lib/format";

interface RecommendItem {
  id: string;
  title: string;
  priority: string;
  deadline: string | null;
  reason: string;
}

interface Props {
  disabled?: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "result"; items: RecommendItem[] };

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-[var(--color-priority-high)]",
  medium: "bg-[var(--color-priority-medium)]",
  low: "bg-[var(--color-priority-low)]",
};

export function RecommendPanel({ disabled }: Props) {
  const [state, setState] = useState<State>({ kind: "idle" });

  async function fetchRecommendations() {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/recommend", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося отримати поради");
      }
      const data: { recommendations: RecommendItem[] } = await res.json();
      if (!data.recommendations || data.recommendations.length === 0) {
        setState({ kind: "error", message: "AI не знайшов що порадити" });
        return;
      }
      setState({ kind: "result", items: data.recommendations });
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
              Що робити зараз?
            </p>
            <p className="text-xs text-[var(--color-foreground-muted)]">
              AI прогляне список і порадить топ-3 на сьогодні.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchRecommendations}
          disabled={state.kind === "loading"}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] disabled:opacity-60"
        >
          {state.kind === "loading" ? (
            <>
              <Spinner />
              Думаю…
            </>
          ) : (
            <>
              Запитати в AI
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
            onClick={fetchRecommendations}
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

  return (
    <div className="overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3">
        <div className="flex items-center gap-2.5">
          <SparkleIcon />
          <p className="text-sm font-semibold text-[var(--color-foreground)]">
            AI радить
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchRecommendations}
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

      <ol className="flex flex-col divide-y divide-[var(--color-border)]">
        {state.items.map((item, idx) => {
          const priorityKey =
            item.priority in PRIORITY_DOT ? item.priority : "medium";
          const deadlineText = formatDeadline(item.deadline);
          return (
            <li
              key={item.id}
              className="flex items-start gap-3 px-4 py-3"
            >
              <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-[var(--color-surface-muted)] text-xs font-bold text-[var(--color-accent)]">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 flex-none rounded-full ${PRIORITY_DOT[priorityKey]}`}
                    aria-hidden
                  />
                  <p className="min-w-0 truncate text-sm font-semibold text-[var(--color-foreground)]">
                    {item.title}
                  </p>
                  {deadlineText && (
                    <span className="ml-auto hidden flex-none rounded-full bg-[var(--color-surface-muted)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-foreground-muted)] sm:inline-block">
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
