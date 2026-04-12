import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic gate for **HTML navigations** only. Matcher excludes `/api/*` so
 * `fetch("/api/...")` still receives JSON 401 from route handlers.
 * Session is validated on the server for RSC/API (see `(shell)/layout`, `getSessionUserId`).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
    return NextResponse.next();
  }

  const token = getSessionCookie(request);
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/messages/:path*", "/feed/:path*", "/clips/:path*", "/profile/:path*", "/settings/:path*", "/community/:path*"],
};
