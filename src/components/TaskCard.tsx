"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import type { Task } from "@/lib/types";
import { formatDeadline, formatRelative, isOverdue } from "@/lib/format";
import { CATEGORIES, getCategory, type CategoryValue } from "@/lib/categories";

interface Props {
  task: Task;
  onToggle: (id: string, done: boolean) => void;
  onDelete: (id: string) => void;
  onEditTitle: (id: string, title: string) => Promise<void> | void;
  onEditCategory: (id: string, category: CategoryValue) => Promise<void> | void;
  onAddComment: (id: string, body: string) => Promise<void> | void;
  onDeleteComment: (taskId: string, commentId: string) => Promise<void> | void;
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

export function TaskCard({
  task,
  onToggle,
  onDelete,
  onEditTitle,
  onEditCategory,
  onAddComment,
  onDeleteComment,
}: Props) {
  const deadlineText = formatDeadline(task.deadline);
  const overdue = isOverdue(task.deadline, task.done);
  const priorityKey = task.priority in PRIORITY_PILL ? task.priority : "medium";
  const category = getCategory(task.category);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!editing) setDraft(task.title);
  }, [task.title, editing]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function commit() {
    const next = draft.trim();
    if (!next || next === task.title) {
      setEditing(false);
      setDraft(task.title);
      return;
    }
    setEditing(false);
    void onEditTitle(task.id, next);
  }

  function cancel() {
    setEditing(false);
    setDraft(task.title);
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  }

  async function submitComment() {
    const body = commentDraft.trim();
    if (!body || posting) return;
    setPosting(true);
    try {
      await onAddComment(task.id, body);
      setCommentDraft("");
    } finally {
      setPosting(false);
    }
  }

  function handleCommentKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submitComment();
    }
  }

  const cardClass = [
    "group relative flex flex-col rounded-2xl border bg-[var(--color-surface)] shadow-[var(--shadow-card)] transition",
    overdue
      ? "border-[color-mix(in_oklab,var(--color-priority-high)_35%,var(--color-border))] border-l-4 border-l-[var(--color-priority-high)] bg-[color-mix(in_oklab,var(--color-priority-high)_4%,var(--color-surface))]"
      : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
    task.done ? "opacity-60" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const commentCount = task.comments.length;

  return (
    <li className={cardClass}>
      <div className="flex items-start gap-3 p-4">
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
          <div className="flex items-start gap-1.5">
            {overdue && (
              <span
                className="mt-1 inline-flex h-4 w-4 flex-none items-center justify-center text-[var(--color-priority-high)]"
                title="Прострочено"
                aria-hidden
              >
                <svg viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M8 1.5a.9.9 0 0 1 .8.45l6.4 11A.9.9 0 0 1 14.4 14H1.6a.9.9 0 0 1-.8-1.05l6.4-11A.9.9 0 0 1 8 1.5Zm0 4a.7.7 0 0 0-.7.7v3.6a.7.7 0 0 0 1.4 0V6.2A.7.7 0 0 0 8 5.5Zm0 6a.85.85 0 1 0 0 1.7.85.85 0 0 0 0-1.7Z" />
                </svg>
              </span>
            )}

            {editing ? (
              <input
                ref={inputRef}
                type="text"
                value={draft}
                maxLength={500}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={commit}
                className="-my-1 -ml-2 min-w-0 flex-1 rounded-md border border-[var(--color-accent)] bg-[var(--color-surface)] px-2 py-1 text-[15px] font-medium leading-snug text-[var(--color-foreground)] outline-none ring-2 ring-[var(--color-accent)]/20 sm:text-base"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                title="Натисни щоб відредагувати"
                className={`min-w-0 flex-1 break-words text-left text-[15px] font-medium leading-snug text-[var(--color-foreground)] transition hover:text-[var(--color-accent)] sm:text-base ${
                  task.done ? "line-through text-[var(--color-muted)]" : ""
                }`}
              >
                {task.title}
              </button>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium ${PRIORITY_PILL[priorityKey]}`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${PRIORITY_DOT[priorityKey]}`}
              />
              {PRIORITY_LABEL[priorityKey] ?? priorityKey}
            </span>

            <CategoryPill
              value={category.value}
              label={category.label}
              emoji={category.emoji}
              onChange={(v) => onEditCategory(task.id, v)}
            />

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

        {!editing && (
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
        )}
      </div>

      <div className="border-t border-[var(--color-border)] px-4 py-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-[var(--color-foreground-muted)] transition hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-foreground)]"
          aria-expanded={expanded}
        >
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
            <path
              d="M3 4.5h10v6H8.5l-2.5 2v-2H3v-6Z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinejoin="round"
            />
          </svg>
          {commentCount === 0
            ? "Додати коментар"
            : `${commentCount} ${pluralComments(commentCount)}`}
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className={`h-3 w-3 transition ${expanded ? "rotate-180" : ""}`}
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
        </button>

        {expanded && (
          <div className="mt-2 flex flex-col gap-3 pb-1">
            {commentCount > 0 && (
              <ul className="flex flex-col gap-2">
                {task.comments.map((c) => (
                  <li
                    key={c.id}
                    className="group/comment flex items-start gap-2 rounded-xl bg-[var(--color-surface-muted)] px-3 py-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap break-words text-sm text-[var(--color-foreground)]">
                        {c.body}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
                        {formatRelative(c.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteComment(task.id, c.id)}
                      aria-label="Видалити коментар"
                      className="inline-flex h-6 w-6 flex-none items-center justify-center rounded-full text-[var(--color-muted)] opacity-0 transition hover:bg-[var(--color-priority-high-soft)] hover:text-[var(--color-danger)] focus-visible:opacity-100 group-hover/comment:opacity-100"
                    >
                      <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3">
                        <path
                          d="M4 4l8 8M12 4l-8 8"
                          stroke="currentColor"
                          strokeWidth="1.6"
                          strokeLinecap="round"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <textarea
                value={commentDraft}
                onChange={(e) => setCommentDraft(e.target.value)}
                onKeyDown={handleCommentKeyDown}
                rows={2}
                maxLength={2000}
                placeholder="Напиши коментар… (Cmd/Ctrl+Enter — надіслати)"
                className="min-w-0 flex-1 resize-y rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-foreground)] outline-none transition focus:border-[var(--color-accent)] focus:shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-accent)_15%,transparent)]"
              />
              <button
                type="button"
                onClick={submitComment}
                disabled={!commentDraft.trim() || posting}
                className="inline-flex items-center justify-center gap-1.5 self-end rounded-full bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-foreground)] shadow-[var(--shadow-cta)] transition hover:bg-[var(--color-accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {posting ? "…" : "Надіслати"}
              </button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

function pluralComments(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "коментар";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14))
    return "коментарі";
  return "коментарів";
}

function CategoryPill({
  value,
  label,
  emoji,
  onChange,
}: {
  value: CategoryValue;
  label: string;
  emoji: string;
  onChange: (v: CategoryValue) => void;
}) {
  return (
    <span className="relative inline-flex items-center">
      <span className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-muted)] px-2.5 py-0.5 font-medium text-[var(--color-foreground-muted)]">
        <span aria-hidden>{emoji}</span>
        {label}
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
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as CategoryValue)}
        aria-label="Категорія"
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {CATEGORIES.map((c) => (
          <option key={c.value} value={c.value}>
            {c.emoji} {c.label}
          </option>
        ))}
      </select>
    </span>
  );
}
