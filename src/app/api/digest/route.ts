import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDailyDigest, type DigestItem, type Slot } from "@/lib/dailyDigest";
import { requireApiUser } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface EnrichedItem {
  id: string;
  title: string;
  priority: string;
  category: string;
  deadline: string | null;
  reason: string;
}

export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (!auth.ok) return auth.response;

  try {
    const active = await prisma.task.findMany({
      where: { userId: auth.user.id, done: false },
      orderBy: [{ createdAt: "desc" }],
      take: 50,
    });

    if (active.length === 0) {
      return NextResponse.json({
        digest: { morning: [], day: [], evening: [], summary: "" },
      });
    }

    const digest = await buildDailyDigest(
      active.map((t) => ({
        id: t.id,
        title: t.title,
        priority: t.priority,
        category: t.category,
        deadline: t.deadline,
        createdAt: t.createdAt,
      }))
    );

    const byId = new Map(active.map((t) => [t.id, t]));

    const enrich = (items: DigestItem[]): EnrichedItem[] =>
      items
        .map((it) => {
          const t = byId.get(it.id);
          if (!t) return null;
          return {
            id: t.id,
            title: t.title,
            priority: t.priority,
            category: t.category,
            deadline: t.deadline ? t.deadline.toISOString() : null,
            reason: it.reason,
          } satisfies EnrichedItem;
        })
        .filter((x): x is EnrichedItem => x !== null);

    const slots: Record<Slot, EnrichedItem[]> = {
      morning: enrich(digest.morning),
      day: enrich(digest.day),
      evening: enrich(digest.evening),
    };

    return NextResponse.json({
      digest: {
        morning: slots.morning,
        day: slots.day,
        evening: slots.evening,
        summary: digest.summary,
      },
    });
  } catch (err) {
    console.error("[POST /api/digest]", err);
    return NextResponse.json(
      { error: "Не вдалося скласти план дня" },
      { status: 500 }
    );
  }
}
