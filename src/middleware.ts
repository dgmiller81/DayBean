import { NextResponse, type NextRequest } from "next/server";

// We can't import server-only env reader here (middleware runs in edge runtime),
// so we read process.env directly. The boot guard already validated values on
// node startup; this is just routing.
const PUBLIC_PATHS = new Set(["/login"]);
const PUBLIC_PREFIXES = ["/api/health", "/api/cron", "/_next", "/favicon"];

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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
