import type { NextResponse } from "next/server";

/**
 * Strict security headers applied to every response by middleware.
 *
 * CSP note: Next.js emits inline <script> tags at render time for RSC streaming
 * payloads and hydration data. Rather than weakening script-src with
 * 'unsafe-inline', we use a per-request nonce: middleware generates a fresh
 * random nonce, forwards it on the request headers so Next.js stamps it on its
 * own inline scripts, and embeds 'nonce-XYZ' in script-src so the browser
 * accepts only those scripts. Styles continue to allow 'unsafe-inline' because
 * Tailwind / styled-jsx and React's `style={{}}` prop insert dynamic inline
 * styles that cannot be hashed or externalised without breaking functionality.
 */
function buildCsp(nonce?: string): string {
  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'unsafe-eval' https://challenges.cloudflare.com`
    : "script-src 'self' 'unsafe-eval' https://challenges.cloudflare.com";

  return [
    "default-src 'self'",
    scriptSrc,
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
}

export function applySecurityHeaders(response: NextResponse, nonce?: string) {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
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

/**
 * Generate a cryptographically random nonce suitable for use in a CSP
 * script-src directive. Uses Web Crypto so it works in the Edge runtime.
 */
export function generateCspNonce(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  let bin = "";
  for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
  return btoa(bin);
}
