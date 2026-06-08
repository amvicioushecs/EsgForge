"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/common/DashboardShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";

interface Overview {
  stores_count: number;
  reports_count: number;
  metrics_count: number;
  unread_notifications: number;
  avg_compliance_score: number;
  env_total: number;
  social_total: number;
  governance_total: number;
  recent_reports: any[];
  recent_notifications: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await api.get<Overview>("/api/overview");
    if (res.ok && res.data) {
      setData(res.data);
    } else {
      setError(typeof res.error === "string" ? res.error : "Could not load dashboard.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 12000);
    return () => clearInterval(t);
  }, []);

  return (
    <DashboardShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Overview</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Compliance at a glance</h1>
          <p className="mt-2 text-slate-400 text-sm">Live indicators across your connected Shopify Plus stores.</p>
        </div>
        <Link href="/reports">
          <Button className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">Generate report</Button>
        </Link>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-red-500/30 bg-red-500/10 text-red-200 text-sm">
          {error}
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPI label="Compliance score" value={loading ? "…" : `${data?.avg_compliance_score ?? 0}`} suffix="/100" accent />
        <KPI label="Active stores" value={loading ? "…" : `${data?.stores_count ?? 0}`} />
        <KPI label="Reports" value={loading ? "…" : `${data?.reports_count ?? 0}`} />
        <KPI label="Unread alerts" value={loading ? "…" : `${data?.unread_notifications ?? 0}`} alert={!!data?.unread_notifications} />
      </div>

      {/* ESG Pillars */}
      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <Pillar
          tag="E"
          name="Environmental"
          total={data?.env_total || 0}
          color="from-emerald-400/30 to-emerald-400/5"
          ring="ring-emerald-400/40"
        />
        <Pillar
          tag="S"
          name="Social"
          total={data?.social_total || 0}
          color="from-cyan-400/30 to-cyan-400/5"
          ring="ring-cyan-400/40"
        />
        <Pillar
          tag="G"
          name="Governance"
          total={data?.governance_total || 0}
          color="from-violet-400/30 to-violet-400/5"
          ring="ring-violet-400/40"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent reports */}
        <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Recent reports</h2>
            <Link href="/reports" className="text-sm text-cyan-300 hover:text-cyan-200">View all →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
            </div>
          ) : (data?.recent_reports?.length || 0) === 0 ? (
            <EmptyState label="No reports yet" ctaHref="/reports" ctaLabel="Generate your first report" />
          ) : (
            <div className="divide-y divide-white/5">
              {data!.recent_reports.map((r) => (
                <div key={r._id} className="py-4 flex items-center gap-4">
                  <span className={`w-1.5 h-10 rounded-full ${statusColor(r.status)}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{r.title}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {String(r.framework || "").toUpperCase()} · {r.reporting_period}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-cyan-300">{r.compliance_score ?? "—"}</p>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500">{r.status}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-white">Latest alerts</h2>
            <Link href="/notifications" className="text-sm text-cyan-300 hover:text-cyan-200">All →</Link>
          </div>
          {loading ? (
            <div className="space-y-3">
              <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
              <div className="h-14 bg-white/5 rounded-lg animate-pulse" />
            </div>
          ) : (data?.recent_notifications?.length || 0) === 0 ? (
            <div className="text-sm text-slate-400 py-8 text-center">All caught up.</div>
          ) : (
            <ul className="space-y-3">
              {data!.recent_notifications.map((n) => (
                <li key={n._id} className="p-3 rounded-lg border border-white/5 bg-white/[0.02]">
                  <p className="text-sm font-medium text-white">{n.title}</p>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{n.message}</p>
                  <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">
                    {String(n.category || "").replace("_", " ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </DashboardShell>
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

function Pillar({ tag, name, total, color, ring }: { tag: string; name: string; total: number; color: string; ring: string }) {
  return (
    <div className={`relative p-6 rounded-2xl glass overflow-hidden ring-1 ${ring}`}>
      <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full bg-gradient-to-b ${color} blur-2xl`} />
      <div className="relative flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl font-semibold text-white">
          {tag}
        </div>
        <div>
          <p className="text-sm text-slate-400">{name}</p>
          <p className="text-2xl font-semibold text-white">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-0.5">Total tracked value</p>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ label, ctaHref, ctaLabel }: { label: string; ctaHref: string; ctaLabel: string }) {
  return (
    <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
      <p className="text-sm text-slate-400 mb-4">{label}</p>
      <Link href={ctaHref}>
        <Button variant="outline" className="bg-white/5 border-white/10 text-white hover:bg-white/10">
          {ctaLabel}
        </Button>
      </Link>
    </div>
  );
}

function statusColor(s: string) {
  if (s === "submitted") return "bg-emerald-400";
  if (s === "ready") return "bg-cyan-400";
  if (s === "processing") return "bg-amber-400";
  return "bg-slate-500";
}
