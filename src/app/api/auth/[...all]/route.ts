import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { checkRateLimit, clearRateLimit } from "@/lib/security/rate-limiter";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

const base = toNextJsHandler(auth);

const AUTH_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const AUTH_MAX_FAILS = 5;

function isAuthAttemptPath(pathname: string): boolean {
  // Better-Auth uses these for credential entry points. Throttle these specifically.
  return (
    pathname.includes("/sign-in") ||
    pathname.includes("/sign-up") ||
    pathname.includes("/reset-password") ||
    pathname.includes("/forget-password")
  );
}

export const GET = base.GET;

export async function POST(req: NextRequest) {
  const pathname = new URL(req.url).pathname;
  if (!isAuthAttemptPath(pathname)) {
    return base.POST(req);
  }

  const ip = clientIpFromHeaders(req.headers);
  const key = `auth:${ip}:${pathname}`;
  const limit = checkRateLimit(key, { windowMs: AUTH_WINDOW_MS, max: AUTH_MAX_FAILS });
  if (!limit.allowed) {
    console.warn("[auth] rate-limited", { ip_short: ip.slice(0, 16), pathname });
    const ipHash = await hashIp(ip);
    void logAudit({
      action: "auth_rate_limited",
      ip_hash: ipHash,
      user_agent: req.headers.get("user-agent") || "",
      metadata: { pathname, reset_seconds: Math.ceil(limit.resetMs / 1000) },
    });
    return NextResponse.json(
      {
        ok: false,
        error: "rate_limited",
        message: "Too many attempts, try again in 15 minutes.",
        error_code: "auth_rate_limited",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(limit.resetMs / 1000)),
        },
      },
    );
  }

  const response = await base.POST(req);

  // Audit + bucket adjustment based on response status.
  const ipHash = await hashIp(ip);
  const userAgent = req.headers.get("user-agent") || "";
  if (response.status >= 200 && response.status < 300) {
    // Success — clear the IP's bucket so future legitimate attempts aren't throttled.
    clearRateLimit(key);
    void logAudit({
      action: "login_success",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { pathname },
    });
  } else if (response.status >= 400 && response.status < 500) {
    void logAudit({
      action: "login_failure",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { pathname, status: response.status },
    });
  }

  return response;
}
