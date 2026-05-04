import { NextResponse, type NextRequest } from "next/server";

// We can't import server-only env reader here (middleware runs in edge runtime),
// so we read process.env directly. The boot guard already validated values on
// node startup; this is just routing.
//
// /onboarding is public-after-auth: the onboarding gate redirects authed users
// who lack the db_onboarded cookie there, and the page itself short-circuits
// already-onboarded users back to /. /api routes (besides whitelisted ones)
// still require an authed session, but should not be force-redirected to
// onboarding — they have their own response semantics.
const PUBLIC_PATHS = new Set(["/login", "/onboarding"]);
const PUBLIC_PREFIXES = ["/api/health", "/api/cron", "/_next", "/favicon"];
const ONBOARDING_BYPASS_PREFIXES = ["/api/", "/onboarding"];

export function middleware(req: NextRequest) {
  const authMode = process.env.AUTH_MODE ?? "none";
  if (authMode === "none") {
    return NextResponse.next();
  }

  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return NextResponse.next();
  }

  // simple/full: require the session cookie
  const session = req.cookies.get("mm_session");
  if (!session) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // S6-T05: gate authed users at the onboarding step. db_onboarded is written
  // by the login action (when user.onboardedAt is non-null), the onboarding
  // completion action, and a backfill in /'s server render. Skip the gate for
  // /api/* (let them 401/200 normally) and the onboarding route itself.
  const onboarded = req.cookies.get("db_onboarded");
  if (!onboarded) {
    const skipGate = ONBOARDING_BYPASS_PREFIXES.some((p) =>
      pathname.startsWith(p),
    );
    if (!skipGate) {
      const url = req.nextUrl.clone();
      url.pathname = "/onboarding";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
