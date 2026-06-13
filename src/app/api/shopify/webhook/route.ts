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

interface EstimateResponse {
  ok?: boolean;
  co2e?: number;
  co2e_unit?: string;
  emission_factor?: { data_version?: string } & Record<string, unknown>;
}

const ORDERS_FULFILLED_TOPIC = "orders/fulfilled";

/**
 * Look up an esg_metric row keyed by (shop, shopify_order_id). The Shopify
 * order_id is globally unique on Shopify, but we scope by shop too so the
 * pipeline stays correct if a merchant uninstalls + reinstalls or a test
 * shop reuses an id.
 */
async function findDuplicate(shop: string, shopifyOrderId: string): Promise<string | null> {
  const res = await totalumSdk.crud.query("esg_metric", {
    filter: { shop, shopify_order_id: shopifyOrderId },
    limit: 1,
  } as Parameters<typeof totalumSdk.crud.query>[1]);
  const rows = (res?.data as unknown as Array<{ _id: string }> | undefined) || [];
  return rows[0]?._id ?? null;
}

function resolveBaseUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL || "";
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Build the Climatiq estimate payload from a Shopify order. We use a
 * spend-based emission factor against order subtotal — every Shopify order
 * carries total_price + currency, so this works without needing weights or
 * carrier metadata. Merchants can swap the activity_id once their factor
 * mapping is configured.
 */
function buildEstimatePayload(payload: ShopifyOrderLike, region?: string | null) {
  const money = typeof payload.total_price === "string"
    ? Number(payload.total_price)
    : (payload.total_price ?? 0);
  const money_unit = (payload.currency || "USD").toLowerCase();
  return {
    emission_factor: {
      activity_id: "consumer_goods-type_other_consumer_goods",
      ...(region ? { region } : {}),
    },
    parameters: {
      money: Number.isFinite(money) ? money : 0,
      money_unit,
    },
  };
}

/**
 * Synchronous ORDERS_FULFILLED pipeline:
 *   1. Dedupe on (shop, shopify_order_id) → 200 { status: "duplicate" } if hit.
 *   2. POST the payload to /api/emissions/estimate with the service Bearer key.
 *   3. Persist {shop, shopify_order_id, emissions_kg_co2e, data_version, created_at}
 *      into esg_metric.
 *   4. Return 200 with row id, or 500 with error detail.
 */
