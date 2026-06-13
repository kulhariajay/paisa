import { auth } from "@/auth";
import { NextResponse } from "next/server";

/**
 * Guards every route. Unauthenticated requests are redirected to /signin
 * (except the sign-in page itself and the auth API routes).
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuthed = !!req.auth;
  const isPublic =
    pathname === "/signin" || pathname.startsWith("/api/auth");

  if (!isAuthed && !isPublic) {
    const url = new URL("/signin", req.nextUrl.origin);
    return NextResponse.redirect(url);
  }
  if (isAuthed && pathname === "/signin") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
  return NextResponse.next();
});

export const config = {
  // Run on everything except Next internals and static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
