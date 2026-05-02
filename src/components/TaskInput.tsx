"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";

interface Props {
  onSubmit: (rawInput: string) => Promise<void> | void;
  disabled?: boolean;
}

export function TaskInput({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isBusy = submitting || disabled;

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || isBusy) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setValue("");
    } finally {
      setSubmitting(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-soft)] transition focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]"
    >
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder='Що треба зробити? Напр. "завтра написати Славі про відео до обіду, терміново"'
        disabled={isBusy}
        className="block w-full resize-none bg-transparent px-1 py-1 text-base leading-relaxed text-[var(--color-foreground)] outline-none placeholder:text-[var(--color-muted)] disabled:opacity-60"
      />
      <div className="mt-3 flex items-center justify-between gap-3 px-1">
        <span className="hidden items-center gap-1.5 text-xs text-[var(--color-muted)] sm:flex">
          <span>Швидко додати</span>
          <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-foreground-muted)]">
            ⌘
          </kbd>
          <kbd className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-foreground-muted)]">
            Enter
          </kbd>
        </span>
        <span className="text-xs text-[var(--color-muted)] sm:hidden">
          AI розбере все сам
        </span>
        <button
          type="submit"
          disabled={isBusy || value.trim().length === 0}
          className="inline-flex items-center gap-2 rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-pressed)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Spinner />
              Розбираю…
            </>
          ) : (
            <>
              Додати
              <ArrowRight />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

function ArrowRight() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3.5 w-3.5"
      aria-hidden
    >
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
