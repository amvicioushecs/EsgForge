"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Store {
  _id: string;
  store_name: string;
  shopify_domain: string;
  annual_revenue_usd: number;
  monthly_orders: number;
  primary_region: string;
  connection_status: string;
  last_synced_at?: string;
}

export default function StoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    store_name: "",
    shopify_domain: "",
    annual_revenue_usd: "",
    monthly_orders: "",
    primary_region: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    const res = await api.get<Store[]>("/api/stores");
    if (res.ok && res.data) setStores(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.store_name || !form.shopify_domain) {
      setError("Store name and Shopify domain are required.");
      return;
    }
    setSubmitting(true);
    const res = await api.post("/api/stores", {
      store_name: form.store_name,
      shopify_domain: form.shopify_domain,
      annual_revenue_usd: Number(form.annual_revenue_usd) || 0,
      monthly_orders: Number(form.monthly_orders) || 0,
      primary_region: form.primary_region,
    });
    setSubmitting(false);
    if (!res.ok) {
      setError(typeof res.error === "string" ? res.error : "Could not add store.");
      return;
    }
    setForm({ store_name: "", shopify_domain: "", annual_revenue_usd: "", monthly_orders: "", primary_region: "" });
    setShowForm(false);
    load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Disconnect this store and delete its data?")) return;
    const res = await api.delete(`/api/stores/${id}`);
    if (res.ok) load();
  };

  return (
    <DashboardShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Stores</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Connected Shopify Plus stores</h1>
          <p className="mt-2 text-slate-400 text-sm">Manage the stores Verdant pulls ESG data from.</p>
        </div>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
        >
          {showForm ? "Cancel" : "+ Connect store"}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={onSubmit} className="mb-8 p-6 rounded-2xl glass space-y-4">
          {error && <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Store name</Label>
              <Input
                value={form.store_name}
                onChange={(e) => setForm({ ...form, store_name: e.target.value })}
                placeholder="Hearth & Loom"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Shopify domain</Label>
              <Input
                value={form.shopify_domain}
                onChange={(e) => setForm({ ...form, shopify_domain: e.target.value })}
                placeholder="brand.myshopify.com"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Annual revenue (USD)</Label>
              <Input
                type="number"
                value={form.annual_revenue_usd}
                onChange={(e) => setForm({ ...form, annual_revenue_usd: e.target.value })}
                placeholder="8400000"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Monthly orders</Label>
              <Input
                type="number"
                value={form.monthly_orders}
                onChange={(e) => setForm({ ...form, monthly_orders: e.target.value })}
                placeholder="5240"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-slate-300">Primary region</Label>
              <Input
                value={form.primary_region}
                onChange={(e) => setForm({ ...form, primary_region: e.target.value })}
                placeholder="United States"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={submitting}
              className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
            >
              {submitting ? "Connecting…" : "Connect store"}
            </Button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400 mb-4">No stores connected yet.</p>
          <Button
            onClick={() => setShowForm(true)}
            className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
          >
            Connect your first store
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {stores.map((s) => (
            <div key={s._id} className="p-6 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">{s.store_name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5 truncate">{s.shopify_domain}</p>
                </div>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded ${statusBg(s.connection_status)}`}>
                  {s.connection_status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Stat label="Annual revenue" value={`$${(s.annual_revenue_usd || 0).toLocaleString()}`} />
                <Stat label="Monthly orders" value={(s.monthly_orders || 0).toLocaleString()} />
                <Stat label="Region" value={s.primary_region || "—"} />
                <Stat label="Last sync" value={s.last_synced_at ? new Date(s.last_synced_at).toLocaleDateString() : "—"} />
              </div>
              <Button
                onClick={() => onDelete(s._id)}
                variant="ghost"
                className="text-red-300 hover:bg-red-500/10 h-9 text-sm"
              >
                Disconnect
              </Button>
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1">{value}</p>
    </div>
  );
}

function statusBg(s: string) {
  if (s === "connected") return "bg-emerald-400/10 text-emerald-300 border border-emerald-400/20";
  if (s === "syncing") return "bg-amber-400/10 text-amber-300 border border-amber-400/20";
  return "bg-red-400/10 text-red-300 border border-red-400/20";
}
