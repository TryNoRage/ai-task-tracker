"use client";

export type FilterValue = "all" | "active" | "done";
export type SortValue = "smart" | "deadline" | "priority" | "newest";

interface Props {
  filter: FilterValue;
  sort: SortValue;
  counts: { all: number; active: number; done: number };
  onFilterChange: (v: FilterValue) => void;
  onSortChange: (v: SortValue) => void;
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

export function TaskControls({
  filter,
  sort,
  counts,
  onFilterChange,
  onSortChange,
}: Props) {
  return (
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
  );
}
