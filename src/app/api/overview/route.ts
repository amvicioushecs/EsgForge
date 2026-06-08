import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    console.log("[api/overview] GET", { userId: session.user.id });

    const [storesRes, reportsRes, metricsRes, notifRes] = await Promise.all([
      totalumSdk.crud.query("shopify_store", { _filter: { user: session.user.id } } as any),
      totalumSdk.crud.query("esg_report", {
        _filter: { user: session.user.id },
        _sort: { createdAt: "desc" },
        _limit: 5,
      } as any),
      totalumSdk.crud.query("esg_metric", {
        _filter: { user: session.user.id },
        _sort: { recorded_at: "desc" },
      } as any),
      totalumSdk.crud.query("esg_notification", {
        _filter: { user: session.user.id, read_status: "unread" },
        _sort: { sent_at: "desc" },
        _limit: 10,
      } as any),
    ]);

    const reports = (reportsRes?.data as any[]) || [];
    const metrics = (metricsRes?.data as any[]) || [];
    const stores = (storesRes?.data as any[]) || [];
    const notifications = (notifRes?.data as any[]) || [];

    const scores = reports.map((r) => Number(r.compliance_score || 0)).filter((n) => n > 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;

    const byCategory = (cat: string) =>
      metrics
        .filter((m) => m.category === cat)
        .reduce((sum, m) => sum + Number(m.value || 0), 0);

    return NextResponse.json({
      ok: true,
      data: {
        stores_count: stores.length,
        reports_count: reports.length,
        metrics_count: metrics.length,
        unread_notifications: notifications.length,
        avg_compliance_score: avgScore,
        env_total: byCategory("environmental"),
        social_total: byCategory("social"),
        governance_total: byCategory("governance"),
        recent_reports: reports,
        recent_notifications: notifications,
      },
    });
  } catch (err: any) {
    console.error("[api/overview] error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
