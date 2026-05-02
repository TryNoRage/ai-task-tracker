export const FREE_TASK_LIMIT = 10;

export type PlanId = "month" | "quarter" | "half_year";

export interface PlanDescriptor {
  id: PlanId;
  title: string;
  subtitle: string;
  months: number;
  days: number;
  priceUsd: number;
  pricePerDay: number;
  popular?: boolean;
}

export const PLANS: ReadonlyArray<PlanDescriptor> = [
  {
    id: "month",
    title: "1 місяць",
    subtitle: "30 днів",
    months: 1,
    days: 30,
    priceUsd: 9.99,
    pricePerDay: 0.33,
  },
  {
    id: "quarter",
    title: "3 місяці",
    subtitle: "90 днів",
    months: 3,
    days: 90,
    priceUsd: 19.99,
    pricePerDay: 0.22,
    popular: true,
  },
  {
    id: "half_year",
    title: "6 місяців",
    subtitle: "180 днів",
    months: 6,
    days: 180,
    priceUsd: 29.99,
    pricePerDay: 0.17,
  },
];

export function getPlanById(id: string): PlanDescriptor | null {
  return PLANS.find((p) => p.id === id) ?? null;
}

export interface PlanStatus {
  plan: string;
  planExpiresAt: Date | null;
}

export function isProActive(p: PlanStatus | null | undefined): boolean {
  if (!p) return false;
  if (p.plan === "free") return false;
  if (!p.planExpiresAt) return false;
  return p.planExpiresAt.getTime() > Date.now();
}
