"use client";

import { useEffect, useMemo, useState } from "react";
import { TaskInput } from "./TaskInput";
import { TaskCard } from "./TaskCard";
import {
  TaskControls,
  type CategoryFilter,
  type FilterValue,
  type SortValue,
} from "./TaskControls";
import { DigestPanel } from "./DigestPanel";
import { PaywallDialog } from "./PaywallDialog";
import { CATEGORIES, type CategoryValue } from "@/lib/categories";
import type { Comment, Task } from "@/lib/types";

const FREE_TASK_LIMIT = 10;

interface Props {
  initial: Task[];
  isPro?: boolean;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

const FILTER_KEY = "tt:filter";
const SORT_KEY = "tt:sort";
const CATEGORY_KEY = "tt:cat";
const CONTROLS_KEY = "tt:controls";

type PriorityValue = "high" | "medium" | "low";

const FILTER_VALUES: ReadonlyArray<FilterValue> = ["all", "active", "done"];
const SORT_VALUES: ReadonlyArray<SortValue> = [
  "smart",
  "deadline",
  "priority",
  "newest",
];

const CATEGORY_VALUES: ReadonlyArray<CategoryFilter> = [
  "all",
  "work",
  "personal",
  "study",
  "other",
];

function isFilter(v: string | null): v is FilterValue {
  return !!v && (FILTER_VALUES as ReadonlyArray<string>).includes(v);
}

function isSort(v: string | null): v is SortValue {
  return !!v && (SORT_VALUES as ReadonlyArray<string>).includes(v);
}

function isCategoryFilter(v: string | null): v is CategoryFilter {
  return !!v && (CATEGORY_VALUES as ReadonlyArray<string>).includes(v);
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

export function TaskBoard({ initial, isPro = false }: Props) {
  const [tasks, setTasks] = useState<Task[]>(initial);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [sort, setSort] = useState<SortValue>("smart");
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [controlsOpen, setControlsOpen] = useState<boolean>(true);
  const [paywallOpen, setPaywallOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const f = window.localStorage.getItem(FILTER_KEY);
    if (isFilter(f)) setFilter(f);
    const s = window.localStorage.getItem(SORT_KEY);
    if (isSort(s)) setSort(s);
    const c = window.localStorage.getItem(CATEGORY_KEY);
    if (isCategoryFilter(c)) setCategory(c);
    const co = window.localStorage.getItem(CONTROLS_KEY);
    if (co === "closed") setControlsOpen(false);
    else if (co === "open") setControlsOpen(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FILTER_KEY, filter);
  }, [filter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(SORT_KEY, sort);
  }, [sort]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CATEGORY_KEY, category);
  }, [category]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CONTROLS_KEY, controlsOpen ? "open" : "closed");
  }, [controlsOpen]);

  const counts = useMemo(() => {
    let active = 0;
    for (const t of tasks) if (!t.done) active += 1;
    return { all: tasks.length, active, done: tasks.length - active };
  }, [tasks]);

  const categoryCounts = useMemo(() => {
    const acc: Record<CategoryValue, number> = {
      work: 0,
      personal: 0,
      study: 0,
      other: 0,
    };
    for (const t of tasks) {
      const key = (
        CATEGORIES.some((c) => c.value === t.category) ? t.category : "other"
      ) as CategoryValue;
      acc[key] += 1;
    }
    return acc;
  }, [tasks]);

  const sorted = useMemo(() => sortTasks(tasks, sort), [tasks, sort]);

  const visible = useMemo(() => {
    let list = sorted;
    if (filter === "active") list = list.filter((t) => !t.done);
    else if (filter === "done") list = list.filter((t) => t.done);
    if (category !== "all") list = list.filter((t) => t.category === category);
    return list;
  }, [sorted, filter, category]);

  async function handleAdd(rawInput: string) {
    setError(null);
    if (!isPro && tasks.length >= FREE_TASK_LIMIT) {
      setPaywallOpen(true);
      return;
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawInput }),
      });
      if (res.status === 402) {
        setPaywallOpen(true);
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || data.error || "Не вдалося додати задачу");
      }
      const newTask: Task = await res.json();
      setTasks((prev) => [
        { ...newTask, comments: newTask.comments ?? [] },
        ...prev,
      ]);
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
      setTasks((cur) =>
        cur.map((t) =>
          t.id === id
            ? { ...updated, comments: updated.comments ?? t.comments }
            : t
        )
      );
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleEditCategory(id: string, next: CategoryValue) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, category: next } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося змінити категорію");
      }
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleEditPriority(id: string, next: PriorityValue) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, priority: next } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: next }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося змінити пріоритет");
      }
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleEditDeadline(id: string, iso: string | null) {
    setError(null);
    const prev = tasks;
    setTasks(tasks.map((t) => (t.id === id ? { ...t, deadline: iso } : t)));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deadline: iso }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося змінити дедлайн");
      }
      const updated: Task = await res.json();
      setTasks((cur) =>
        cur.map((t) =>
          t.id === id
            ? { ...updated, comments: updated.comments ?? t.comments }
            : t
        )
      );
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleAddComment(taskId: string, body: string) {
    setError(null);
    const tempId = `tmp-${Math.random().toString(36).slice(2)}`;
    const optimistic: Comment = {
      id: tempId,
      taskId,
      body,
      createdAt: new Date().toISOString(),
    };
    const prev = tasks;
    setTasks(
      tasks.map((t) =>
        t.id === taskId ? { ...t, comments: [...t.comments, optimistic] } : t
      )
    );
    try {
      const res = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося додати коментар");
      }
      const created: Comment = await res.json();
      setTasks((cur) =>
        cur.map((t) =>
          t.id === taskId
            ? {
                ...t,
                comments: t.comments.map((c) =>
                  c.id === tempId ? created : c
                ),
              }
            : t
        )
      );
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleEditComment(
    taskId: string,
    commentId: string,
    body: string
  ) {
    setError(null);
    const prev = tasks;
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              comments: t.comments.map((c) =>
                c.id === commentId ? { ...c, body } : c
              ),
            }
          : t
      )
    );
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ body }),
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Не вдалося оновити коментар");
      }
      const updated: Comment = await res.json();
      setTasks((cur) =>
        cur.map((t) =>
          t.id === taskId
            ? {
                ...t,
                comments: t.comments.map((c) =>
                  c.id === commentId ? updated : c
                ),
              }
            : t
        )
      );
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleDeleteComment(taskId: string, commentId: string) {
    setError(null);
    const prev = tasks;
    setTasks(
      tasks.map((t) =>
        t.id === taskId
          ? { ...t, comments: t.comments.filter((c) => c.id !== commentId) }
          : t
      )
    );
    try {
      const res = await fetch(
        `/api/tasks/${taskId}/comments/${commentId}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Не вдалося видалити коментар");
    } catch (e) {
      setTasks(prev);
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  const showAllDoneBanner =
    filter === "all" && category === "all" && counts.all > 0 && counts.active === 0;

  function renderBody() {
    if (counts.all === 0) return <EmptyAll />;

    if (
      filter === "active" &&
      counts.active === 0 &&
      category === "all"
    ) {
      return (
        <EmptyAllDone
          actionLabel="Подивитись виконані"
          onAction={() => setFilter("done")}
        />
      );
    }

    if (visible.length === 0) {
      return (
        <EmptyFilter
          onReset={() => {
            setFilter("all");
            setCategory("all");
          }}
        />
      );
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
                  onEditCategory={handleEditCategory}
                  onEditPriority={handleEditPriority}
                  onEditDeadline={handleEditDeadline}
                  onAddComment={handleAddComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
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
                  onEditCategory={handleEditCategory}
                  onEditPriority={handleEditPriority}
                  onEditDeadline={handleEditDeadline}
                  onAddComment={handleAddComment}
                  onEditComment={handleEditComment}
                  onDeleteComment={handleDeleteComment}
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
            onEditCategory={handleEditCategory}
            onEditPriority={handleEditPriority}
            onEditDeadline={handleEditDeadline}
            onAddComment={handleAddComment}
            onEditComment={handleEditComment}
            onDeleteComment={handleDeleteComment}
          />
        ))}
      </ul>
    );
  }

  const showFreeBanner = !isPro && tasks.length >= 8;
  const remaining = Math.max(0, FREE_TASK_LIMIT - tasks.length);

  return (
    <div className="flex flex-col gap-6">
      <TaskInput onSubmit={handleAdd} />

      {error && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {showFreeBanner && (
        <FreePlanBanner
          used={Math.min(tasks.length, FREE_TASK_LIMIT)}
          total={FREE_TASK_LIMIT}
          remaining={remaining}
        />
      )}

      <PaywallDialog
        open={paywallOpen}
        onClose={() => setPaywallOpen(false)}
        limit={FREE_TASK_LIMIT}
      />


      <DigestPanel disabled={counts.active === 0} />

      {counts.all > 0 && (
        <TaskControls
          filter={filter}
          sort={sort}
          category={category}
          collapsed={!controlsOpen}
          counts={counts}
          categoryCounts={categoryCounts}
          onFilterChange={setFilter}
          onSortChange={setSort}
          onCategoryChange={setCategory}
          onToggleCollapsed={() => setControlsOpen((v) => !v)}
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

function FreePlanBanner({
  used,
  total,
  remaining,
}: {
  used: number;
  total: number;
  remaining: number;
}) {
  const atLimit = remaining === 0;
  return (
    <div
      className={`flex flex-col gap-3 rounded-2xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between ${
        atLimit
          ? "border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)]"
          : "border-[var(--color-border)] bg-[var(--color-accent-soft)]"
      }`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[var(--color-accent)] text-[var(--color-accent-foreground)]">
          <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
            <path
              d="M12 2l2.39 6.95H22l-6.2 4.5 2.39 6.95L12 16.9 5.81 20.4 8.2 13.45 2 8.95h7.61L12 2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <div>
          <p className="font-semibold text-[var(--color-foreground)]">
            {atLimit
              ? "Ліміт досягнуто"
              : `Залишилось ${remaining} з ${total} задач`}
          </p>
          <p className="text-[var(--color-foreground-muted)]">
            {atLimit
              ? `Оформи Pro, щоб додавати нові задачі без обмежень.`
              : `Ти використав ${used} з ${total} на безкоштовному плані.`}
          </p>
        </div>
      </div>
      <a
        href="/upgrade"
        className="inline-flex h-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] px-4 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)]"
      >
        Оформити Pro
      </a>
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
