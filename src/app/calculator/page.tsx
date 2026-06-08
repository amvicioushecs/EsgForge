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

type ParamMode = "energy" | "money" | "weight" | "distance" | "volume";

interface ModeConfig {
  valueKey: string;
  unitKey: string;
  defaultUnit: string;
  units: string[];
  label: string;
  placeholder: string;
}

const MODES: Record<ParamMode, ModeConfig> = {
  energy: {
    valueKey: "energy",
    unitKey: "energy_unit",
    defaultUnit: "kWh",
    units: ["kWh", "MWh", "GJ", "MJ", "TJ", "BTU"],
    label: "Energy",
    placeholder: "1000",
  },
  money: {
    valueKey: "money",
    unitKey: "money_unit",
    defaultUnit: "usd",
    units: ["usd", "eur", "gbp", "cad", "aud", "jpy"],
    label: "Spend",
    placeholder: "5000",
  },
  weight: {
    valueKey: "weight",
    unitKey: "weight_unit",
    defaultUnit: "kg",
    units: ["kg", "g", "t", "lb"],
    label: "Weight",
    placeholder: "500",
  },
  distance: {
    valueKey: "distance",
    unitKey: "distance_unit",
    defaultUnit: "km",
    units: ["km", "mi", "m", "ft"],
    label: "Distance",
    placeholder: "120",
  },
  volume: {
    valueKey: "volume",
    unitKey: "volume_unit",
    defaultUnit: "l",
    units: ["l", "ml", "m3", "gal"],
    label: "Volume",
    placeholder: "50",
  },
};

interface EstimateResponse {
  ok: boolean;
  co2e?: number;
  co2e_unit?: string;
  emission_factor?: {
    name?: string;
    activity_id?: string;
    region?: string;
    source?: string;
    year?: number;
  };
  activity_data?: {
    activity_value?: number;
    activity_unit?: string;
  };
  code?: string;
  message?: string;
  valid_values?: string[];
  retry_after?: number | null;
}

interface RecentMetric {
  _id: string;
  metric_name: string;
  value: number;
  unit?: string;
  recorded_at?: string;
  activity_id?: string;
}

