"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";

/**
 * Public ephemeral demo. Everything here is computed locally in React state.
 * No fetch / no api calls / no database reads or writes happen on this page.
 */

interface DemoMetric {
  metric_name: string;
  scope?: "Scope 1" | "Scope 2" | "Scope 3";
  category: "environmental" | "social" | "governance";
  value: number;
  unit: string;
  trend: "improving" | "stable" | "declining";
}

interface DemoReport {
  title: string;
  framework: "csrd" | "sec" | "gri" | "tcfd";
  reporting_period: string;
  status: "submitted" | "ready" | "processing";
  compliance_score: number;
  summary: string;
  generated_at: string;
}

interface DemoNotification {
  title: string;
  message: string;
  category: "report_ready" | "deadline" | "compliance_update";
  read_status: "read" | "unread";
  sent_at: string;
}

const DEMO_MERCHANT = {
  store_name: "Sample Brand Co.",
  shopify_domain: "sample-brand.myshopify.com",
  annual_revenue_usd: 6_500_000,
  monthly_orders: 4_120,
  primary_region: "United States",
  connection_status: "connected" as const,
};

const DEMO_METRICS: DemoMetric[] = [
  { metric_name: "Scope 1 — direct emissions", scope: "Scope 1", category: "environmental", value: 24.6, unit: "tCO₂e", trend: "improving" },
  { metric_name: "Scope 2 — purchased energy", scope: "Scope 2", category: "environmental", value: 138.2, unit: "tCO₂e", trend: "improving" },
  { metric_name: "Scope 3 — value chain (shipping, suppliers)", scope: "Scope 3", category: "environmental", value: 712.8, unit: "tCO₂e", trend: "stable" },
  { metric_name: "Recycled packaging share", category: "environmental", value: 64, unit: "%", trend: "improving" },
  { metric_name: "Supplier diversity index", category: "social", value: 0.71, unit: "ratio", trend: "stable" },
  { metric_name: "Employee retention", category: "social", value: 88, unit: "%", trend: "improving" },
  { metric_name: "Suppliers audited", category: "governance", value: 29, unit: "count", trend: "improving" },
  { metric_name: "Board independence", category: "governance", value: 60, unit: "%", trend: "stable" },
];

const DEMO_REPORT: DemoReport = {
  title: "CSRD Annual Disclosure — Sample FY 2026",
  framework: "csrd",
  reporting_period: "FY 2026",
  status: "ready",
  compliance_score: 83,
  summary:
    "Sample audit-ready CSRD disclosure covering double materiality assessment, full Scope 1+2 inventory, Scope 3 estimate using shipping and supplier data, and governance disclosures. Generated from the demo merchant's transactions.",
  generated_at: new Date().toISOString(),
};

const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    title: "Sample report is ready for review",
    message: "Your CSRD disclosure for FY 2026 is available in the Reports tab.",
    category: "report_ready",
    read_status: "unread",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
  },
  {
    title: "CSRD deadline in 28 days",
    message: "Your CSRD filing is due soon. We will refresh supplier inputs automatically.",
    category: "deadline",
    read_status: "unread",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    title: "EU ESRS interim provisions updated",
    message: "EsgForge has aligned the templates to the latest European Commission guidance.",
    category: "compliance_update",
    read_status: "read",
    sent_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];

type Tab = "overview" | "report" | "metrics" | "notifications";

