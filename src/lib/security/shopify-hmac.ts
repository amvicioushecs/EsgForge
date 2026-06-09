import "server-only";

/**
 * Verify a Shopify webhook HMAC signature.
 *
 * Shopify signs the raw body with HMAC-SHA256 using the webhook secret and
 * delivers the base64-encoded digest in `X-Shopify-Hmac-Sha256`. We compute
 * the same digest on the raw bytes and compare in constant time.
 */
export async function verifyShopifyHmac(
  rawBody: string,
  signatureB64: string | null,
  secret: string,
): Promise<boolean> {
  if (!signatureB64 || !secret) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, enc.encode(rawBody));
  const computed = btoa(String.fromCharCode(...new Uint8Array(mac)));

  if (computed.length !== signatureB64.length) return false;
  let mismatch = 0;
  for (let i = 0; i < computed.length; i++) {
    mismatch |= computed.charCodeAt(i) ^ signatureB64.charCodeAt(i);
  }
  return mismatch === 0;
}