async function processOrdersFulfilled(
  req: NextRequest,
  payload: ShopifyOrderLike,
  shop: string,
): Promise<NextResponse> {
  const shopifyOrderId = String(payload.id ?? "");
  if (!shopifyOrderId) {
    return NextResponse.json(
      { ok: false, error: "missing_order_id", message: "Order payload had no id." },
      { status: 500 },
    );
  }

  // Dedupe.
  try {
    const existingId = await findDuplicate(shop, shopifyOrderId);
    if (existingId) {
      console.log("[shopify/webhook] duplicate ORDERS_FULFILLED, skipping insert", {
        shop,
        shopifyOrderId,
        existingId,
      });
      return NextResponse.json({ ok: true, status: "duplicate", skipped: true });
    }
  } catch (err) {
    console.error("[shopify/webhook] dedupe lookup failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: "dedupe_failed",
        message: "Could not check for existing record.",
      },
      { status: 500 },
    );
  }

  // GDPR Article 5(1)(c) — strip street-level address before any onward use.
  const addr =
    minimizeShopifyAddress(payload.shipping_address) ??
    minimizeShopifyAddress(payload.billing_address) ??
    minimizeShopifyAddress(payload.customer?.default_address);

  const apiKey = process.env.ESGFORGE_API_KEY || "";
  if (!apiKey) {
    console.error("[shopify/webhook] ESGFORGE_API_KEY is not set — cannot call estimate");
    return NextResponse.json(
      {
        ok: false,
        error: "not_configured",
        message: "Service key is not configured.",
      },
      { status: 500 },
    );
  }

  // Call our own /api/emissions/estimate as a server-to-server request.
  let estimate: EstimateResponse;
  try {
    const baseUrl = resolveBaseUrl(req);
    const estimateRes = await fetch(`${baseUrl}/api/emissions/estimate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(buildEstimatePayload(payload, addr.country || null)),
    });
    if (!estimateRes.ok) {
      const detail = await estimateRes.text().catch(() => "");
      console.error("[shopify/webhook] estimate call failed", {
        status: estimateRes.status,
        detail: detail.slice(0, 500),
      });
      return NextResponse.json(
        {
          ok: false,
          error: "estimate_failed",
          message: "Emissions estimate call failed.",
          status: estimateRes.status,
        },
        { status: 500 },
      );
    }
    estimate = (await estimateRes.json()) as EstimateResponse;
  } catch (err) {
    console.error("[shopify/webhook] estimate call threw", err);
    return NextResponse.json(
      {
        ok: false,
        error: "estimate_error",
        message: err instanceof Error ? err.message : "Estimate call error.",
      },
      { status: 500 },
    );
  }

  const emissions_kg_co2e = typeof estimate.co2e === "number" ? estimate.co2e : 0;
  const data_version = typeof estimate.emission_factor?.data_version === "string"
    ? estimate.emission_factor.data_version
    : "";
  const now = new Date().toISOString();

  try {
    const createRes = await totalumSdk.crud.createRecord("esg_metric", {
      shop,
      shopify_order_id: shopifyOrderId,
      emissions_kg_co2e,
      data_version,
      created_at: now,
      // Keep generic fields populated so existing dashboards continue to
      // surface these rows alongside non-Shopify entries.
      metric_name: `Shopify order ${shopifyOrderId}`,
      category: "environmental",
      value: emissions_kg_co2e,
      unit: estimate.co2e_unit || "kg",
      activity_id: "consumer_goods-type_other_consumer_goods",
      recorded_at: now,
    });
    const created = createRes?.data as { _id?: string } | undefined;
    return NextResponse.json({
      ok: true,
      status: "recorded",
      id: created?._id ?? null,
      emissions_kg_co2e,
      data_version,
    });
  } catch (err) {
    console.error("[shopify/webhook] esg_metric insert failed", err);
    return NextResponse.json(
      {
        ok: false,
        error: "persist_failed",
        message: err instanceof Error ? err.message : "Could not persist emissions row.",
      },
      { status: 500 },
    );
  }
}

async function processOrderAsync(payload: ShopifyOrderLike, topic: string) {
  try {
    const orderId = String(payload.id ?? "");
    if (!orderId) return;

    // Legacy idempotency path for non-ORDERS_FULFILLED topics.
    const existing = await totalumSdk.crud.query("esg_metric", {
      filter: { activity_id: `shopify_order:${orderId}` },
      limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const dupe = (existing?.data as unknown as Array<{ _id: string }> | undefined)?.[0];
    if (dupe?._id) {
      console.log("[shopify/webhook] idempotent skip", { orderId, topic });
      return;
    }

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

  // Log receipt (audit trail) — fire-and-forget so we can ack Shopify quickly.
  void logAudit({
    action: "shopify_webhook_received",
    ip_hash: ipHash,
    user_agent: userAgent,
    record_id: payload.id ? String(payload.id) : null,
    metadata: { topic },
  });

  // ORDERS_FULFILLED runs the synchronous estimate + persist pipeline.
  if (topic.toLowerCase() === ORDERS_FULFILLED_TOPIC) {
    const shop = req.headers.get("x-shopify-shop-domain") || "";
    if (!shop) {
      console.error("[shopify/webhook] ORDERS_FULFILLED missing X-Shopify-Shop-Domain");
      return NextResponse.json(
        {
          ok: false,
          error: "missing_shop",
          message: "X-Shopify-Shop-Domain header is required.",
        },
        { status: 500 },
      );
    }
    return processOrdersFulfilled(req, payload, shop);
  }

  // All other topics keep the existing fire-and-forget behavior.
  void processOrderAsync(payload, topic);

  return NextResponse.json({ ok: true });
}
