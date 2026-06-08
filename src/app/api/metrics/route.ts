import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.log("[api/metrics] GET", { userId: session.user.id });
    const res = await totalumSdk.crud.query("esg_metric", {
      _filter: { user: session.user.id },
      _sort: { recorded_at: "desc" },
    } as any);
    return NextResponse.json({ ok: true, data: res?.data ?? [] });
  } catch (err: any) {
    console.error("[api/metrics] GET error", err);
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
      metric_name?: string;
      category?: string;
      value?: number | string;
      unit?: string;
      period?: string;
      trend?: string;
    };
    const { metric_name, category, value, unit, period, trend } = body || {};
    if (!metric_name || !category || value === undefined || value === null) {
      return NextResponse.json(
        { ok: false, error: "metric_name, category and value are required" },
        { status: 400 },
      );
    }
    console.log("[api/metrics] POST", { userId: session.user.id, metric_name });
    const created = await totalumSdk.crud.createRecord("esg_metric", {
      metric_name,
      category,
      value: Number(value),
      unit: unit || "",
      period: period || "",
      trend: trend || "stable",
      recorded_at: new Date().toISOString(),
      user: session.user.id,
    });
    return NextResponse.json({ ok: true, data: created?.data });
  } catch (err: any) {
    console.error("[api/metrics] POST error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
