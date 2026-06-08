import { NextRequest, NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";

interface PartnerRow {
  _id: string;
  partner_code?: string;
  status?: string;
}

interface TrackRequest {
  partner_code?: string;
  landing_path?: string;
}

const PARTNER_COOKIE = "ef_partner";
const VISITOR_COOKIE = "ef_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90; // 90 days

function genVisitorId() {
  // Lightweight UUID-ish identifier (no need for full RFC4122 — used for de-dupe + analytics only).
  const rand = () => Math.random().toString(36).slice(2, 10);
  return `v_${Date.now().toString(36)}_${rand()}${rand()}`;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  if (first) return first;
  return req.headers.get("x-real-ip") || "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as TrackRequest;
    const rawCode = typeof body.partner_code === "string" ? body.partner_code.trim().toUpperCase() : "";
    const landingPath = typeof body.landing_path === "string" ? body.landing_path.slice(0, 500) : "/";

    if (!rawCode) {
      return NextResponse.json({ ok: true, data: { tracked: false } });
    }

    console.log("[api/partner/track] attempt", { code: rawCode, landingPath });

    // Lookup partner. Silent no-op if unknown or paused.
    const lookup = await totalumSdk.crud.query("partner", {
      _filter: { partner_code: rawCode },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const partner = (lookup?.data as unknown as PartnerRow[] | undefined)?.[0];

    if (!partner?._id || (partner.status && partner.status !== "active")) {
      console.log("[api/partner/track] unknown or inactive partner — ignoring");
      return NextResponse.json({ ok: true, data: { tracked: false } });
    }

    // Visitor cookie — reuse if already set, otherwise mint one.
    const existingVisitor = req.cookies.get(VISITOR_COOKIE)?.value || "";
    const visitorId = existingVisitor || genVisitorId();

    const userAgent = (req.headers.get("user-agent") || "").slice(0, 500);
    const ipHash = await sha256Hex(clientIp(req));

    // De-dupe: if this visitor already has an open (non-converted) referral row for THIS partner,
    // don't insert another — reuse it so a single visitor only counts once until they convert.
    const existingRes = await totalumSdk.crud.query("partner_referral", {
      _filter: {
        visitor_id: visitorId,
        partner: partner._id,
        converted_to_waitlist: "no",
      },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const existing = (existingRes?.data as unknown as Array<{ _id: string }> | undefined)?.[0];

    if (!existing?._id) {
      await totalumSdk.crud.createRecord("partner_referral", {
        partner: partner._id,
        landing_path: landingPath,
        visitor_id: visitorId,
        ip_hash: ipHash,
        user_agent: userAgent,
        converted_to_waitlist: "no",
      });
      console.log("[api/partner/track] referral row created", { partner_code: rawCode, visitorId });
    } else {
      console.log("[api/partner/track] existing referral row reused", { id: existing._id });
    }

    const res = NextResponse.json({ ok: true, data: { tracked: true } });
    res.cookies.set(PARTNER_COOKIE, rawCode, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false, // readable so client-side has visibility; not sensitive
    });
    res.cookies.set(VISITOR_COOKIE, visitorId, {
      maxAge: COOKIE_MAX_AGE,
      path: "/",
      sameSite: "lax",
      httpOnly: false,
    });
    return res;
  } catch (err) {
    console.error("[api/partner/track] error", err);
    // Don't surface — tracker failures must never break the page.
    return NextResponse.json({ ok: true, data: { tracked: false } });
  }
}
