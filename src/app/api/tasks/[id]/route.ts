import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: Ctx) {
  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null) {
    return NextResponse.json({ error: "Невалідне тіло" }, { status: 400 });
  }

  const data: Prisma.TaskUpdateInput = {};

  if ("done" in body && typeof (body as { done: unknown }).done === "boolean") {
    data.done = (body as { done: boolean }).done;
  }

  if ("title" in body && typeof (body as { title: unknown }).title === "string") {
    const title = (body as { title: string }).title.trim();
    if (title.length === 0) {
      return NextResponse.json(
        { error: "Назва не може бути порожньою" },
        { status: 400 }
      );
    }
    if (title.length > 500) {
      return NextResponse.json(
        { error: "Назва занадто довга (макс 500 символів)" },
        { status: 400 }
      );
    }
    data.title = title;
  }

  if (
    "category" in body &&
    typeof (body as { category: unknown }).category === "string"
  ) {
    const category = (body as { category: string }).category;
    if (
      category !== "work" &&
      category !== "personal" &&
      category !== "study" &&
      category !== "other"
    ) {
      return NextResponse.json(
        { error: "Невідома категорія" },
        { status: 400 }
      );
    }
    data.category = category;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Немає полів для оновлення" },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.task.update({
      where: { id },
      data,
      include: { comments: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Задачу не знайдено" }, { status: 404 });
    }
    console.error("[PATCH /api/tasks/:id]", err);
    return NextResponse.json(
      { error: "Не вдалося оновити задачу" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { id } = await params;
  try {
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2025"
    ) {
      return NextResponse.json({ error: "Задачу не знайдено" }, { status: 404 });
    }
    console.error("[DELETE /api/tasks/:id]", err);
    return NextResponse.json(
      { error: "Не вдалося видалити задачу" },
      { status: 500 }
    );
  }
}