function fmtNumber(n: number) {
  if (!Number.isFinite(n)) return "0";
  if (Math.abs(n) >= 1000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (Math.abs(n) >= 1) return n.toLocaleString(undefined, { maximumFractionDigits: 3 });
  return n.toLocaleString(undefined, { maximumFractionDigits: 5 });
}

export default function CalculatorPage() {
  const [activityId, setActivityId] = useState("electricity-supply_grid-source_residual_mix");
  const [region, setRegion] = useState("");
  const [mode, setMode] = useState<ParamMode>("energy");
  const [paramValue, setParamValue] = useState("");
  const [paramUnit, setParamUnit] = useState<string>(MODES.energy.defaultUnit);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<EstimateResponse | null>(null);
  const [errorResp, setErrorResp] = useState<EstimateResponse | null>(null);

  const [recent, setRecent] = useState<RecentMetric[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const onModeChange = (next: ParamMode) => {
    setMode(next);
    setParamUnit(MODES[next].defaultUnit);
    setErrorResp(null);
  };

  const loadRecent = async () => {
    setLoadingRecent(true);
    const res = await api.get<RecentMetric[]>("/api/metrics");
    if (res.ok && res.data) {
      const onlyClimatiq = res.data.filter((m) => !!m.activity_id);
      setRecent(onlyClimatiq.slice(0, 6));
    }
    setLoadingRecent(false);
  };

  useEffect(() => {
    loadRecent();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorResp(null);
    setResult(null);

    const trimmedId = activityId.trim();
    if (!trimmedId) {
      setErrorResp({ ok: false, code: "bad_request", message: "Activity ID is required." });
      return;
    }
    const num = Number(paramValue);
    if (!Number.isFinite(num) || num <= 0) {
      setErrorResp({ ok: false, code: "bad_request", message: "Enter a positive value." });
      return;
    }

    const cfg = MODES[mode];
    const parameters: Record<string, unknown> = {
      [cfg.valueKey]: num,
      [cfg.unitKey]: paramUnit,
    };

    const emission_factor: Record<string, unknown> = { activity_id: trimmedId };
    if (region.trim()) emission_factor.region = region.trim();

    setSubmitting(true);
    const res = await api.post<unknown>("/api/emissions/estimate", { emission_factor, parameters });
    setSubmitting(false);

    const body = res as unknown as EstimateResponse;
    if (body && body.ok) {
      setResult(body);
      loadRecent();
    } else {
      setErrorResp(body || { ok: false, code: "upstream_error", message: "Could not run estimate." });
    }
  };

  const cfg = MODES[mode];
  const invalidUnitValues = errorResp?.code === "invalid_unit" ? errorResp.valid_values || [] : [];

  return (
    <DashboardShell>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Calculator</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white">Emissions estimator</h1>
        <p className="mt-2 text-slate-400 text-sm max-w-2xl">
          Run an on-demand CO₂e estimate against the Climatiq emissions factor library. Results are saved to your metrics.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSubmit} className="p-6 rounded-2xl glass space-y-5">
            <div className="space-y-2">
              <Label className="text-slate-300">Activity ID</Label>
              <Input
                value={activityId}
                onChange={(e) => setActivityId(e.target.value)}
                placeholder="electricity-supply_grid-source_residual_mix"
                className="bg-white/5 border-white/10 text-white font-mono text-sm"
              />
              <p className="text-xs text-slate-500">
                Browse activities in the Climatiq data explorer and paste the exact ID.
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Region (optional)</Label>
                <Input
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="US, GB, DE, FR…"
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Parameter type</Label>
                <Select value={mode} onValueChange={(v) => onModeChange(v as ParamMode)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MODES) as ParamMode[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {MODES[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">{cfg.label} value</Label>
                <Input
                  type="number"
                  step="any"
                  value={paramValue}
                  onChange={(e) => setParamValue(e.target.value)}
                  placeholder={cfg.placeholder}
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Unit</Label>
                <Select value={paramUnit} onValueChange={(v) => setParamUnit(v)}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {cfg.units.map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
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
                {submitting ? "Estimating…" : "Run estimate"}
              </Button>
            </div>
          </form>

          {errorResp && !errorResp.ok && (
            <div className="p-5 rounded-2xl border border-red-500/30 bg-red-500/10 text-red-100">
              <div className="flex items-start gap-3">
                <span className="text-xl leading-none">⚠</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{errorResp.message || "Something went wrong."}</p>

                  {errorResp.code === "invalid_unit" && invalidUnitValues.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-red-200/80 mb-2">Try one of these supported units:</p>
                      <div className="flex flex-wrap gap-2">
                        {invalidUnitValues.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => {
                              setParamUnit(v);
                              setErrorResp(null);
                            }}
                            className="text-xs px-2.5 py-1 rounded-full border border-white/15 bg-white/5 hover:bg-cyan-400/15 hover:border-cyan-400/40 text-white transition"
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {errorResp.code === "rate_limited" && (
                    <p className="mt-2 text-xs text-red-200/80">
                      We&apos;re hitting the upstream rate limit. Please retry in a few minutes.
                    </p>
                  )}

                  {errorResp.code === "service_unavailable" && (
                    <p className="mt-2 text-xs text-red-200/80">
                      The emissions service is temporarily down{errorResp.retry_after ? ` — try again in ~${errorResp.retry_after}s.` : "."}
                    </p>
                  )}

                  {errorResp.code === "quota_exceeded" && (
                    <div className="mt-3">
                      <p className="text-xs text-red-200/80 mb-2">
                        Your monthly emissions quota is full.
                      </p>
                      <a
                        href="/profile"
                        className="inline-flex items-center text-xs font-medium px-3 py-1.5 rounded-md bg-cyan-400 text-slate-950 hover:bg-cyan-300 transition"
                      >
                        Upgrade plan →
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {result && result.ok && (
            <div className="p-7 rounded-2xl relative overflow-hidden border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 via-white/[0.03] to-transparent">
              <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-cyan-400/15 blur-3xl pointer-events-none" />
              <div className="relative">
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-3">Estimate</p>
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-5xl sm:text-6xl font-semibold text-white tracking-tight">
                    {fmtNumber(result.co2e || 0)}
                  </span>
                  <span className="text-xl text-cyan-200 font-medium">{result.co2e_unit || "kg"} CO₂e</span>
                </div>

                {result.emission_factor?.name && (
                  <p className="mt-4 text-sm text-slate-300">
                    Matched factor: <span className="text-white font-medium">{result.emission_factor.name}</span>
                  </p>
                )}

                <div className="mt-5 grid sm:grid-cols-3 gap-4">
                  {result.emission_factor?.region && (
                    <KV label="Region" value={result.emission_factor.region} />
                  )}
                  {result.emission_factor?.source && (
                    <KV label="Source" value={result.emission_factor.source} />
                  )}
                  {result.emission_factor?.year && (
                    <KV label="Factor year" value={String(result.emission_factor.year)} />
                  )}
                  {result.activity_data?.activity_value !== undefined && (
                    <KV
                      label="Activity"
                      value={`${fmtNumber(result.activity_data.activity_value)} ${result.activity_data.activity_unit || ""}`.trim()}
                    />
                  )}
                </div>

                <p className="mt-5 text-xs text-slate-400">
                  Saved to your metrics.
                </p>
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Recent estimates</h3>
            {loadingRecent ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 rounded-lg bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="text-sm text-slate-500">Your previous estimates will show up here.</p>
            ) : (
              <ul className="space-y-2">
                {recent.map((m) => (
                  <li key={m._id} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white truncate">{m.metric_name}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">{m.activity_id}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm text-cyan-200 font-semibold whitespace-nowrap">
                          {fmtNumber(m.value)} <span className="text-xs text-slate-400">{m.unit || "kg"}</span>
                        </p>
                        {m.recorded_at && (
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(m.recorded_at).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-3">Try these activities</h3>
            <ul className="space-y-2">
              {[
                {
                  id: "electricity-supply_grid-source_residual_mix",
                  hint: "Grid electricity (energy + kWh)",
                },
                {
                  id: "consumer_goods-type_clothing",
                  hint: "Spend-based clothing (money + usd)",
                },
                {
                  id: "passenger_vehicle-vehicle_type_car-fuel_source_na",
                  hint: "Car travel (distance + km)",
                },
              ].map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => setActivityId(s.id)}
                    className="w-full text-left p-2.5 rounded-lg bg-white/[0.02] hover:bg-cyan-400/10 border border-white/5 hover:border-cyan-400/30 transition"
                  >
                    <p className="font-mono text-[11px] text-cyan-200 truncate">{s.id}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{s.hint}</p>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </DashboardShell>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500">{label}</p>
      <p className="text-sm text-white mt-1 break-words">{value}</p>
    </div>
  );
}
