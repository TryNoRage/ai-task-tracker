import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function POST(req: Request, { params }: Ctx) {
  const { id: taskId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || !("body" in body)) {
    return NextResponse.json(
      { error: "Поле body обовʼязкове" },
      { status: 400 }
    );
  }

  const raw = (body as { body: unknown }).body;
  if (typeof raw !== "string") {
    return NextResponse.json(
      { error: "body має бути рядком" },
      { status: 400 }
    );
  }

  const text = raw.trim();
  if (text.length === 0) {
    return NextResponse.json(
      { error: "Коментар не може бути порожнім" },
      { status: 400 }
    );
  }
  if (text.length > 2000) {
    return NextResponse.json(
      { error: "Коментар занадто довгий (макс 2000 символів)" },
      { status: 400 }
    );
  }

  try {
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true },
    });
    if (!task) {
      return NextResponse.json({ error: "Задачу не знайдено" }, { status: 404 });
    }

    const comment = await prisma.comment.create({
      data: { taskId, body: text },
    });

    return NextResponse.json(comment, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error(
        "[POST /api/tasks/:id/comments] Prisma error:",
        err.code,
        err.message
      );
    } else {
      console.error("[POST /api/tasks/:id/comments]", err);
    }
    return NextResponse.json(
      { error: "Не вдалося додати коментар" },
      { status: 500 }
    );
  }
}
