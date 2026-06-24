import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { applySecurityHeaders, generateCspNonce } from "@/lib/security/headers";
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

// Sensitive path probes — return 404 (not 403) so scanners can't fingerprint
// the block. These are noise, not errors: do not log them as warnings.
//
// Patterns are matched against the (decoded) pathname only — never the query
// string — so they can't accidentally block a legitimate page that merely has
// a suspicious-looking query param. Each pattern is anchored to a path segment
// boundary ((^|/)) or the path end ($) so it can't fire mid-word.
const BLOCKED_PATTERNS: RegExp[] = [
  // Dotenv files anywhere: /.env, /.env.local, /.env.production, /app/.env, /config/.env.backup
  /(^|\/)\.env(\.[A-Za-z0-9_-]+)*\/?$/i,
  // PHP scripts/probes anywhere: /wp-config.php, /phpinfo.php, /debug.php, /test.php.bak, /admin/info.php
  /\.php(\.[A-Za-z0-9_-]+)*\/?$/i,
  // Backup / saved / editor-swap copies: foo.bak, foo.old, page.save, .swp/.swo/.orig/.tmp
  /\.(bak|old|save|swp|swo|orig|tmp)\/?$/i,
  // Anything ending in a tilde (emacs/editor backup): /index.html~, /config~
  /~\/?$/,
  // VCS metadata: any path containing /.git/ (or ending in /.git), plus hg/svn/bzr
  /(^|\/)\.git(\/|$)/i,
  /(^|\/)\.(hg|svn|bzr)(\/|$)/i,
  // Terraform state & config probes: /terraform.tfstate, /.terraform/, /terraform/anything
  // (anchored so a slug like /terraforming-guide isn't caught)
  /(^|\/)\.?terraform([./]|$)/i,
  /\.tfstate(\.[A-Za-z0-9_-]+)*\/?$/i,
  // WordPress config probes: /wp-config, /wp-config.php (php handled above too)
  /(^|\/)wp-config/i,
  // Common app/server config & secret-store probes
  /(^|\/)(config\/secrets|includes\/config|config\.inc|config\/database)/i,
  // .well-known probe variants aimed at secrets / VCS / config (legit .well-known
  // files like security.txt or apple-app-site-association have no such extension)
  /^\/\.well-known\/.*\.(env|git|php|sql|bak|old|save|ini|yml|yaml|key|pem)$/i,
  // High-signal credential / secret files probed directly at a path root
  /(^|\/)(\.htpasswd|\.htaccess|\.npmrc|\.netrc|\.aws|\.ssh|id_rsa|id_dsa|\.dockercfg|docker-compose\.ya?ml)(\/|$)/i,
  // Dumped databases, private keys and key stores
  /\.(sql|sql\.gz|dump|pem|key|p12|pfx|kdbx)\/?$/i,
];

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

  // Sensitive-path probe shield: 404 silently before any other processing
  // (auth, CSRF, CORS, headers). Scanners get a generic not-found and can't
  // tell the path is special. The body/headers mirror an ordinary 404 so the
  // block is indistinguishable from a missing page, and we mark it no-store so
  // no CDN/browser caches the probe response.
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(pathname)) {
      return new NextResponse("404: This page could not be found.", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "no-store",
        },
      });
    }
  }
  const isHtmlNav =
    !pathname.startsWith("/api/") &&
    !pathname.startsWith("/_next/") &&
    !pathname.includes(".");
  // Per-request nonce for HTML responses so Next.js can stamp it on its own
  // inline scripts. API/static responses don't need it.
  const nonce = isHtmlNav ? generateCspNonce() : undefined;

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

  // Forward the nonce on the request headers so the Next.js runtime applies
  // it to inline framework scripts (RSC streaming, hydration).
  let response: NextResponse;
  if (nonce) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-nonce", nonce);
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    response = NextResponse.next();
  }
  addCorsHeaders(response, request);
  applySecurityHeaders(response, nonce);
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
    applySecurityHeaders(redirectResponse, nonce);
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
