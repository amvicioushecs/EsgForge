"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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

const REVENUE_BANDS = [
  { value: "$1m-$10m", label: "$1M – $10M" },
  { value: "$10m-$50m", label: "$10M – $50M" },
  { value: "$50m-$100m", label: "$50M – $100M" },
  { value: "$100m-$500m", label: "$100M – $500M" },
  { value: "$500m+", label: "$500M+" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const FOUNDING_CAP = 100;

interface WaitlistConfirm {
  email: string;
  company_name: string | null;
  shopify_revenue_band: string | null;
  referral_code: string;
  position: number;
  referral_count: number;
  already_signed_up: boolean;
}

function WaitlistFormInner() {
  const searchParams = useSearchParams();
  const incomingRef = (searchParams.get("ref") || "").trim().toUpperCase();

  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [revenueBand, setRevenueBand] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<WaitlistConfirm | null>(null);
  const [copied, setCopied] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !EMAIL_RE.test(cleanEmail)) {
      setError("Please enter a valid email address.");
      return;
    }
    setSubmitting(true);
    const res = await api.post<WaitlistConfirm>("/api/waitlist", {
      email: cleanEmail,
      company_name: companyName.trim(),
      shopify_revenue_band: revenueBand === "none" ? "" : revenueBand,
      ref: incomingRef,
    });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      const code = (res.error as { code?: string; message?: string } | string | undefined);
      const msg =
        typeof code === "object" && code?.message
          ? code.message
          : typeof code === "string"
          ? code
          : "Couldn't reserve your spot. Please try again.";
      setError(msg);
      return;
    }
    setResult(res.data);
  };

  const referralUrl =
    result && typeof window !== "undefined"
      ? `${window.location.origin}/?ref=${result.referral_code}`
      : "";

  const onCopy = async () => {
    if (!referralUrl) return;
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("[waitlist] copy failed", err);
    }
  };

  if (result) {
    const isFounding = result.position <= FOUNDING_CAP;
    return (
      <div className="rounded-2xl glass p-7 sm:p-9 space-y-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">
              {result.already_signed_up ? "You're already on the list" : "You're in"}
            </p>
            <h3 className="text-2xl sm:text-3xl font-semibold text-white">
              You're <span className="text-cyan-300">#{result.position}</span> in line for founding pricing.
            </h3>
          </div>
          {isFounding && (
            <span className="px-3 py-1.5 rounded-full text-xs uppercase tracking-widest bg-emerald-400/15 text-emerald-200 border border-emerald-400/30">
              Founding member
            </span>
          )}
        </div>

        <div
          className={`p-4 rounded-xl text-sm leading-relaxed border ${
            isFounding
              ? "border-emerald-400/30 bg-emerald-400/[0.06] text-emerald-100"
              : "border-cyan-400/30 bg-cyan-400/[0.06] text-cyan-100"
          }`}
        >
          {isFounding
            ? "You're locked in for founding launch pricing if you're in the first 100 merchants."
            : `Founding launch pricing is locked in for the first ${FOUNDING_CAP} merchants. Refer Shopify Plus brands to skip ahead — every successful referral moves you up the line.`}
        </div>

        <div>
          <p className="text-sm font-medium text-white mb-2">Skip the line</p>
          <p className="text-sm text-slate-300/90 leading-relaxed">
            Every Shopify Plus merchant who joins with your link moves you up.
          </p>

          <div className="mt-4 flex items-stretch gap-2">
            <Input
              readOnly
              value={referralUrl}
              onClick={(e) => e.currentTarget.select()}
              className="flex-1 h-11 bg-white/5 border-white/10 text-white text-sm font-mono"
            />
            <Button
              type="button"
              onClick={onCopy}
              className="h-11 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold"
            >
              {copied ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-white/5 flex-wrap gap-3">
          <div className="text-sm text-slate-300">
            You've referred{" "}
            <span className="text-white font-semibold">{result.referral_count}</span>{" "}
            merchant{result.referral_count === 1 ? "" : "s"} so far.
          </div>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setEmail("");
              setCompanyName("");
              setRevenueBand("none");
            }}
            className="text-xs uppercase tracking-widest text-slate-400 hover:text-cyan-300 transition"
          >
            Sign up another email →
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="rounded-2xl glass p-7 sm:p-9 space-y-5">
      {incomingRef && (
        <div className="px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/30 text-cyan-200 text-xs">
          You were referred by a fellow merchant — you'll help them skip the line when you join.
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="waitlist-email" className="text-slate-300">
          Work email <span className="text-red-300">*</span>
        </Label>
        <Input
          id="waitlist-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@brand.com"
          required
          className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="waitlist-company" className="text-slate-300">
          Company name <span className="text-slate-500 text-xs">(optional)</span>
        </Label>
        <Input
          id="waitlist-company"
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          placeholder="Your Shopify Plus brand"
          className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-slate-300">
          Shopify revenue band <span className="text-slate-500 text-xs">(optional)</span>
        </Label>
        <Select value={revenueBand} onValueChange={setRevenueBand}>
          <SelectTrigger className="h-11 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Select a band" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Prefer not to say</SelectItem>
            {REVENUE_BANDS.map((b) => (
              <SelectItem key={b.value} value={b.value}>
                {b.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="w-full h-12 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
      >
        {submitting ? "Reserving your spot…" : "Reserve my spot"}
      </Button>

      <p className="text-[11px] text-slate-500 text-center">
        We'll only email you about founding-member pricing and launch updates.
      </p>
    </form>
  );
}

export function WaitlistForm() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl glass p-7 sm:p-9">
          <div className="h-11 bg-white/5 rounded-lg animate-pulse mb-4" />
          <div className="h-11 bg-white/5 rounded-lg animate-pulse mb-4" />
          <div className="h-11 bg-white/5 rounded-lg animate-pulse mb-4" />
          <div className="h-12 bg-white/10 rounded-lg animate-pulse" />
        </div>
      }
    >
      <WaitlistFormInner />
    </Suspense>
  );
}

/**
 * Hook helper kept for callers that want to read the incoming ref code
 * without rendering the form. (Not currently used; the form reads it directly.)
 */
export function useReferralCode() {
  const [code, setCode] = useState("");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("ref") || "";
    setCode(raw.trim().toUpperCase());
  }, []);
  return code;
}
