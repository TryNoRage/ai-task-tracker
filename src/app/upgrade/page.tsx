import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getUserPlan, isProActive } from "@/lib/plan";
import { UserMenu } from "@/components/UserMenu";
import { PlansView } from "./PlansView";

export const dynamic = "force-dynamic";

export default async function UpgradePage() {
  const user = await requireUser();
  const planStatus = await getUserPlan(user.id);
  if (isProActive(planStatus)) {
    redirect("/");
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10 sm:py-14">
      <header className="relative flex flex-col items-center gap-3 text-center">
        <div className="absolute right-0 top-0">
          <UserMenu user={user} />
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-foreground-muted)] shadow-[var(--shadow-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          Pro-доступ
        </span>
        <h1 className="text-4xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-5xl">
          Оберіть свій план
        </h1>
        <p className="max-w-xl text-base text-[var(--color-foreground-muted)] sm:text-lg">
          Необмежена кількість задач, повний AI-парсинг і щоденні дайджести.
          Оплачуй зручний період — скасуй будь-коли.
        </p>
      </header>

      <PlansView />

      <footer className="mt-auto pt-6 text-center text-xs text-[var(--color-muted)]">
        Це тестовий чекаут. Реальних списань не відбувається.
      </footer>
    </main>
  );
}
