import { NextResponse, type NextRequest } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { verifyShopifyHmac } from "@/lib/security/shopify-hmac";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

/**
 * GDPR mandatory webhook: customers/redact
 *
 * Triggered 48h after a merchant requests deletion of a specific customer's
 * data. Our esg_metric rows do not hold customer-level PII (we minimize to
 * ZIP + country before write), but if any field carries a customer reference
 * we scrub it here. Returns 200 on success.
 */
export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpFromHeaders(req.headers));
  const userAgent = req.headers.get("user-agent") || "";
  const signature = req.headers.get("x-shopify-hmac-sha256");
  const shop = req.headers.get("x-shopify-shop-domain") || "";

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/customers/redact] SHOPIFY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const valid = await verifyShopifyHmac(rawBody, signature, secret);
  if (!valid) {
    console.warn("[webhooks/customers/redact] HMAC verification failed", { shop, ipHash });
    await logAudit({
      action: "shopify_webhook_rejected",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { topic: "customers/redact", shop, reason: "hmac_mismatch" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let customerId: string | null = null;
  let orderIds: string[] = [];
  try {
    const parsed = JSON.parse(rawBody) as {
      customer?: { id?: number | string };
      orders_to_redact?: Array<number | string>;
    };
    customerId = parsed.customer?.id ? String(parsed.customer.id) : null;
    orderIds = Array.isArray(parsed.orders_to_redact)
      ? parsed.orders_to_redact.map(String)
      : [];
  } catch {
    // continue — we still ack receipt
  }

  // Best-effort scrub: for any esg_metric row tied to an order in the
  // redaction list AND scoped to this shop, drop the row. The aggregated
  // emissions data has no customer-level PII, but discarding the row is the
  // strictest interpretation of "delete or anonymize for that customer".
  let removed = 0;
  if (shop && orderIds.length > 0) {
    for (const orderId of orderIds) {
      try {
        const res = await totalumSdk.crud.query("esg_metric", {
          filter: { shop, shopify_order_id: orderId },
          limit: 50,
        } as Parameters<typeof totalumSdk.crud.query>[1]);
        const rows = (res?.data as unknown as Array<{ _id: string }> | undefined) || [];
        for (const row of rows) {
          if (!row?._id) continue;
          await totalumSdk.crud.deleteRecordById("esg_metric", row._id);
          removed += 1;
        }
      } catch (err) {
        console.error("[webhooks/customers/redact] scrub failed", { shop, orderId, err });
      }
    }
  }

  console.log("[webhooks/customers/redact] processed", { shop, customerId, removed });
  await logAudit({
    action: "shopify_webhook_received",
    ip_hash: ipHash,
    user_agent: userAgent,
    record_id: customerId,
    metadata: { topic: "customers/redact", shop, removed },
  });

  return NextResponse.json({ ok: true });
}
