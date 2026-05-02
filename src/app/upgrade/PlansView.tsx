"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PLANS, type PlanDescriptor, type PlanId } from "@/lib/plans-data";

function formatUsd(value: number): string {
  return value.toFixed(2);
}

export function PlansView() {
  const router = useRouter();
  const defaultId = useMemo<PlanId>(
    () => (PLANS.find((p) => p.popular) ?? PLANS[0]).id,
    []
  );
  const [selected, setSelected] = useState<PlanId>(defaultId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedPlan =
    PLANS.find((p) => p.id === selected) ??
    PLANS.find((p) => p.popular) ??
    PLANS[0];

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: selected }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.message || data.error || "Не вдалося оформити план"
        );
      }
      router.push("/");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
      setSubmitting(false);
    }
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selected === plan.id}
            onSelect={() => setSelected(plan.id)}
          />
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="inline-flex h-14 w-full max-w-md items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-8 text-sm font-semibold uppercase tracking-wider text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <>
              <span
                aria-hidden
                className="spinner h-4 w-4 rounded-full border-2 border-[var(--color-accent-foreground)] border-t-transparent"
              />
              Оформлюємо…
            </>
          ) : (
            "Оформити план"
          )}
        </button>
        <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-[var(--color-foreground-muted)]">
          Без скасування, до завершення обраного плану, з мене буде списано{" "}
          <strong className="font-semibold text-[var(--color-foreground)]">
            ${formatUsd(selectedPlan.priceUsd)}
          </strong>{" "}
          кожні{" "}
          <strong className="font-semibold text-[var(--color-foreground)]">
            {selectedPlan.months === 1
              ? "місяць"
              : `${selectedPlan.months} місяці`}
          </strong>{" "}
          до моменту скасування. Це тестовий чекаут — реальних списань немає.
        </p>
      </div>
    </section>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: PlanDescriptor;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <div className="relative flex flex-col pt-0">
      {plan.popular && (
        <div className="absolute inset-x-4 -top-0.5 z-0 flex h-8 items-center justify-center rounded-t-2xl bg-[var(--color-accent)] pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent-foreground)]">
          Most Popular
        </div>
      )}
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`relative z-10 flex w-full flex-col items-stretch gap-3 rounded-3xl border bg-[var(--color-surface)] px-5 py-5 text-left shadow-[var(--shadow-card)] transition ${
          selected
            ? "border-[var(--color-accent)] ring-2 ring-[color-mix(in_oklab,var(--color-accent)_30%,transparent)]"
            : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
        } ${plan.popular ? "mt-7" : ""}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col">
            <p className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
              {plan.title}
            </p>
            <p className="mt-0.5 text-sm text-[var(--color-foreground-muted)]">
              ${formatUsd(plan.priceUsd)}
            </p>
          </div>
          <Radio selected={selected} />
        </div>

        <div className="h-px bg-[var(--color-border)]" />

        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
            ${formatUsd(plan.pricePerDay)}
          </span>
          <span className="text-xs font-medium text-[var(--color-foreground-muted)]">
            per day
          </span>
        </div>
      </button>
    </div>
  );
}

function Radio({ selected }: { selected: boolean }) {
  if (selected) {
    return (
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M5 12l4 4L19 7"
            stroke="currentColor"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="h-6 w-6 shrink-0 rounded-full border-2 border-[var(--color-border-strong)]" />
  );
}
