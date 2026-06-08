import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function POST() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    console.log("[api/seed] start", { userId });

    // Only seed if user has nothing yet
    const existing = await totalumSdk.crud.query("shopify_store", {
      _filter: { user: userId },
      _limit: 1,
    } as any);
    if (Array.isArray(existing?.data) && existing.data.length > 0) {
      return NextResponse.json({ ok: true, data: { seeded: false, reason: "already_has_data" } });
    }

    const now = new Date();
    const iso = (offsetDays = 0) =>
      new Date(now.getTime() - offsetDays * 24 * 60 * 60 * 1000).toISOString();

    // Sample store
    const storeRes = await totalumSdk.crud.createRecord("shopify_store", {
      store_name: "Hearth & Loom",
      shopify_domain: "hearth-and-loom.myshopify.com",
      annual_revenue_usd: 8400000,
      monthly_orders: 5240,
      primary_region: "United States",
      connection_status: "connected",
      last_synced_at: iso(0),
      user: userId,
    });
    const storeId = (storeRes?.data as any)?._id;

    // Sample metrics
    const metricsSeed = [
      { metric_name: "Scope 1 + 2 emissions", category: "environmental", value: 162.4, unit: "tCO2e", period: "Q2 2026", trend: "improving" },
      { metric_name: "Recycled packaging share", category: "environmental", value: 72, unit: "%", period: "Q2 2026", trend: "improving" },
      { metric_name: "Avg. shipping distance", category: "environmental", value: 1824, unit: "km", period: "Q2 2026", trend: "improving" },
      { metric_name: "Supplier diversity index", category: "social", value: 0.68, unit: "ratio", period: "Q2 2026", trend: "stable" },
      { metric_name: "Employee retention", category: "social", value: 91, unit: "%", period: "Q2 2026", trend: "improving" },
      { metric_name: "Suppliers audited", category: "governance", value: 37, unit: "count", period: "Q2 2026", trend: "improving" },
      { metric_name: "Board independence", category: "governance", value: 60, unit: "%", period: "Q2 2026", trend: "stable" },
    ];

    await Promise.all(
      metricsSeed.map((m) =>
        totalumSdk.crud.createRecord("esg_metric", {
          ...m,
          recorded_at: iso(2),
          user: userId,
        }),
      ),
    );

    // Sample reports
    const reportsSeed = [
      {
        title: "CSRD Annual Disclosure — 2025",
        framework: "csrd",
        reporting_period: "FY 2025",
        status: "submitted",
        compliance_score: 86,
        summary: "Full CSRD disclosure submitted with double materiality assessment, Scope 1+2 inventory, and value chain due diligence.",
        generated_at: iso(45),
      },
      {
        title: "SEC Climate Disclosure — Q1",
        framework: "sec",
        reporting_period: "Q1 2026",
        status: "ready",
        compliance_score: 81,
        summary: "Quarterly climate risk and emissions disclosure ready for executive review.",
        generated_at: iso(20),
      },
      {
        title: "GRI Standards — Mid-Year",
        framework: "gri",
        reporting_period: "H1 2026",
        status: "processing",
        compliance_score: 74,
        summary: "Mid-year disclosure currently aggregating supplier survey responses.",
        generated_at: iso(5),
      },
    ];

    await Promise.all(
      reportsSeed.map((r) =>
        totalumSdk.crud.createRecord("esg_report", {
          ...r,
          user: userId,
          store: storeId,
        }),
      ),
    );

    // Sample notifications
    const notifSeed = [
      {
        title: "Q1 SEC disclosure ready",
        message: "Your Q1 2026 SEC climate disclosure is ready for review. Please sign off before the regulatory deadline.",
        category: "report_ready",
        read_status: "unread",
        sent_at: iso(0),
      },
      {
        title: "CSRD deadline approaching",
        message: "Your CSRD double-materiality refresh is due in 21 days. We will need updated supplier inputs.",
        category: "deadline",
        read_status: "unread",
        sent_at: iso(2),
      },
      {
        title: "New EU disclosure rules",
        message: "The European Commission updated the ESRS interim provisions. Your reports already reflect the latest changes.",
        category: "compliance_update",
        read_status: "read",
        sent_at: iso(7),
      },
    ];

    await Promise.all(
      notifSeed.map((n) =>
        totalumSdk.crud.createRecord("esg_notification", {
          ...n,
          user: userId,
        }),
      ),
    );

    console.log("[api/seed] done", { userId });

    return NextResponse.json({ ok: true, data: { seeded: true } });
  } catch (err: any) {
    console.error("[api/seed] error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
