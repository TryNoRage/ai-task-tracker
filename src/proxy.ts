import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

const AUTH_PAGES = new Set(["/login", "/register"]);

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAuthPage = AUTH_PAGES.has(pathname);
  const hasSession = !!getSessionCookie(req);

  if (!hasSession && !isAuthPage) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.svg$).*)",
  ],
};
