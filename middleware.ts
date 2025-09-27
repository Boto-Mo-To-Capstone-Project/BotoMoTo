import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const VOTER_SESSION_COOKIE = "voter_session";

// Protect voter routes with a simple cookie check. Detailed validation occurs server-side.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow login and its subpages (e.g., MFA steps)
  if (pathname === "/voter/login" || pathname.startsWith("/voter/login/")) {
    return NextResponse.next();
  }

  // Check for voter session cookie
  const hasVoterCookie = req.cookies.get(VOTER_SESSION_COOKIE);
  if (!hasVoterCookie) {
    const url = req.nextUrl.clone();
    url.pathname = "/voter/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = { 
  matcher: ["/voter/:path*"],
};
