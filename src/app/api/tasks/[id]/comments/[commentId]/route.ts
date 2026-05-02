import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string; commentId: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id: taskId, commentId } = await params;

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
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { taskId: true },
    });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json(
        { error: "Коментар не знайдено" },
        { status: 404 }
      );
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { body: text },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Коментар не знайдено" },
        { status: 404 }
      );
    }
    console.error("[PATCH /api/tasks/:id/comments/:cid]", err);
    return NextResponse.json(
      { error: "Не вдалося оновити коментар" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id: taskId, commentId } = await params;

  try {
    const existing = await prisma.comment.findUnique({
      where: { id: commentId },
      select: { taskId: true },
    });

    if (!existing || existing.taskId !== taskId) {
      return NextResponse.json(
        { error: "Коментар не знайдено" },
        { status: 404 }
      );
    }

    await prisma.comment.delete({ where: { id: commentId } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json(
        { error: "Коментар не знайдено" },
        { status: 404 }
      );
    }
    console.error("[DELETE /api/tasks/:id/comments/:cid]", err);
    return NextResponse.json(
      { error: "Не вдалося видалити коментар" },
      { status: 500 }
    );
  }
}
