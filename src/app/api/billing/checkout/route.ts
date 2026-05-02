import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/lib/session";
import { getPlanById } from "@/lib/plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireApiUser(req);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Невалідний JSON" }, { status: 400 });
  }

  const planId =
    typeof body === "object" && body !== null && "planId" in body
      ? String((body as { planId: unknown }).planId ?? "").trim()
      : "";

  const plan = getPlanById(planId);
  if (!plan) {
    return NextResponse.json(
      { error: "UNKNOWN_PLAN", message: "Невідомий план" },
      { status: 400 }
    );
  }

  try {
    const now = new Date();
    const planExpiresAt = new Date(
      now.getTime() + plan.days * 24 * 60 * 60 * 1000
    );

    await prisma.user.update({
      where: { id: auth.user.id },
      data: {
        plan: plan.id,
        planExpiresAt,
      },
    });

    return NextResponse.json({
      ok: true,
      plan: plan.id,
      planExpiresAt: planExpiresAt.toISOString(),
    });
  } catch (err) {
    console.error("[POST /api/billing/checkout]", err);
    return NextResponse.json(
      { error: "CHECKOUT_FAILED", message: "Не вдалося оформити план" },
      { status: 500 }
    );
  }
}
