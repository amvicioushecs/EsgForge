"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Metric {
  _id: string;
  metric_name: string;
  category: string;
  value: number;
  unit?: string;
  period?: string;
  trend?: string;
  recorded_at?: string;
}

const CATEGORIES = [
  { value: "environmental", label: "Environmental" },
  { value: "social", label: "Social" },
  { value: "governance", label: "Governance" },
];
const TRENDS = [
  { value: "improving", label: "Improving" },
  { value: "stable", label: "Stable" },
  { value: "declining", label: "Declining" },
];

export default function MetricsPage() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [form, setForm] = useState({
    metric_name: "",
    category: "environmental",
    value: "",
    unit: "",
    period: "",
    trend: "stable",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await api.get<Metric[]>("/api/metrics");
    if (res.ok && res.data) setMetrics(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.metric_name || form.value === "") {
      setError("Metric name and value are required.");
      return;
    }
    setSubmitting(true);
    const res = await api.post("/api/metrics", form);
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof res.error === "string" ? res.error : "Could not save metric.");
      return;
    }
    setForm({ metric_name: "", category: "environmental", value: "", unit: "", period: "", trend: "stable" });
    setShowForm(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this metric?")) return;
    const res = await api.delete(`/api/metrics/${id}`);
    if (res.ok) load();
  };

  const visible = filter === "all" ? metrics : metrics.filter((m) => m.category === filter);

  return (
    <DashboardShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Metrics</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">ESG indicators</h1>
          <p className="mt-2 text-slate-400 text-sm">Tracked across environmental, social and governance pillars.</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
        >
          {showForm ? "Cancel" : "+ Add metric"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-8 p-6 rounded-2xl glass space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Metric name</Label>
              <Input
                value={form.metric_name}
                onChange={(e) => setForm({ ...form, metric_name: e.target.value })}
                placeholder="Scope 1 + 2 emissions"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Value</Label>
              <Input
                type="number"
                step="any"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                placeholder="162.4"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Unit</Label>
              <Input
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="tCO2e, %, count"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Period</Label>
              <Input
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
                placeholder="Q2 2026"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Trend</Label>
              <Select value={form.trend} onValueChange={(v) => setForm({ ...form, trend: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRENDS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
            >
              {submitting ? "Saving…" : "Save metric"}
            </Button>
          </div>
        </form>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        {[{ value: "all", label: "All" }, ...CATEGORIES].map((c) => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition border ${
              filter === c.value
                ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-200"
                : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400 mb-4">No metrics in this view.</p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
          >
            Add your first metric
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((m) => (
            <div key={m._id} className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${catBg(m.category)}`}>
                  {m.category}
                </span>
                <span className={`text-xs ${trendColor(m.trend)}`}>{trendLabel(m.trend)}</span>
              </div>
              <h3 className="mt-3 text-base font-semibold text-white leading-snug">{m.metric_name}</h3>
              <p className="text-3xl font-semibold text-cyan-300 mt-3">
                {Number(m.value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                {m.unit && <span className="text-sm text-slate-400 ml-1">{m.unit}</span>}
              </p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">{m.period || "—"}</p>
              <Button
                onClick={() => onDelete(m._id)}
                variant="ghost"
                className="mt-4 text-red-300 hover:bg-red-500/10 h-8 text-xs"
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function catBg(c: string) {
  if (c === "environmental") return "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20";
  if (c === "social") return "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20";
  return "bg-violet-400/10 text-violet-300 border border-violet-400/20";
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
