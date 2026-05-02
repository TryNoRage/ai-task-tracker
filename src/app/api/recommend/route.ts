import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recommendTasks } from "@/lib/recommendTasks";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const active = await prisma.task.findMany({
      where: { done: false },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });

    if (active.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    const recs = await recommendTasks(active);
    const byId = new Map(active.map((t) => [t.id, t]));

    const enriched = recs
      .map((r) => {
        const task = byId.get(r.id);
        if (!task) return null;
        return {
          id: task.id,
          title: task.title,
          priority: task.priority,
          deadline: task.deadline ? task.deadline.toISOString() : null,
          reason: r.reason,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    return NextResponse.json({ recommendations: enriched });
  } catch (err) {
    console.error("[POST /api/recommend]", err);
    return NextResponse.json(
      { error: "Не вдалося отримати рекомендації" },
      { status: 500 }
    );
  }
}
