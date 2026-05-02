import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseTask } from "@/lib/parseTask";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export async function GET() {
  try {
    const tasks = await prisma.task.findMany({
      orderBy: [{ done: "asc" }, { createdAt: "desc" }],
    });

    const sorted = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      const pa = PRIORITY_ORDER[a.priority] ?? 1;
      const pb = PRIORITY_ORDER[b.priority] ?? 1;
      if (pa !== pb) return pa - pb;
      const da = a.deadline ? a.deadline.getTime() : Number.POSITIVE_INFINITY;
      const db = b.deadline ? b.deadline.getTime() : Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    return NextResponse.json(sorted);
  } catch (err) {
    console.error("[GET /api/tasks]", err);
    return NextResponse.json(
      { error: "Не вдалося отримати задачі" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const rawInput =
    typeof body === "object" && body !== null && "rawInput" in body
      ? String((body as { rawInput: unknown }).rawInput ?? "").trim()
      : "";

  if (!rawInput) {
    return NextResponse.json(
      { error: "Поле rawInput обовʼязкове" },
      { status: 400 }
    );
  }

  try {
    const parsed = await parseTask(rawInput);

    const task = await prisma.task.create({
      data: {
        rawInput,
        title: parsed.title,
        priority: parsed.priority,
        deadline: parsed.deadline,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[POST /api/tasks] Prisma error:", err.code, err.message);
    } else {
      console.error("[POST /api/tasks]", err);
    }
    return NextResponse.json(
      { error: "Не вдалося створити задачу" },
      { status: 500 }
    );
  }
}
