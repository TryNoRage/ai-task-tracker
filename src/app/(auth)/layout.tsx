export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-10 sm:py-16">
      <div className="mb-6 flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1 text-xs font-medium text-[var(--color-foreground-muted)] shadow-[var(--shadow-soft)]">
          <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-accent)]" />
          AI Таск-Трекер
        </span>
      </div>
      {children}
    </main>
  );
}
