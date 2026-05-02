import "server-only";

import { cache } from "react";
import { prisma } from "./prisma";
import type { PlanStatus } from "./plans-data";

export {
  FREE_TASK_LIMIT,
  PLANS,
  getPlanById,
  isProActive,
} from "./plans-data";
export type { PlanDescriptor, PlanId, PlanStatus } from "./plans-data";

export const getUserPlan = cache(async (userId: string): Promise<PlanStatus> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, planExpiresAt: true },
    });
    if (!user) return { plan: "free", planExpiresAt: null };
    return { plan: user.plan, planExpiresAt: user.planExpiresAt };
  } catch (err) {
    console.error("[getUserPlan] failed:", err);
    return { plan: "free", planExpiresAt: null };
  }
});
