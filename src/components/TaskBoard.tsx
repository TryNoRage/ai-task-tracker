"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskInput } from "./TaskInput";
import { TaskCard } from "./TaskCard";
import {
  TaskControls,
  type FilterValue,
  type SortValue,
} from "./TaskControls";
import { RecommendPanel } from "./RecommendPanel";
import type { Task } from "@/lib/types";

interface Props {
  initial: Task[];
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const FILTER_KEY = "tt:filter";
const SORT_KEY = "tt:sort";

const FILTER_VALUES: ReadonlyArray<FilterValue> = ["all", "active", "done"];
const SORT_VALUES: ReadonlyArray<SortValue> = [
  "smart",
  "deadline",
  "priority",
  "newest",
];

function isFilter(v: string | null): v is FilterValue {
  return !!v && (FILTER_VALUES as ReadonlyArray<string>).includes(v);
}

function isSort(v: string | null): v is SortValue {
  return !!v && (SORT_VALUES as ReadonlyArray<string>).includes(v);
}

function deadlineMs(t: Task): number {
  return t.deadline ? new Date(t.deadline).getTime() : Number.POSITIVE_INFINITY;
}

function priorityRank(t: Task): number {
  return PRIORITY_ORDER[t.priority] ?? 1;
}

function createdMs(t: Task): number {
  return new Date(t.createdAt).getTime();
}

function compareSmart(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pr = priorityRank(a) - priorityRank(b);
  if (pr !== 0) return pr;
  const dl = deadlineMs(a) - deadlineMs(b);
  if (dl !== 0) return dl;
  return createdMs(b) - createdMs(a);
}

function compareDeadline(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const dl = deadlineMs(a) - deadlineMs(b);
  if (dl !== 0) return dl;
  const pr = priorityRank(a) - priorityRank(b);
  if (pr !== 0) return pr;
  return createdMs(b) - createdMs(a);
}

function comparePriority(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  const pr = priorityRank(a) - priorityRank(b);
  if (pr !== 0) return pr;
  const dl = deadlineMs(a) - deadlineMs(b);
  if (dl !== 0) return dl;
  return createdMs(b) - createdMs(a);
}

function compareNewest(a: Task, b: Task): number {
  if (a.done !== b.done) return a.done ? 1 : -1;
  return createdMs(b) - createdMs(a);
}

function sortTasks(tasks: Task[], sort: SortValue): Task[] {
  const cmp =
    sort === "deadline"
      ? compareDeadline
      : sort === "priority"
      ? comparePriority
      : sort === "newest"
      ? compareNewest
      : compareSmart;
  return [...tasks].sort(cmp);
}

export function TaskBoard({ initial }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("smart");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = window.localStorage.getItem(FILTER_KEY);
    if (isFilter(f)) setFilter(f);
    const s = window.localStorage.getItem(SORT_KEY);
    if (isSort(s)) setSort(s);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_KEY, filter);
  }, [filter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SORT_KEY, sort);
  }, [sort]);

  const counts = useMemo(() => {
    let active = 0;
    for (const t of tasks) if (!t.done) active += 1;
    return { all: tasks.length, active, done: tasks.length - active };
  }, [tasks]);

  const sorted = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);

  const visible = useMemo(() => {
    if (filter === "active") return sorted.filter((t) => !t.done);
    if (filter === "done") return sorted.filter((t) => t.done);
    return sorted;
  }, [sorted, filter]);

  async function handleAdd(rawInput: string) {
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося додати задачу");
      }
      const newTask: Task = await res.json();
      setTasks((prev) => [newTask, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleToggle(id: string, done: boolean) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done }),
      });
      if (!res.ok) throw new Error("Не вдалося оновити задачу");
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleDelete(id: string) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.filter((t) => t.id !== id));
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Не вдалося видалити задачу");
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleEditTitle(id: string, title: string) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, title } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося оновити назву");
      }
      const updated: Task = await res.json();
      setTasks((cur) => cur.map((t) => (t.id === id ? updated : t)));
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  const showAllDoneBanner =
    filter === "all" && counts.all > 0 && counts.active === 0;

  function renderBody() {
    if (counts.all === 0) return <EmptyAll />;

    if (filter === "active" && counts.active === 0) {
      return (
        <EmptyAllDone
          actionLabel="Подивитись виконані"
          onAction={() => setFilter("done")}
        />
      );
    }

    if (filter === "done" && counts.done === 0) {
      return <EmptyFilter onReset={() => setFilter("all")} />;
    }

    if (filter === "all") {
      const active = visible.filter((t) => !t.done);
      const done = visible.filter((t) => t.done);
      return (
        <div className="flex flex-col gap-6">
          {showAllDoneBanner && <AllDoneBanner />}
          {active.length > 0 && (
            <Section title="До виконання" count={active.length}>
              {active.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEditTitle={handleEditTitle}
                />
              ))}
            </Section>
          )}
          {done.length > 0 && (
            <Section title="Виконано" count={done.length}>
              {done.map((t) => (
                <TaskCard
                  key={t.id}
                  task={t}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onEditTitle={handleEditTitle}
                />
              ))}
            </Section>
          )}
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-2">
        {visible.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onEditTitle={handleEditTitle}
          />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <TaskInput onSubmit={handleAdd} />

      {error && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </div>
      )}

      <RecommendPanel disabled={counts.active === 0} />

      {counts.all > 0 && (
        <TaskControls
          filter={filter}
          sort={sort}
          counts={counts}
          onFilterChange={setFilter}
          onSortChange={setSort}
        />
      )}

      {renderBody()}
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-center gap-2 px-1">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
          {title}
        </h2>
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface-muted)] px-1.5 text-[11px] font-semibold text-[var(--color-accent)]">
          {count}
        </span>
      </div>
      <ul className="flex flex-col gap-2">{children}</ul>
    </section>
  );
}

function EmptyAll() {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-accent)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            d="M5 7h14M5 12h14M5 17h9"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-base font-semibold text-[var(--color-foreground)]">
        Поки що задач немає
      </p>
      <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
        Опиши перше завдання у полі вище — AI сам розбере його на частини.
      </p>
    </div>
  );
}

function EmptyAllDone({
  actionLabel,
  onAction,
}: {
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-14 text-center shadow-[var(--shadow-card)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(380px 220px at 50% -40px, color-mix(in oklab, var(--color-accent) 20%, transparent), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="mb-3 text-5xl">🎉</div>
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Все зроблено
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-foreground-muted)]">
          Можеш видихнути або одразу додати наступну задачу — поле вгорі чекає.
        </p>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={onAction}
            className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)]"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function AllDoneBanner() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-accent-soft)] px-4 py-3 text-sm">
      <span className="text-xl leading-none">🎉</span>
      <div className="flex-1">
        <p className="font-semibold text-[var(--color-foreground)]">
          Все зроблено
        </p>
        <p className="text-[var(--color-foreground-muted)]">
          Активних задач немає. Додай нову — або просто видихни.
        </p>
      </div>
    </div>
  );
}

function EmptyFilter({ onReset }: { onReset: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-surface)] px-6 py-12 text-center shadow-[var(--shadow-card)]">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]">
        <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6">
          <path
            d="M4 6h16M7 12h10M10 18h4"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-base font-semibold text-[var(--color-foreground)]">
        У цьому фільтрі задач немає
      </p>
      <p className="mt-1 text-sm text-[var(--color-foreground-muted)]">
        Спробуй переключити фільтр або скинути його.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)]"
      >
        Скинути фільтр
      </button>
    </div>
  );
}
