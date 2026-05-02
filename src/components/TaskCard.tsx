"use client";

import type { Task } from "@/lib/types";
import { formatDeadline, isOverdue } from "@/lib/format";

interface Props {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
}

const PRIORITY_LABEL: Record<string, string> = {
  high: "Високий",
  medium: "Середній",
  low: "Низький",
};

const PRIORITY_PILL: Record<string, string> = {
  high: "bg-[var(--color-priority-high-soft)] text-[var(--color-priority-high)]",
  medium:
    "bg-[var(--color-priority-medium-soft)] text-[var(--color-priority-medium)]",
  low: "bg-[var(--color-priority-low-soft)] text-[var(--color-priority-low)]",
};

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-[var(--color-priority-high)]",
  medium: "bg-[var(--color-priority-medium)]",
  low: "bg-[var(--color-priority-low)]",
};

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const deadlineText = formatDeadline(task.deadline);
  const overdue = isOverdue(task.deadline, task.done);
  const priorityKey = task.priority in PRIORITY_PILL ? task.priority : "medium";

  return (
    <li
      className={`group flex items-start gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-card)] transition hover:border-[var(--color-border-strong)] ${
        task.done ? "opacity-60" : ""
      }`}
    >
      <label className="mt-0.5 inline-flex flex-none cursor-pointer items-center">
        <input
          type="checkbox"
          checked={task.done}
          onChange={(e) => onToggle(task.id, e.target.checked)}
          className="peer sr-only"
        />
        <span
          className={`grid h-6 w-6 place-items-center rounded-full border-2 transition ${
            task.done
              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-foreground)]"
              : "border-[var(--color-border-strong)] bg-transparent peer-hover:border-[var(--color-accent)]"
          }`}
          aria-hidden
        >
          {task.done && (
            <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
              <path
                d="M3 8.5l3 3 7-7"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </span>
        <span className="sr-only">Позначити як виконано</span>
      </label>

      <div className="min-w-0 flex-1">
        <p
          className={`min-w-0 break-words text-[15px] font-medium leading-snug text-[var(--color-foreground)] sm:text-base ${
            task.done ? "line-through text-[var(--color-muted)]" : ""
          }`}
        >
          {task.title}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${PRIORITY_PILL[priorityKey]}`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priorityKey]}`}
            />
            {PRIORITY_LABEL[priorityKey] ?? priorityKey}
          </span>

          {deadlineText && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium ${
                overdue
                  ? "bg-[var(--color-priority-high-soft)] text-[var(--color-priority-high)]"
                  : "bg-[var(--color-surface-muted)] text-[var(--color-foreground-muted)]"
              }`}
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="currentColor"
                aria-hidden
              >
                <path d="M5 1a.75.75 0 0 1 .75.75V3h4.5V1.75a.75.75 0 0 1 1.5 0V3h.75A1.5 1.5 0 0 1 14 4.5V13a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 13V4.5A1.5 1.5 0 0 1 3.5 3h.75V1.75A.75.75 0 0 1 5 1Zm7.5 5h-9v7h9V6Z" />
              </svg>
              {deadlineText}
              {overdue && <span>· прострочено</span>}
            </span>
          )}

          {task.rawInput && task.rawInput !== task.title && (
            <span
              className="hidden truncate rounded-full bg-[var(--color-surface-grey)] px-2.5 py-0.5 italic text-[var(--color-muted)] sm:inline-block max-w-[260px]"
              title={task.rawInput}
            >
              «{task.rawInput}»
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onDelete(task.id)}
        aria-label="Видалити задачу"
        className="ml-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full text-[var(--color-muted)] opacity-0 transition hover:bg-[var(--color-priority-high-soft)] hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover:opacity-100"
      >
        <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4">
          <path
            d="M6 2.5h4M2.5 4.5h11M4.5 4.5l.6 8a1 1 0 0 0 1 .9h3.8a1 1 0 0 0 1-.9l.6-8M6.5 7v4M9.5 7v4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </li>
  );
}
