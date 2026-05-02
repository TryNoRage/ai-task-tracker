import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { cache } from "react";
import { auth } from "./auth";

export const getCurrentSession = cache(async () => {
  const h = await headers();
  return auth.api.getSession({ headers: h });
});

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export async function requireUser(redirectTo = "/login"): Promise<SessionUser> {
  const session = await getCurrentSession();
  if (!session?.user) {
    redirect(redirectTo);
  }
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

export async function getOptionalUser(): Promise<SessionUser | null> {
  const session = await getCurrentSession();
  if (!session?.user) return null;
  const u = session.user;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    image: u.image ?? null,
  };
}

export type ApiAuthResult =
  | { ok: true; user: SessionUser }
  | { ok: false; response: NextResponse };

export async function requireApiUser(req: Request): Promise<ApiAuthResult> {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session?.user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Не авторизовано" },
        { status: 401 }
      ),
    };
  }
  const u = session.user;
  return {
    ok: true,
    user: {
      id: u.id,
      email: u.email,
      name: u.name ?? null,
      image: u.image ?? null,
    },
  };
}
