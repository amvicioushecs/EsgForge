import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.log("[api/reports] GET", { userId: session.user.id });
    const res = await totalumSdk.crud.query("esg_report", {
      _filter: { user: session.user.id },
      _sort: { createdAt: "desc" },
      store: true,
    } as any);
    return NextResponse.json({ ok: true, data: res?.data ?? [] });
  } catch (err: any) {
    console.error("[api/reports] GET error", err);
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
      title?: string;
      framework?: string;
      reporting_period?: string;
      store_id?: string;
    };
    const { title, framework, reporting_period, store_id } = body || {};

    if (!title || !framework || !reporting_period) {
      return NextResponse.json(
        { ok: false, error: "title, framework and reporting_period are required" },
        { status: 400 },
      );
    }

    console.log("[api/reports] POST", { userId: session.user.id, title, framework });

    const score = 70 + Math.floor(Math.random() * 25);
    const summary = `Auto-generated ${String(framework).toUpperCase()} disclosure for ${reporting_period}. Includes Scope 1+2 emissions estimate based on shipping data, supplier diversity index, and governance disclosures.`;

    const payload: any = {
      title,
      framework,
      reporting_period,
      status: "ready",
      compliance_score: score,
      summary,
      generated_at: new Date().toISOString(),
      user: session.user.id,
    };
    if (store_id) payload.store = store_id;

    const created = await totalumSdk.crud.createRecord("esg_report", payload);

    // Auto-create a notification
    try {
      await totalumSdk.crud.createRecord("esg_notification", {
        title: `Report ready: ${title}`,
        message: `Your ${String(framework).toUpperCase()} disclosure for ${reporting_period} is available for review.`,
        category: "report_ready",
        read_status: "unread",
        sent_at: new Date().toISOString(),
        user: session.user.id,
      });
    } catch (e) {
      console.error("[api/reports] notification create failed", e);
    }

    return NextResponse.json({ ok: true, data: created?.data });
  } catch (err: any) {
    console.error("[api/reports] POST error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
