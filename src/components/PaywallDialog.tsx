"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  limit?: number;
}

export function PaywallDialog({ open, onClose, limit = 10 }: Props) {
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeBtnRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);

    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Закрити"
        onClick={onClose}
        className="absolute inset-0 bg-[color-mix(in_oklab,var(--color-foreground)_40%,transparent)] backdrop-blur-[2px]"
      />
      <div
        ref={panelRef}
        className="
          relative w-full max-w-md
          rounded-t-3xl border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)]
          p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-card)]
          motion-safe:animate-[slideUp_.22s_ease-out]
          sm:rounded-3xl sm:border-b sm:pb-6 sm:motion-safe:animate-none
        "
      >
        <div
          aria-hidden
          className="mx-auto mb-4 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)] sm:hidden"
        />

        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7" aria-hidden>
            <path
              d="M12 2l2.39 6.95H22l-6.2 4.5 2.39 6.95L12 16.9 5.81 20.4 8.2 13.45 2 8.95h7.61L12 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h2
          id="paywall-title"
          className="text-center text-2xl font-semibold tracking-tight text-[var(--color-foreground)]"
        >
          Ліміт безкоштовного плану
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-[var(--color-foreground-muted)]">
          Ти вже маєш {limit} задач. Щоб додавати більше й користуватись
          трекером без обмежень — оформи Pro.
        </p>

        <ul className="mt-5 flex flex-col gap-2.5 rounded-2xl bg-[var(--color-surface-muted)] p-4 text-sm text-[var(--color-foreground)]">
          <FeatureRow>Необмежена кількість задач</FeatureRow>
          <FeatureRow>Повний доступ до AI-парсингу</FeatureRow>
          <FeatureRow>Щоденні AI-дайджести</FeatureRow>
        </ul>

        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/upgrade"
            onClick={onClose}
            className="inline-flex h-12 items-center justify-center rounded-2xl bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)]"
          >
            Обрати план
          </Link>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center justify-center rounded-2xl border border-transparent px-5 text-sm font-medium text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-muted)]"
          >
            Не зараз
          </button>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-3 w-3" aria-hidden>
          <path
            d="M5 12l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>{children}</span>
    </li>
  );
}
