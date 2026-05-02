"use client";

import { CATEGORIES, getCategory, type CategoryValue } from "@/lib/categories";

export type FilterValue = "all" | "active" | "done";
export type SortValue = "smart" | "deadline" | "priority" | "newest";
export type CategoryFilter = "all" | CategoryValue;

interface Props {
  filter: FilterValue;
  sort: SortValue;
  category: CategoryFilter;
  collapsed: boolean;
  counts: { all: number; active: number; done: number };
  categoryCounts: Record<CategoryValue, number>;
  onFilterChange: (v: FilterValue) => void;
  onSortChange: (v: SortValue) => void;
  onCategoryChange: (v: CategoryFilter) => void;
  onToggleCollapsed: () => void;
}

const FILTER_OPTIONS: Array<{ value: FilterValue; label: string; key: keyof Props["counts"] }> = [
  { value: "all", label: "Усі", key: "all" },
  { value: "active", label: "Активні", key: "active" },
  { value: "done", label: "Виконано", key: "done" },
];

const SORT_OPTIONS: Array<{ value: SortValue; label: string }> = [
  { value: "smart", label: "Розумно" },
  { value: "deadline", label: "За дедлайном" },
  { value: "priority", label: "За пріоритетом" },
  { value: "newest", label: "Нещодавні" },
];

const FILTER_LABEL: Record<FilterValue, string> = {
  all: "Усі",
  active: "Активні",
  done: "Виконано",
};

const SORT_LABEL: Record<SortValue, string> = {
  smart: "Розумно",
  deadline: "За дедлайном",
  priority: "За пріоритетом",
  newest: "Нещодавні",
};

export function TaskControls({
  filter,
  sort,
  category,
  collapsed,
  counts,
  categoryCounts,
  onFilterChange,
  onSortChange,
  onCategoryChange,
  onToggleCollapsed,
}: Props) {
  if (collapsed) {
    const categoryLabel =
      category === "all" ? "Усі категорії" : (() => {
        const c = getCategory(category);
        return `${c.emoji} ${c.label}`;
      })();
    return (
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={false}
        className="flex w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm text-[var(--color-foreground-muted)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)]"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 flex-none" aria-hidden>
          <path
            d="M3 4h10M5 8h6M7 12h2"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        <span className="min-w-0 truncate font-medium text-[var(--color-foreground)]">
          {FILTER_LABEL[filter]}
        </span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className="min-w-0 truncate">{categoryLabel}</span>
        <span className="text-[var(--color-muted)]">·</span>
        <span className="min-w-0 truncate">{SORT_LABEL[sort]}</span>
        <span className="ml-auto inline-flex items-center gap-1 text-xs font-medium text-[var(--color-accent)]">
          Налаштування
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
            <path
              d="M4 6l4 4 4-4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-2 px-1">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
          Налаштування
        </span>
        <button
          type="button"
          onClick={onToggleCollapsed}
          aria-expanded={true}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
        >
          Згорнути
          <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden>
            <path
              d="M4 10l4-4 4 4"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Фільтр задач"
          className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-[var(--shadow-soft)]"
        >
          {FILTER_OPTIONS.map((opt) => {
            const isActive = filter === opt.value;
            const count = counts[opt.key];
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onFilterChange(opt.value)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)]"
                    : "text-[var(--color-foreground-muted)] hover:bg-[var(--color-surface-muted)]"
                }`}
              >
                {opt.label}
                <span
                  className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold ${
                    isActive
                      ? "bg-white/20 text-[var(--color-accent-foreground)]"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-[var(--color-foreground-muted)]">
          <span className="hidden sm:inline">Сортувати:</span>
          <span className="relative inline-flex items-center">
            <select
              value={sort}
              onChange={(e) => onSortChange(e.target.value as SortValue)}
              className="appearance-none rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] py-1.5 pl-3.5 pr-9 text-sm font-medium text-[var(--color-foreground)] shadow-[var(--shadow-soft)] outline-none transition hover:border-[var(--color-border-strong)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <svg
              viewBox="0 0 16 16"
              fill="none"
              className="pointer-events-none absolute right-3 h-3.5 w-3.5 text-[var(--color-muted)]"
              aria-hidden
            >
              <path
                d="M4 6l4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        </label>
      </div>

      <div
        role="tablist"
        aria-label="Фільтр за категорією"
        className="flex flex-wrap items-center gap-1.5"
      >
        <CategoryChip
          active={category === "all"}
          onClick={() => onCategoryChange("all")}
          label="Усі"
          count={counts.all}
        />
        {CATEGORIES.map((c) => (
          <CategoryChip
            key={c.value}
            active={category === c.value}
            onClick={() => onCategoryChange(c.value)}
            label={`${c.emoji} ${c.label}`}
            count={categoryCounts[c.value] ?? 0}
          />
        ))}
      </div>
    </div>
  );
}

function CategoryChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          : "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground-muted)] hover:border-[var(--color-border-strong)]"
      }`}
    >
      <span>{label}</span>
      <span
        className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold ${
          active
            ? "bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
            : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
