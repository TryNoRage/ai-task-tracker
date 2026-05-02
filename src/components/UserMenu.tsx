"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

interface Props {
  user: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
  };
}

function initial(user: Props["user"]): string {
  const source = (user.name?.trim() || user.email.trim() || "?").trim();
  return source.charAt(0).toUpperCase();
}

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onPointer(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await authClient.signOut();
    } catch (err) {
      console.error("[signOut]", err);
    } finally {
      setSigningOut(false);
      setOpen(false);
      router.push("/login");
      router.refresh();
    }
  }

  const displayName = user.name?.trim() || user.email;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-sm font-semibold text-[var(--color-foreground)] shadow-[var(--shadow-soft)] transition hover:border-[var(--color-border-strong)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_oklab,var(--color-accent)_30%,transparent)]"
      >
        {user.image ? (
          <Image
            src={user.image}
            alt={displayName}
            width={44}
            height={44}
            className="h-full w-full object-cover"
            unoptimized
          />
        ) : (
          <span aria-hidden>{initial(user)}</span>
        )}
        <span className="sr-only">Меню користувача</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Закрити меню"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-[color-mix(in_oklab,var(--color-foreground)_30%,transparent)] backdrop-blur-[2px] sm:hidden"
          />

          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            className="
              fixed inset-x-0 bottom-0 z-50 w-full
              rounded-t-3xl border border-b-0 border-[var(--color-border)] bg-[var(--color-surface)]
              p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-[var(--shadow-card)]
              motion-safe:animate-[slideUp_.18s_ease-out]
              sm:absolute sm:inset-auto sm:right-0 sm:top-[calc(100%+8px)] sm:bottom-auto
              sm:w-64 sm:rounded-2xl sm:border sm:p-3 sm:pb-3 sm:motion-safe:animate-none
            "
          >
            <div
              aria-hidden
              className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)] sm:hidden"
            />

            <div className="px-2 pb-3 sm:px-1 sm:pb-2">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                {displayName}
              </p>
              {user.name && (
                <p className="truncate text-xs text-[var(--color-foreground-muted)]">
                  {user.email}
                </p>
              )}
            </div>

            <div className="h-px bg-[var(--color-border)]" />

            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              className="
                mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl
                bg-[var(--color-priority-high-soft)] px-4 text-sm font-semibold text-[var(--color-danger)]
                transition hover:bg-[color-mix(in_oklab,var(--color-danger)_15%,transparent)]
                disabled:cursor-not-allowed disabled:opacity-60
                sm:h-10 sm:rounded-xl sm:bg-transparent sm:font-medium sm:hover:bg-[var(--color-priority-high-soft)]
              "
            >
              <LogoutIcon className="h-4 w-4" />
              {signingOut ? "Виходимо…" : "Вийти"}
            </button>
          </div>
        </>
      )}

    </div>
  );
}

function LogoutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M15 17l5-5-5-5M20 12H9M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
