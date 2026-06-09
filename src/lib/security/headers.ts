import type { NextResponse } from "next/server";

/**
 * Strict security headers applied to every response by middleware.
 *
 * CSP note: Next.js inline scripts and Cloudflare worker injects require either
 * a nonce strategy or a tight allow-list. To stay safe AND functional in the
 * existing Cloudflare/OpenNext setup we use 'self' for scripts/styles plus the
 * Cloudflare and Google Fonts hosts that are already loaded by the app. We do
 * NOT allow 'unsafe-inline' for scripts — only styles get 'unsafe-inline' (a
 * common, accepted compromise for Tailwind / Next.js styled-jsx; required by
 * Tailwind's runtime style insertion).
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-eval' https://challenges.cloudflare.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://api.climatiq.io https://api.totalum.app https://api.stripe.com",
  "frame-src 'self' https://js.stripe.com https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors *",
  "upgrade-insecure-requests",
].join("; ");

export function applySecurityHeaders(response: NextResponse) {
  response.headers.set("Content-Security-Policy", CSP);
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(self)",
  );
  return response;
}
