import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    console.log("[api/stores] GET", { userId: session.user.id });

    const res = await totalumSdk.crud.query("shopify_store", {
      _filter: { user: session.user.id },
      _sort: { createdAt: "desc" },
    } as any);

    return NextResponse.json({ ok: true, data: res?.data ?? [] });
  } catch (err: any) {
    console.error("[api/stores] GET error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      store_name?: string;
      shopify_domain?: string;
      annual_revenue_usd?: number | string;
      monthly_orders?: number | string;
      primary_region?: string;
    };
    const { store_name, shopify_domain, annual_revenue_usd, monthly_orders, primary_region } = body || {};

    if (!store_name || !shopify_domain) {
      return NextResponse.json(
        { ok: false, error: "store_name and shopify_domain are required" },
        { status: 400 },
      );
    }

    console.log("[api/stores] POST", { userId: session.user.id, store_name });

    const created = await totalumSdk.crud.createRecord("shopify_store", {
      store_name,
      shopify_domain,
      annual_revenue_usd: Number(annual_revenue_usd) || 0,
      monthly_orders: Number(monthly_orders) || 0,
      primary_region: primary_region || "Global",
      connection_status: "connected",
      last_synced_at: new Date().toISOString(),
      user: session.user.id,
    });

    return NextResponse.json({ ok: true, data: created?.data });
  } catch (err: any) {
    console.error("[api/stores] POST error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
