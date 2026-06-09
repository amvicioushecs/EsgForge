import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders } from "@/lib/security/headers";
import {
  csrfCookieName,
  csrfShouldEnforce,
  csrfVerify,
  generateCsrfToken,
} from "@/lib/security/csrf";

const isProduction = process.env.NODE_ENV === "production";
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
const appOrigin = appUrl ? new URL(appUrl).origin : "";

function isAllowedOrigin(origin: string, request: NextRequest): boolean {
  if (!isProduction) return true;
  if (appOrigin && origin === appOrigin) return true;
  if (/^https:\/\/[^/]+\.totalum-project\.com$/.test(origin)) return true;
  const host = request.headers.get("host");
  if (host && origin === `https://${host}`) return true;
  return false;
}

const publicRoutes = [
  "/",
  "/login",
  "/register",
  "/blog",
  "/demo",
  "/privacy-policy",
  "/terms-of-service",

  //stripe routes here
  "/stripe/demo",
  "/stripe/success",
  "/stripe/cancel",
];

function addCorsHeaders(response: NextResponse, request: NextRequest) {
  const origin = request.headers.get("origin");
  if (origin && isAllowedOrigin(origin, request)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-CSRF-Token",
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400");
    response.headers.set("Vary", "Origin");
  }
  return response;
}

function ensureCsrfCookie(request: NextRequest, response: NextResponse) {
  if (!request.cookies.get(csrfCookieName())?.value) {
    const token = generateCsrfToken();
    response.cookies.set(csrfCookieName(), token, {
      path: "/",
      sameSite: "lax",
      httpOnly: false, // intentionally readable so client JS can echo it in the X-CSRF-Token header
      secure: isProduction,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }
}

function logTiming(method: string, pathname: string, status: number, startMs: number) {
  const elapsed = Date.now() - startMs;
  console.log("[req]", { method, path: pathname, status, ms: elapsed });
}

export async function middleware(request: NextRequest) {
  const startMs = Date.now();
  const { pathname } = request.nextUrl;
  const method = request.method;

  // CORS preflight — short-circuit but still apply security headers + CORS.
  if (method === "OPTIONS") {
    const response = new NextResponse(null, { status: 204 });
    addCorsHeaders(response, request);
    applySecurityHeaders(response);
    logTiming(method, pathname, 204, startMs);
    return response;
  }

  // CSRF enforcement on state-mutating routes that aren't exempt.
  if (csrfShouldEnforce(method, pathname)) {
    if (!csrfVerify(request)) {
      console.warn("[csrf] rejecting request", { method, pathname });
      const denied = NextResponse.json(
        {
          ok: false,
          error: "csrf_failed",
          message: "CSRF token missing or invalid. Refresh the page and try again.",
          error_code: "csrf_failed",
        },
        { status: 403 },
      );
      addCorsHeaders(denied, request);
      applySecurityHeaders(denied);
      logTiming(method, pathname, 403, startMs);
      return denied;
    }
  }

  const response = NextResponse.next();
  addCorsHeaders(response, request);
  applySecurityHeaders(response);
  ensureCsrfCookie(request, response);

  // API + static — pass through (security headers already applied).
  if (
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/") ||
    pathname.includes(".")
  ) {
    logTiming(method, pathname, 200, startMs);
    return response;
  }

  // Public app routes.
  if (publicRoutes.some((route) => pathname === route || pathname.startsWith(route + "/"))) {
    logTiming(method, pathname, 200, startMs);
    return response;
  }

  // Auth gate for protected routes.
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ||
    request.cookies.get("__Secure-better-auth.session_token");

  if (!sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    addCorsHeaders(redirectResponse, request);
    applySecurityHeaders(redirectResponse);
    ensureCsrfCookie(request, redirectResponse);
    logTiming(method, pathname, 302, startMs);
    return redirectResponse;
  }

  logTiming(method, pathname, 200, startMs);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
