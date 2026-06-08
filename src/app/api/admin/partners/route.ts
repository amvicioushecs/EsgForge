import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminSession } from "@/lib/admin-auth";

interface PartnerRow {
  _id: string;
  name?: string;
  email?: string;
  partner_code?: string;
  commission_pct?: number;
  tier?: string;
  status?: string;
  createdAt?: string;
}

interface PartnerReferralLite {
  _id: string;
  partner?: string | { _id?: string };
  converted_to_waitlist?: string;
}

interface CreatePartnerRequest {
  name?: string;
  email?: string;
  partner_code?: string;
  commission_pct?: number;
  tier?: string;
}

const CODE_RE = /^[A-Z0-9_-]{3,32}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_TIERS = new Set(["referral", "certified", "strategic"]);

function deriveCodeFromName(name: string): string {
  const cleaned = name.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 24);
  // Fallback to random if the name doesn't yield enough chars.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "PARTNER";
  for (let i = 0; i < 6; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function unwrapPartnerId(p: PartnerReferralLite["partner"]): string | null {
  if (!p) return null;
  if (typeof p === "string") return p;
  if (typeof p === "object" && p._id) return p._id;
  return null;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const partnersRes = await totalumSdk.crud.query("partner", {
      _sort: { createdAt: "desc" },
      _limit: 500,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const partners = (partnersRes?.data as unknown as PartnerRow[] | undefined) ?? [];

    // Single bulk fetch of referrals to compute aggregates in memory (avoids N+1).
    const referralsRes = await totalumSdk.crud.query("partner_referral", {
      _limit: 100000,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const referrals = (referralsRes?.data as unknown as PartnerReferralLite[] | undefined) ?? [];

    const byPartner = new Map<string, { clicks: number; conversions: number }>();
    for (const r of referrals) {
      const pid = unwrapPartnerId(r.partner);
      if (!pid) continue;
      const slot = byPartner.get(pid) ?? { clicks: 0, conversions: 0 };
      slot.clicks += 1;
      if (r.converted_to_waitlist === "yes") slot.conversions += 1;
      byPartner.set(pid, slot);
    }

    const enriched = partners.map((p) => {
      const agg = byPartner.get(p._id) ?? { clicks: 0, conversions: 0 };
      const conv = agg.clicks > 0 ? (agg.conversions / agg.clicks) * 100 : 0;
      return {
        _id: p._id,
        name: p.name ?? "",
        email: p.email ?? "",
        partner_code: p.partner_code ?? "",
        commission_pct: typeof p.commission_pct === "number" ? p.commission_pct : 30,
        tier: p.tier ?? "referral",
        status: p.status ?? "active",
        created_at: p.createdAt ?? null,
        total_clicks: agg.clicks,
        total_signups: agg.conversions,
        conversion_rate: Math.round(conv * 10) / 10,
      };
    });

    return NextResponse.json({ ok: true, data: enriched });
  } catch (err) {
    console.error("[api/admin/partners GET] error", err);
    return NextResponse.json(
      { ok: false, error: "internal_error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as CreatePartnerRequest;
    const name = (body.name ?? "").trim();
    const email = (body.email ?? "").trim().toLowerCase();
    const codeIn = (body.partner_code ?? "").trim().toUpperCase();
    const commission = Number.isFinite(Number(body.commission_pct))
      ? Math.max(0, Math.min(100, Number(body.commission_pct)))
      : 30;
    const tier = VALID_TIERS.has((body.tier ?? "").trim().toLowerCase())
      ? (body.tier as string).trim().toLowerCase()
      : "referral";

    if (!name) {
      return NextResponse.json({ ok: false, error: "name_required" }, { status: 400 });
    }
    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "invalid_email" }, { status: 400 });
    }

    const finalCode = codeIn || deriveCodeFromName(name);
    if (!CODE_RE.test(finalCode)) {
      return NextResponse.json(
        { ok: false, error: "invalid_code", message: "Partner code must be 3–32 chars, A–Z / 0–9 / _ / - only." },
        { status: 400 },
      );
    }

    // Enforce unique partner_code.
    const dupeRes = await totalumSdk.crud.query("partner", {
      _filter: { partner_code: finalCode },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const dupe = (dupeRes?.data as unknown as Array<{ _id: string }> | undefined)?.[0];
    if (dupe?._id) {
      return NextResponse.json(
        { ok: false, error: "code_taken", message: "That partner code is already in use." },
        { status: 409 },
      );
    }

    const createRes = await totalumSdk.crud.createRecord("partner", {
      name,
      email,
      partner_code: finalCode,
      commission_pct: commission,
      tier,
      status: "active",
    });
    const created = createRes?.data as PartnerRow | undefined;
    if (!created?._id) {
      console.error("[api/admin/partners POST] create returned no _id", createRes);
      return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
    }

    console.log("[api/admin/partners POST] created", { code: finalCode, by: session.user.email });

    return NextResponse.json({
      ok: true,
      data: {
        _id: created._id,
        name: created.name ?? name,
        email: created.email ?? email,
        partner_code: created.partner_code ?? finalCode,
        commission_pct: created.commission_pct ?? commission,
        tier: created.tier ?? tier,
        status: created.status ?? "active",
        total_clicks: 0,
        total_signups: 0,
        conversion_rate: 0,
      },
    });
  } catch (err) {
    console.error("[api/admin/partners POST] error", err);
    return NextResponse.json({ ok: false, error: "internal_error" }, { status: 500 });
  }
}
