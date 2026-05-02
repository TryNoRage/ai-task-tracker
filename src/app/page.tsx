import { prisma } from "@/lib/prisma";
import { TaskBoard } from "@/components/TaskBoard";
import type { Task } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadTasks(): Promise<Task[]> {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });
    return tasks.map((t) => ({
      id: t.id,
      rawInput: t.rawInput,
      title: t.title,
      priority: t.priority,
      category: t.category,
      deadline: t.deadline ? t.deadline.toISOString() : null,
      done: t.done,
      createdAt: t.createdAt.toISOString(),
      comments: t.comments.map((c) => ({
        id: c.id,
        taskId: c.taskId,
        body: c.body,
        createdAt: c.createdAt.toISOString(),
      })),
    }));
  } catch (err) {
    console.error("[page] failed to load tasks:", err);
    return [];
  }
}

export default async function Home() {
  const tasks = await loadTasks();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-10 px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-4 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-foreground-muted)] shadow-[var(--shadow-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          AI Таск-Трекер
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-5xl">
          Записуй задачі{" "}
          <span className="text-[var(--color-accent)]">природньою мовою</span>
        </h1>
        <p className="max-w-xl text-base text-[var(--color-foreground-muted)] sm:text-lg">
          Пиши як думаєш — AI сам розбере назву, дедлайн і пріоритет.
          Жодних форм, жодних випадних списків.
        </p>
      </header>

      <TaskBoard initial={tasks} />

      <footer className="mt-auto pt-6 text-center text-xs text-[var(--color-muted)]">
        Збережено в Neon Postgres · Парсинг через OpenAI
      </footer>
    </main>
  );
}
