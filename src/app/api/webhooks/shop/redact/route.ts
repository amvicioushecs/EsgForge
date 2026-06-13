import { NextResponse, type NextRequest } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { verifyShopifyHmac } from "@/lib/security/shopify-hmac";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

/**
 * GDPR mandatory webhook: shop/redact
 *
 * Triggered 48h after a shop uninstalls the app. We delete every esg_metric
 * row scoped to that shop_domain so no merchant data persists past the
 * deletion window. Returns 200 on success.
 */
export async function POST(req: NextRequest) {
  const ipHash = await hashIp(clientIpFromHeaders(req.headers));
  const userAgent = req.headers.get("user-agent") || "";
  const signature = req.headers.get("x-shopify-hmac-sha256");
  const headerShop = req.headers.get("x-shopify-shop-domain") || "";

  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[webhooks/shop/redact] SHOPIFY_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const rawBody = await req.text();
  const valid = await verifyShopifyHmac(rawBody, signature, secret);
  if (!valid) {
    console.warn("[webhooks/shop/redact] HMAC verification failed", { shop: headerShop, ipHash });
    await logAudit({
      action: "shopify_webhook_rejected",
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: { topic: "shop/redact", shop: headerShop, reason: "hmac_mismatch" },
    });
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payloadShop = "";
  try {
    const parsed = JSON.parse(rawBody) as { shop_domain?: string };
    payloadShop = parsed.shop_domain || "";
  } catch {
    // ignore — header value still drives the scrub
  }
  const shop = payloadShop || headerShop;

  let removed = 0;
  if (shop) {
    try {
      // Page through esg_metric rows for the shop until none remain.
      // We keep the page size modest so we never block Shopify's 5s ack window
      // with a single oversized scan.
      const PAGE = 50;
      for (let i = 0; i < 200; i++) {
        const res = await totalumSdk.crud.query("esg_metric", {
          filter: { shop },
          limit: PAGE,
        } as Parameters<typeof totalumSdk.crud.query>[1]);
        const rows = (res?.data as unknown as Array<{ _id: string }> | undefined) || [];
        if (rows.length === 0) break;
        for (const row of rows) {
          if (!row?._id) continue;
          await totalumSdk.crud.deleteRecordById("esg_metric", row._id);
          removed += 1;
        }
        if (rows.length < PAGE) break;
      }
    } catch (err) {
      console.error("[webhooks/shop/redact] scrub failed", { shop, err });
    }
  }

  console.log("[webhooks/shop/redact] processed", { shop, removed });
  await logAudit({
    action: "shopify_webhook_received",
    ip_hash: ipHash,
    user_agent: userAgent,
    metadata: { topic: "shop/redact", shop, removed },
  });

  return NextResponse.json({ ok: true });
}
