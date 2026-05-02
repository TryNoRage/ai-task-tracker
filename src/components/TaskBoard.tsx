"use client";

import { useMemo, useState } from "react";
import { TaskInput } from "./TaskInput";
import { TaskCard } from "./TaskCard";
import type { Task } from "@/lib/types";

interface Props {
  initial: Task[];
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pa = PRIORITY_ORDER[a.priority] ?? 1;
    const pb = PRIORITY_ORDER[b.priority] ?? 1;
    if (pa !== pb) return pa - pb;
    const da = a.deadline ? new Date(a.deadline).getTime() : Number.POSITIVE_INFINITY;
    const db = b.deadline ? new Date(b.deadline).getTime() : Number.POSITIVE_INFINITY;
    if (da !== db) return da - db;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function TaskBoard({ initial }: Props) {
  const [tasks, setTasks] = useState<Task[]>(() => sortTasks(initial));
  const [error, setError] = useState<string | null>(null);

  const { active, completed } = useMemo(() => {
    const a: Task[] = [];
    const c: Task[] = [];
    for (const t of tasks) (t.done ? c : a).push(t);
    return { active: a, completed: c };
  }, [tasks]);

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
      setTasks((prev) => sortTasks([newTask, ...prev]));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Невідома помилка");
    }
  }

  async function handleToggle(id: string, done: boolean) {
    setError(null);
    const prev = tasks;
    setTasks(sortTasks(tasks.map((t) => (t.id === id ? { ...t, done } : t))));
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

  return (
    <div className="flex flex-col gap-6">
      <TaskInput onSubmit={handleAdd} />

      {error && (
        <div className="rounded-2xl border border-[color-mix(in_oklab,var(--color-danger)_25%,transparent)] bg-[var(--color-priority-high-soft)] px-4 py-3 text-sm font-medium text-[var(--color-danger)]">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex flex-col gap-6">
          {active.length > 0 && (
            <section>
              <SectionHeader
                title="До виконання"
                count={active.length}
              />
              <ul className="flex flex-col gap-2">
                {active.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <SectionHeader title="Виконано" count={completed.length} />
              <ul className="flex flex-col gap-2">
                {completed.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onToggle={handleToggle}
                    onDelete={handleDelete}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-3 flex items-center gap-2 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-foreground-muted)]">
        {title}
      </h2>
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-surface-muted)] px-1.5 text-[11px] font-semibold text-[var(--color-accent)]">
        {count}
      </span>
    </div>
  );
}

function EmptyState() {
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
