import { NextResponse, type NextRequest } from "next/server";
import { verifyShopifyHmac } from "@/lib/security/shopify-hmac";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

/**
 * GDPR mandatory webhook: customers/data_request
 *
 * Shopify sends this when a customer asks for a copy of their data. We do not
 * store customer-level PII in our database (orders are minimized to ZIP +
 * country before persistence), so there is no data to return. We still verify
 * the HMAC and audit-log the request to prove receipt to Shopify reviewers.
 */
export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpFromHeaders(req.headers));
  const userAgent = req.headers.get("user-agent") || "";
  const signature = req.headers.get("x-shopify-hmac-sha256");
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/customers/data_request] SHOPIFY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const valid = await verifyShopifyHmac(rawBody, signature, secret);
  if (!valid) {
    console.warn("[webhooks/customers/data_request] HMAC verification failed", { shop, ipHash });
    await logAudit({
      action: "shopify_webhook_rejected",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { topic: "customers/data_request", shop, reason: "hmac_mismatch" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let customerId: string | null = null;
  try {
    const parsed = JSON.parse(rawBody) as { customer?: { id?: number | string } };
    customerId = parsed.customer?.id ? String(parsed.customer.id) : null;
  } catch {
    // Body wasn't JSON; we still acknowledge — payload is informational.
  }

  console.log("[webhooks/customers/data_request] received", { shop, customerId });
  await logAudit({
    action: "shopify_webhook_received",
    ip_hash: ipHash,
    user_agent: userAgent,
    record_id: customerId,
    metadata: { topic: "customers/data_request", shop },
  });

  return NextResponse.json({ ok: true });
}
