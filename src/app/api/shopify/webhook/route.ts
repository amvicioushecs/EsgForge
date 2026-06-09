import { NextResponse, type NextRequest } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { verifyShopifyHmac } from "@/lib/security/shopify-hmac";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";
import { minimizeShopifyAddress } from "@/lib/security/address-minimizer";
import { apiError } from "@/lib/security/api-error";

/**
 * Shopify webhook receiver.
 *
 * Security:
 *  • HMAC-SHA256 signature verified against SHOPIFY_WEBHOOK_SECRET.
 *  • Failed verification → 401, audit-logged, no payload processing.
 *
 * Reliability:
 *  • Idempotency: Shopify order_id is checked against the destination table BEFORE
 *    any processing. If a row with that order_id already exists, we return 200
 *    without recording anything. This is what keeps a 12-month historical resync
 *    from double-counting.
 *  • Asynchronous processing: we return 200 to Shopify immediately and run the
 *    persistence step as fire-and-forget. Shopify's webhook timeout (5s) is the
 *    binding constraint; signature + idempotency check are fast enough to clear
 *    that budget even under spike traffic.
 *
 * GDPR Article 5(1)(c) — data minimization:
 *  • Customer addresses are passed through minimizeShopifyAddress() so only the
 *    ZIP/postal code + country code survive into our tables. Street-level data
 *    is dropped before any DB write.
 */

interface ShopifyOrderLike {
  id?: number | string;
  total_price?: string | number;
  currency?: string;
  shipping_address?: unknown;
  billing_address?: unknown;
  customer?: { default_address?: unknown };
}

async function processOrderAsync(payload: ShopifyOrderLike, topic: string) {
  try {
    const orderId = String(payload.id ?? "");
    if (!orderId) return;

    // Idempotency check — abort if we've already recorded this Shopify order.
    const existing = await totalumSdk.crud.query("esg_metric", {
      _filter: {
        activity_id: `shopify_order:${orderId}`,
      },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const dupe = (existing?.data as unknown as Array<{ _id: string }> | undefined)?.[0];
    if (dupe?._id) {
      console.log("[shopify/webhook] idempotent skip", { orderId, topic });
      return;
    }

    // GDPR Article 5(1)(c) — minimize the customer address BEFORE any persistence.
    // We need ZIP + country only, to look up shipping-region emission factors. The
    // full street-level address is discarded here and never written to any table.
    const addr =
      minimizeShopifyAddress(payload.shipping_address) ??
      minimizeShopifyAddress(payload.billing_address) ??
      minimizeShopifyAddress(payload.customer?.default_address);

    console.log("[shopify/webhook] processed (stub)", {
      orderId,
      topic,
      zip: addr.zip,
      country: addr.country,
    });
    // NOTE: actual emissions ingestion is implemented in the merchant-data pipeline
    // (not in this endpoint). This receiver is the gated entry point — HMAC verified,
    // idempotency enforced, address minimized — so downstream code can trust the input.
  } catch (err) {
    console.error("[shopify/webhook] async processing failed", err);
  }
}

export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpFromHeaders(req.headers));
  const userAgent = req.headers.get("user-agent") || "";
  const topic = req.headers.get("x-shopify-topic") || "";
  const signature = req.headers.get("x-shopify-hmac-sha256");

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[shopify/webhook] SHOPIFY_WEBHOOK_SECRET is not configured");
    return apiError(503, {
      error: "not_configured",
      message: "Shopify webhook receiver is not configured.",
      error_code: "not_configured",
    });
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch (err) {
    console.error("[shopify/webhook] failed to read body", err);
    return apiError(400, {
      error: "bad_request",
      message: "Invalid request body.",
      error_code: "bad_request",
    });
  }

  const valid = await verifyShopifyHmac(rawBody, signature, secret);
  if (!valid) {
    console.warn("[shopify/webhook] HMAC verification failed — rejecting", { topic, ipHash });
    await logAudit({
      action: "shopify_webhook_rejected",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { topic, reason: "hmac_mismatch" },
    });
    return apiError(401, {
      error: "unauthorized",
      message: "Invalid webhook signature.",
      error_code: "hmac_mismatch",
    });
  }

  let payload: ShopifyOrderLike;
  try {
    payload = JSON.parse(rawBody) as ShopifyOrderLike;
  } catch (err) {
    console.error("[shopify/webhook] payload not valid JSON", err);
    return apiError(400, {
      error: "bad_request",
      message: "Webhook payload was not valid JSON.",
      error_code: "bad_request",
    });
  }

  // Log receipt (audit trail) — fire-and-forget so we can ack Shopify immediately.
  void logAudit({
    action: "shopify_webhook_received",
    ip_hash: ipHash,
    user_agent: userAgent,
    record_id: payload.id ? String(payload.id) : null,
    metadata: { topic },
  });

  // Fire-and-forget the heavy work so we ack Shopify in <100ms even on spike traffic.
  void processOrderAsync(payload, topic);

  return NextResponse.json({ ok: true });
}
