import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Ctx {
  params: Promise<{ id: string; commentId: string }>;
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
