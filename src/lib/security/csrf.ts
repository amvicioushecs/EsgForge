import "server-only";
import type { NextRequest } from "next/server";

/**
 * Double-submit cookie CSRF protection.
 *
 * On every page load the server ensures the `ef_csrf` cookie is set (random,
 * non-httpOnly so the client can read it). State-mutating requests must echo
 * the cookie value in an `x-csrf-token` header. The pair must match.
 *
 * This is layered ON TOP of Better-Auth's sameSite session cookie — both have
 * to be true. Better-Auth's auth routes (/api/auth/*) are excluded because
 * Better-Auth has its own CSRF defenses appropriate to its protocol.
 */
const COOKIE_NAME = "ef_csrf";
const HEADER_NAME = "x-csrf-token";

export function csrfCookieName() {
  return COOKIE_NAME;
}

export function generateCsrfToken(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

const PROTECTED_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

const EXEMPT_PATH_PREFIXES = [
  "/api/auth/", // Better-Auth handles its own CSRF
  "/api/stripe/webhook", // Webhook signed by Stripe
  "/api/shopify/webhook", // Webhook signed by Shopify HMAC
  "/api/webhooks/", // GDPR webhooks signed by Shopify HMAC
  "/api/emissions/estimate", // Service-to-service API key protected
  "/api/waitlist", // Anonymous public form — protected by validation + rate limit
  "/api/partner/track", // Anonymous tracker — fired before any cookie exists
  "/api/health", // Read-only health probe
];

export function csrfShouldEnforce(method: string, pathname: string): boolean {
  if (!PROTECTED_METHODS.has(method.toUpperCase())) return false;
  for (const prefix of EXEMPT_PATH_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname === prefix.replace(/\/$/, "")) {
      return false;
    }
    if (pathname.startsWith(prefix)) return false;
  }
  return true;
}

export function csrfVerify(req: NextRequest): boolean {
  const cookieVal = req.cookies.get(COOKIE_NAME)?.value;
  const headerVal = req.headers.get(HEADER_NAME);
  if (!cookieVal || !headerVal) return false;
  // Constant-time-ish comparison: bail if lengths differ then char-by-char.
  if (cookieVal.length !== headerVal.length) return false;
  let mismatch = 0;
  for (let i = 0; i < cookieVal.length; i++) {
    mismatch |= cookieVal.charCodeAt(i) ^ headerVal.charCodeAt(i);
  }
  return mismatch === 0;
}