export default function DemoPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [notifications, setNotifications] = useState<DemoNotification[]>(DEMO_NOTIFICATIONS);

  const envTotal = useMemo(
    () => DEMO_METRICS.filter((m) => m.category === "environmental").reduce((s, m) => s + m.value, 0),
    [],
  );
  const socialAvg = useMemo(() => {
    const s = DEMO_METRICS.filter((m) => m.category === "social");
    return s.length ? s.reduce((a, b) => a + b.value, 0) / s.length : 0;
  }, []);
  const governanceTotal = useMemo(
    () => DEMO_METRICS.filter((m) => m.category === "governance").reduce((s, m) => s + m.value, 0),
    [],
  );

  const unread = notifications.filter((n) => n.read_status === "unread").length;
  const scopeMetrics = DEMO_METRICS.filter((m) => m.scope);
  const totalEmissions = scopeMetrics.reduce((s, m) => s + m.value, 0);

  const markRead = (idx: number) => {
    setNotifications((prev) =>
      prev.map((n, i) => (i === idx ? { ...n, read_status: "read" } : n)),
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white">
      {/* Demo banner */}
      <div className="sticky top-0 z-50 bg-amber-400/15 border-b border-amber-400/30 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-amber-100 text-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 pulse-ring" />
            <span className="font-semibold">Demo mode</span>
            <span className="text-amber-200/80 hidden sm:inline">— sample data, nothing is saved to any database.</span>
            <span className="text-amber-200/80 sm:hidden">— sample data only.</span>
          </div>
          <Link href="/">
            <Button
              variant="outline"
              className="h-8 px-3 text-xs bg-transparent border-amber-400/40 text-amber-100 hover:bg-amber-400/10"
            >
              Exit demo
            </Button>
          </Link>
        </div>
      </div>

      {/* Top bar */}
      <div className="border-b border-white/5 bg-[#0a0f1a]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={files.appIcon.url} alt="EsgForge" className="w-9 h-9 rounded-lg ring-1 ring-cyan-400/30" />
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">EsgForge</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">Demo console</span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-2">
            <Link href="/register">
              <Button className="h-9 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                Create a free account
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
        {/* Page header */}
        <div className="mb-7 flex items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Demo · {DEMO_MERCHANT.store_name}</p>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white">An audit-ready ESG console</h1>
            <p className="mt-2 text-slate-400 text-sm max-w-2xl">
              Walk through a sample Shopify Plus merchant, Scope 1 / 2 / 3 emissions, and a generated CSRD report.
              Everything you see lives in your browser tab — refresh, exit, or close to clear it.
            </p>
          </div>
        </div>

        {/* Merchant strip */}
        <div className="mb-6 p-5 rounded-2xl border border-white/5 bg-white/[0.02] grid sm:grid-cols-4 gap-5">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500">Merchant</p>
            <p className="text-base font-semibold text-white mt-1">{DEMO_MERCHANT.store_name}</p>
            <p className="text-xs text-slate-400">{DEMO_MERCHANT.shopify_domain}</p>
          </div>
          <Stat label="Annual revenue" value={`$${DEMO_MERCHANT.annual_revenue_usd.toLocaleString()}`} />
          <Stat label="Monthly orders" value={DEMO_MERCHANT.monthly_orders.toLocaleString()} />
          <Stat label="Region" value={DEMO_MERCHANT.primary_region} pill="connected" />
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2 border-b border-white/5 pb-3">
          {([
            { id: "overview", label: "Overview" },
            { id: "report", label: "Sample report" },
            { id: "metrics", label: "Metrics" },
            { id: "notifications", label: `Notifications${unread ? ` (${unread})` : ""}` },
          ] as { id: Tab; label: string }[]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-lg text-sm transition border ${
                tab === t.id
                  ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-200"
                  : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KPI label="Compliance score" value={`${DEMO_REPORT.compliance_score}`} suffix="/100" accent />
              <KPI label="Total emissions" value={`${totalEmissions.toFixed(1)}`} suffix="tCO₂e" />
              <KPI label="Tracked metrics" value={`${DEMO_METRICS.length}`} />
              <KPI label="Unread alerts" value={`${unread}`} alert={unread > 0} />
            </div>

            <div className="grid lg:grid-cols-3 gap-4 mb-6">
              <Pillar tag="E" name="Environmental" total={envTotal} suffix="" color="from-emerald-400/30 to-emerald-400/5" ring="ring-emerald-400/40" />
              <Pillar tag="S" name="Social (avg)" total={socialAvg} suffix="" color="from-cyan-400/30 to-cyan-400/5" ring="ring-cyan-400/40" />
              <Pillar tag="G" name="Governance" total={governanceTotal} suffix="" color="from-violet-400/30 to-violet-400/5" ring="ring-violet-400/40" />
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-white">Emissions by scope</h2>
                  <span className="text-xs text-slate-400">{totalEmissions.toFixed(1)} tCO₂e total</span>
                </div>
                <div className="space-y-4">
                  {scopeMetrics.map((m) => {
                    const pct = (m.value / totalEmissions) * 100;
                    return (
                      <div key={m.metric_name}>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-slate-300">{m.metric_name}</span>
                          <span className="text-white font-medium">
                            {m.value.toFixed(1)} <span className="text-slate-400">{m.unit}</span>
                          </span>
                        </div>
                        <div className="mt-2 h-2 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${
                              m.scope === "Scope 1" ? "bg-emerald-400" : m.scope === "Scope 2" ? "bg-cyan-400" : "bg-violet-400"
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
                <h2 className="text-lg font-semibold text-white mb-4">Latest sample alerts</h2>
                <ul className="space-y-3">
                  {notifications.slice(0, 3).map((n, i) => (
                    <li key={i} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                      <p className="text-sm font-medium text-white">{n.title}</p>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {tab === "report" && (
          <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-7">
            <div className="flex items-start justify-between flex-wrap gap-4 mb-5">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Sample report</p>
                <h2 className="text-2xl font-semibold text-white">{DEMO_REPORT.title}</h2>
                <p className="text-xs text-slate-400 mt-1">
                  {DEMO_REPORT.framework.toUpperCase()} · {DEMO_REPORT.reporting_period} · status:{" "}
                  <span className="capitalize">{DEMO_REPORT.status}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-500">Compliance score</p>
                <p className="text-4xl font-semibold text-cyan-300">{DEMO_REPORT.compliance_score}</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed mb-6">{DEMO_REPORT.summary}</p>

            <div className="grid sm:grid-cols-3 gap-4">
              <ReportBlock title="Scope 1+2 inventory" body="Direct and purchased-energy emissions are aggregated from store operations and grid intensity factors." />
              <ReportBlock title="Scope 3 estimate" body="Modelled from shipping distance, supplier categories, and product weight data." />
              <ReportBlock title="Double materiality" body="Materiality assessment combining financial impact and impact on people and planet." />
            </div>

            <div className="mt-7 p-4 rounded-xl bg-amber-400/5 border border-amber-400/20 text-amber-100 text-xs">
              This is a sample disclosure for demonstration. Connect your real Shopify Plus store to generate a binding,
              audit-ready report from your live transactions.
            </div>
          </div>
        )}

        {tab === "metrics" && (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DEMO_METRICS.map((m) => (
              <div key={m.metric_name} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="flex items-start justify-between gap-2">
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${catBg(m.category)}`}>
                    {m.category}
                  </span>
                  <span className={`text-xs ${trendColor(m.trend)}`}>{trendLabel(m.trend)}</span>
                </div>
                <h3 className="mt-3 text-base font-semibold text-white leading-snug">{m.metric_name}</h3>
                <p className="text-3xl font-semibold text-cyan-300 mt-3">
                  {m.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  <span className="text-sm text-slate-400 ml-1">{m.unit}</span>
                </p>
                {m.scope && (
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">{m.scope}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === "notifications" && (
          <div className="space-y-3">
            {notifications.map((n, i) => (
              <div
                key={i}
                className={`p-5 rounded-xl border transition flex items-start gap-4 ${
                  n.read_status === "unread"
                    ? "border-cyan-400/30 bg-cyan-400/[0.04]"
                    : "border-white/5 bg-white/[0.02]"
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 mt-2 rounded-full ${
                    n.read_status === "unread" ? "bg-cyan-400 pulse-ring" : "bg-slate-600"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-base font-semibold text-white">{n.title}</h3>
                    <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${notifBg(n.category)}`}>
                      {n.category.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">
                    {new Date(n.sent_at).toLocaleString()}
                  </p>
                </div>
                {n.read_status === "unread" && (
                  <button
                    onClick={() => markRead(i)}
                    className="text-xs text-cyan-300 hover:text-cyan-200 self-start"
                  >
                    Mark read
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer CTA */}
        <div className="mt-12 p-6 rounded-2xl glass flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-white">Like what you see?</h3>
            <p className="text-sm text-slate-400 mt-1">
              Create a free account to connect a real Shopify Plus store and generate live disclosures.
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/">
              <Button
                variant="outline"
                className="h-10 px-5 bg-transparent border-white/10 text-white hover:bg-white/5"
              >
                Exit demo
              </Button>
            </Link>
            <Link href="/register">
              <Button className="h-10 px-5 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                Create free account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value, suffix, accent, alert }: { label: string; value: string; suffix?: string; accent?: boolean; alert?: boolean }) {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        accent
          ? "border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-transparent"
          : alert
          ? "border-amber-400/30 bg-gradient-to-br from-amber-400/10 to-transparent"
          : "border-white/5 bg-white/[0.02]"
      }`}
    >
      <p className="text-[11px] uppercase tracking-[0.2em] text-slate-400 mb-2">{label}</p>
      <p className="text-3xl font-semibold text-white tracking-tight">
        {value}
        {suffix && <span className="text-base text-slate-400 ml-1">{suffix}</span>}
      </p>
    </div>
  );
}

function Pillar({ tag, name, total, suffix, color, ring }: { tag: string; name: string; total: number; suffix: string; color: string; ring: string }) {
  return (
    <div className={`relative p-6 rounded-2xl glass overflow-hidden ring-1 ${ring}`}>
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-b ${color} blur-2xl`} />
      <div className="relative flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-semibold text-white">
          {tag}
        </div>
        <div>
          <p className="text-sm text-slate-400">{name}</p>
          <p className="text-2xl font-semibold text-white">
            {total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            {suffix && <span className="text-sm text-slate-400 ml-1">{suffix}</span>}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, pill }: { label: string; value: string; pill?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm font-medium text-white mt-1">{value}</p>
      {pill && (
        <span className="mt-1 inline-block text-[10px] uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-400/10 text-emerald-300 border border-emerald-400/20">
          {pill}
        </span>
      )}
    </div>
  );
}

function ReportBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="p-4 rounded-xl bg-white/[0.03] border border-white/5">
      <p className="text-[10px] uppercase tracking-widest text-cyan-300 mb-2">{title}</p>
      <p className="text-sm text-slate-300 leading-relaxed">{body}</p>
    </div>
  );
}

function catBg(c: string) {
  if (c === "environmental") return "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20";
  if (c === "social") return "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20";
  return "bg-violet-400/10 text-violet-300 border border-violet-400/20";
}
function notifBg(c: string) {
  if (c === "report_ready") return "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20";
  if (c === "deadline") return "bg-amber-400/10 text-amber-300 border border-amber-400/20";
  return "bg-slate-400/10 text-slate-300 border border-slate-400/20";
}
function trendColor(t?: string) {
  if (t === "improving") return "text-emerald-300";
  if (t === "declining") return "text-red-300";
  return "text-slate-400";
}
function trendLabel(t?: string) {
  if (t === "improving") return "▲ Improving";
  if (t === "declining") return "▼ Declining";
  return "● Stable";
}
