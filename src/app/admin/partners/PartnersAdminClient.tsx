"use client";

import { useEffect, useMemo, useState } from "react";
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
import { api } from "@/lib/api";

interface Partner {
  _id: string;
  name: string;
  email: string;
  partner_code: string;
  commission_pct: number;
  tier: string;
  status: string;
  total_clicks: number;
  total_signups: number;
  conversion_rate: number;
}

interface CreateForm {
  name: string;
  email: string;
  partner_code: string;
  commission_pct: string;
  tier: string;
}

const EMPTY_FORM: CreateForm = {
  name: "",
  email: "",
  partner_code: "",
  commission_pct: "30",
  tier: "referral",
};

const tierLabel: Record<string, string> = {
  referral: "Referral",
  certified: "Certified",
  strategic: "Strategic",
};

export function PartnersAdminClient({
  brandUrl,
  appUrl,
}: {
  brandUrl: string;
  appUrl: string;
}) {
  const [partners, setPartners] = useState<Partner[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [copiedFor, setCopiedFor] = useState<string | null>(null);
  const [rotating, setRotating] = useState<string | null>(null);
  const [rotateResult, setRotateResult] = useState<{
    partnerId: string;
    apiKey: string;
    expiresAt: string;
    graceHours: number;
  } | null>(null);
  const [rotateError, setRotateError] = useState("");

  const linkBase = useMemo(() => {
    // Prefer the configured brand URL (esgforge.xyz) so the link Hector hands to
    // an agency is the public canonical one. Fall back to the app URL otherwise.
    if (brandUrl) return brandUrl.replace(/\/$/, "");
    if (appUrl) return appUrl.replace(/\/$/, "");
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }, [brandUrl, appUrl]);

  async function load() {
    setLoadError("");
    const res = await api.get<Partner[]>("/api/admin/partners");
    if (!res.ok) {
      setLoadError("Couldn't load partners. Please refresh.");
      setPartners([]);
      return;
    }
    setPartners(res.data ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const code = form.partner_code.trim().toUpperCase();
    const commission_pct = Number(form.commission_pct);
    if (!name) {
      setFormError("Agency name is required.");
      return;
    }
    if (!email) {
      setFormError("Email is required.");
      return;
    }
    setSubmitting(true);
    const res = await api.post<Partner>("/api/admin/partners", {
      name,
      email,
      partner_code: code,
      commission_pct: Number.isFinite(commission_pct) ? commission_pct : 30,
      tier: form.tier,
    });
    setSubmitting(false);
    if (!res.ok) {
      const errPayload = res.error as { message?: string } | string | undefined;
      const msg =
        typeof errPayload === "object" && errPayload?.message
          ? errPayload.message
          : typeof errPayload === "string"
          ? errPayload
          : "Couldn't create partner. Please check the fields and try again.";
      setFormError(msg);
      return;
    }
    setForm(EMPTY_FORM);
    await load();
  }

  async function rotateKey(partnerId: string, partnerName: string) {
    const confirmed = window.confirm(
      `Rotate the API key for ${partnerName}?\n\nThe previous key will keep working for 24 hours so they can switch over without an outage.`,
    );
    if (!confirmed) return;
    setRotateError("");
    setRotateResult(null);
    setRotating(partnerId);
    const res = await api.post<{
      partner_id: string;
      api_key: string;
      api_key_expires_at: string;
      grace_period_hours: number;
    }>(`/api/admin/partners/${partnerId}/rotate-key`, {});
    setRotating(null);
    if (!res.ok || !res.data?.api_key) {
      const errPayload = res.error as { message?: string } | string | undefined;
      const msg =
        typeof errPayload === "object" && errPayload?.message
          ? errPayload.message
          : "Couldn't rotate the API key. Please try again.";
      setRotateError(msg);
      return;
    }
    setRotateResult({
      partnerId: res.data.partner_id,
      apiKey: res.data.api_key,
      expiresAt: res.data.api_key_expires_at,
      graceHours: res.data.grace_period_hours,
    });
  }

  async function copyLink(code: string) {
    const url = `${linkBase}/?partner=${encodeURIComponent(code)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedFor(code);
      setTimeout(() => setCopiedFor((cur) => (cur === code ? null : cur)), 1800);
    } catch (err) {
      console.error("[admin/partners] copy failed", err);
    }
  }

  return (
    <div className="grid lg:grid-cols-12 gap-8">
      {/* Left: create form */}
      <aside className="lg:col-span-4">
        <div className="rounded-2xl border border-white/10 bg-[#1e293b]/60 backdrop-blur p-6">
          <h2 className="text-lg font-semibold text-white">Add a founding partner</h2>
          <p className="mt-1 text-xs text-slate-400">
            Onboards an agency and generates their referral link.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            {formError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
                {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="p-name" className="text-slate-300 text-xs">
                Agency name <span className="text-red-300">*</span>
              </Label>
              <Input
                id="p-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="We Make Websites"
                className="h-10 bg-white/5 border-white/10 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/60"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-email" className="text-slate-300 text-xs">
                Contact email <span className="text-red-300">*</span>
              </Label>
              <Input
                id="p-email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="partners@agency.com"
                className="h-10 bg-white/5 border-white/10 text-white text-sm placeholder:text-slate-500 focus:border-cyan-400/60"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="p-code" className="text-slate-300 text-xs">
                Partner code <span className="text-slate-500">(optional)</span>
              </Label>
              <Input
                id="p-code"
                value={form.partner_code}
                onChange={(e) =>
                  setForm({ ...form, partner_code: e.target.value.toUpperCase() })
                }
                placeholder="WEMAKEWEBSITES"
                className="h-10 bg-white/5 border-white/10 text-white text-sm font-mono placeholder:text-slate-500 focus:border-cyan-400/60"
              />
              <p className="text-[11px] text-slate-500">
                Leave blank to auto-generate from the name. A–Z, 0–9, _ and - only.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="p-commission" className="text-slate-300 text-xs">
                  Commission %
                </Label>
                <Input
                  id="p-commission"
                  type="number"
                  min={0}
                  max={100}
                  value={form.commission_pct}
                  onChange={(e) =>
                    setForm({ ...form, commission_pct: e.target.value })
                  }
                  className="h-10 bg-white/5 border-white/10 text-white text-sm focus:border-cyan-400/60"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-xs">Tier</Label>
                <Select
                  value={form.tier}
                  onValueChange={(v) => setForm({ ...form, tier: v })}
                >
                  <SelectTrigger className="h-10 bg-white/5 border-white/10 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="referral">Referral</SelectItem>
                    <SelectItem value="certified">Certified</SelectItem>
                    <SelectItem value="strategic">Strategic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
            >
              {submitting ? "Adding partner…" : "Add founding partner"}
            </Button>
          </form>
        </div>
      </aside>

      {/* Right: partners list */}
      <section className="lg:col-span-8">
        <div className="flex items-end justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">All partners</h2>
          <p className="text-xs text-slate-500">
            {partners ? `${partners.length} partner${partners.length === 1 ? "" : "s"}` : ""}
          </p>
        </div>

        {loadError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
            {loadError}
          </div>
        )}

        {!partners && (
          <div className="rounded-2xl border border-white/10 bg-[#1e293b]/40 p-12 text-center text-slate-400 text-sm">
            Loading partners…
          </div>
        )}

        {partners && partners.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 bg-[#1e293b]/40 p-12 text-center">
            <div className="text-4xl mb-3">🤝</div>
            <p className="text-white font-semibold">No founding partners yet</p>
            <p className="text-sm text-slate-400 mt-1.5">
              Add your first agency using the form on the left to generate their referral link.
            </p>
          </div>
        )}

        {partners && partners.length > 0 && (
          <div className="space-y-3">
            {partners.map((p) => {
              const link = `${linkBase}/?partner=${encodeURIComponent(p.partner_code)}`;
              return (
                <div
                  key={p._id}
                  className="rounded-2xl border border-white/10 bg-[#1e293b]/60 p-5"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-white truncate">
                          {p.name}
                        </h3>
                        <span
                          className={`px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full border ${
                            p.status === "active"
                              ? "bg-emerald-400/10 text-emerald-300 border-emerald-400/30"
                              : "bg-slate-400/10 text-slate-300 border-slate-400/30"
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="px-2 py-0.5 text-[10px] uppercase tracking-widest rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30">
                          {tierLabel[p.tier] ?? p.tier}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-slate-400 truncate">{p.email}</div>
                    </div>

                    <div className="flex items-center gap-5 text-right">
                      <Metric label="Clicks" value={p.total_clicks} />
                      <Metric label="Signups" value={p.total_signups} />
                      <Metric label="Conv." value={`${p.conversion_rate}%`} />
                      <Metric label="Comm." value={`${p.commission_pct}%`} />
                    </div>
                  </div>

                  <div className="mt-4 flex items-stretch gap-2">
                    <Input
                      readOnly
                      value={link}
                      onClick={(e) => e.currentTarget.select()}
                      className="flex-1 h-10 bg-white/5 border-white/10 text-white text-xs font-mono"
                    />
                    <Button
                      type="button"
                      onClick={() => copyLink(p.partner_code)}
                      className="h-10 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold text-xs"
                    >
                      {copiedFor === p.partner_code ? "Copied!" : "Copy link"}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => rotateKey(p._id, p.name)}
                      disabled={rotating === p._id}
                      className="h-10 px-4 bg-transparent border border-amber-400/40 hover:bg-amber-400/10 text-amber-200 font-semibold text-xs disabled:opacity-50"
                    >
                      {rotating === p._id ? "Rotating…" : "Rotate API key"}
                    </Button>
                  </div>

                  {rotateResult?.partnerId === p._id && (
                    <div className="mt-4 p-4 rounded-xl bg-amber-400/5 border border-amber-400/30">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-300 text-xs font-semibold uppercase tracking-widest">
                          New API key — copy now, shown once
                        </span>
                      </div>
                      <div className="mt-3 flex items-stretch gap-2">
                        <Input
                          readOnly
                          value={rotateResult.apiKey}
                          onClick={(e) => e.currentTarget.select()}
                          className="flex-1 h-10 bg-white/5 border-white/10 text-white text-xs font-mono"
                        />
                        <Button
                          type="button"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(rotateResult.apiKey);
                            } catch (err) {
                              console.error("[admin/partners] copy api key failed", err);
                            }
                          }}
                          className="h-10 px-4 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs"
                        >
                          Copy key
                        </Button>
                        <Button
                          type="button"
                          onClick={() => setRotateResult(null)}
                          className="h-10 px-3 bg-transparent border border-white/15 hover:bg-white/5 text-slate-300 text-xs"
                        >
                          Dismiss
                        </Button>
                      </div>
                      <p className="mt-2 text-[11px] text-amber-200/80">
                        {rotateResult.graceHours > 0
                          ? `The previous key will keep working for ${rotateResult.graceHours} hours.`
                          : "No previous key — this is the partner's first API key."}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {rotateError && (
          <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">
            {rotateError}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="text-right">
      <div className="text-[10px] uppercase tracking-widest text-slate-500">{label}</div>
      <div className="text-sm font-semibold text-white tabular-nums">{value}</div>
    </div>
  );
}
