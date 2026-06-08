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

interface Report {
  _id: string;
  title: string;
  framework: string;
  reporting_period: string;
  status: string;
  compliance_score: number;
  summary: string;
  generated_at?: string;
}

interface Store {
  _id: string;
  store_name: string;
}

const FRAMEWORKS = [
  { value: "csrd", label: "CSRD (EU)" },
  { value: "sec", label: "SEC Climate Disclosure (US)" },
  { value: "gri", label: "GRI Standards" },
  { value: "tcfd", label: "TCFD" },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", framework: "csrd", reporting_period: "", store_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Report | null>(null);

  const load = async () => {
    setLoading(true);
    const [r, s] = await Promise.all([api.get<Report[]>("/api/reports"), api.get<Store[]>("/api/stores")]);
    if (r.ok && r.data) setReports(r.data);
    if (s.ok && s.data) setStores(s.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.title || !form.reporting_period) {
      setError("Title and reporting period are required.");
      return;
    }
    setSubmitting(true);
    const res = await api.post("/api/reports", form);
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof res.error === "string" ? res.error : "Could not generate report.");
      return;
    }
    setForm({ title: "", framework: "csrd", reporting_period: "", store_id: "" });
    setShowForm(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Delete this report?")) return;
    const res = await api.delete(`/api/reports/${id}`);
    if (res.ok) {
      setSelected(null);
      load();
    }
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Reports</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Audit-ready disclosures</h1>
          <p className="mt-2 text-slate-400 text-sm">Generate, review, and archive your ESG reports.</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
        >
          {showForm ? "Cancel" : "+ Generate report"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-8 p-6 rounded-2xl glass space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Report title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="CSRD Annual Disclosure 2026"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Reporting period</Label>
              <Input
                value={form.reporting_period}
                onChange={(e) => setForm({ ...form, reporting_period: e.target.value })}
                placeholder="FY 2026 or Q2 2026"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Framework</Label>
              <Select value={form.framework} onValueChange={(v) => setForm({ ...form, framework: v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FRAMEWORKS.map((f) => (
                    <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Store (optional)</Label>
              <Select value={form.store_id || "none"} onValueChange={(v) => setForm({ ...form, store_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="All stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All stores</SelectItem>
                  {stores.map((s) => (
                    <SelectItem key={s._id} value={s._id}>{s.store_name}</SelectItem>
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
              {submitting ? "Generating…" : "Generate report"}
            </Button>
          </div>
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <p className="text-slate-400 mb-4">No reports yet.</p>
              <Button
                onClick={() => setShowForm(true)}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
              >
                Generate your first report
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <button
                  key={r._id}
                  onClick={() => setSelected(r)}
                  className={`w-full text-left p-5 rounded-xl border transition ${
                    selected?._id === r._id
                      ? "border-cyan-400/40 bg-cyan-400/5"
                      : "border-white/5 bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <span className={`w-1.5 h-12 rounded-full ${statusColor(r.status)}`} />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-semibold text-white truncate">{r.title}</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        {String(r.framework || "").toUpperCase()} · {r.reporting_period}
                      </p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">{r.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold text-cyan-300">{r.compliance_score ?? "—"}</p>
                      <p className="text-[10px] uppercase tracking-widest text-slate-500">score</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 h-fit sticky top-24">
          {selected ? (
            <>
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-3">Report detail</p>
              <h2 className="text-xl font-semibold text-white">{selected.title}</h2>
              <p className="text-xs text-slate-400 mt-1">
                {String(selected.framework || "").toUpperCase()} · {selected.reporting_period}
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Score</p>
                  <p className="text-xl font-semibold text-cyan-300">{selected.compliance_score ?? "—"}</p>
                </div>
                <div className="p-3 rounded-lg bg-white/[0.04] border border-white/5">
                  <p className="text-[10px] uppercase tracking-widest text-slate-500">Status</p>
                  <p className="text-sm font-medium text-white capitalize">{selected.status}</p>
                </div>
              </div>
              <div className="mt-5">
                <p className="text-xs uppercase tracking-widest text-slate-500 mb-2">Summary</p>
                <p className="text-sm text-slate-300 leading-relaxed">{selected.summary}</p>
              </div>
              <div className="mt-6 flex gap-2">
                <Button
                  onClick={() => alert("PDF export is part of paid plans. Demo only.")}
                  className="flex-1 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold h-9 text-sm"
                >
                  Export PDF
                </Button>
                <Button
                  onClick={() => onDelete(selected._id)}
                  variant="ghost"
                  className="text-red-300 hover:bg-red-500/10 h-9 text-sm"
                >
                  Delete
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-slate-400 py-12 text-center">
              Select a report to view its details.
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}

function statusColor(s: string) {
  if (s === "submitted") return "bg-emerald-400";
  if (s === "ready") return "bg-cyan-400";
  if (s === "processing") return "bg-amber-400";
  return "bg-slate-500";
}
