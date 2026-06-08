import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";

interface WaitlistRow {
  _id: string;
  email: string;
  company_name?: string | null;
  shopify_revenue_band?: string | null;
  referral_code: string;
  referred_by?: string | null;
  position: number;
  referral_count: number;
  createdAt?: string;
}

interface SignupRequest {
  email?: string;
  company_name?: string;
  shopify_revenue_band?: string;
  ref?: string;
}

const VALID_BANDS = new Set(["$1m-$10m", "$10m-$50m", "$50m-$100m", "$100m-$500m", "$500m+"]);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function genReferralCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function generateUniqueCode(maxAttempts = 6): Promise<string> {
  for (let i = 0; i < maxAttempts; i++) {
    const candidate = genReferralCode();
    const exists = await totalumSdk.crud.query("waitlist", {
      _filter: { referral_code: candidate },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    if (!Array.isArray(exists?.data) || exists.data.length === 0) return candidate;
  }
  return `${genReferralCode()}${Date.now().toString(36).slice(-2).toUpperCase()}`;
}

function publicRow(row: WaitlistRow) {
  return {
    email: row.email,
    company_name: row.company_name ?? null,
    shopify_revenue_band: row.shopify_revenue_band ?? null,
    referral_code: row.referral_code,
    position: row.position,
    referral_count: row.referral_count || 0,
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as SignupRequest;
    const rawEmail = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const company_name = typeof body.company_name === "string" ? body.company_name.trim() : "";
    const revenueBand = typeof body.shopify_revenue_band === "string"
      ? body.shopify_revenue_band.trim().toLowerCase()
      : "";
    const refRaw = typeof body.ref === "string" ? body.ref.trim().toUpperCase() : "";

    if (!rawEmail || !EMAIL_RE.test(rawEmail)) {
      return NextResponse.json(
        { ok: false, code: "invalid_email", message: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const shopify_revenue_band = revenueBand && VALID_BANDS.has(revenueBand) ? revenueBand : null;

    console.log("[api/waitlist] signup attempt", { email: rawEmail, hasRef: !!refRaw });

    // Existing signup → return their current row instead of erroring.
    const existingRes = await totalumSdk.crud.query("waitlist", {
      _filter: { email: rawEmail },
      _limit: 1,
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const existingRow = (existingRes?.data as unknown as WaitlistRow[] | undefined)?.[0];
    if (existingRow) {
      console.log("[api/waitlist] returning existing", { email: rawEmail, position: existingRow.position });
      return NextResponse.json({ ok: true, data: { ...publicRow(existingRow), already_signed_up: true } });
    }

    // Resolve referrer (only if the code actually maps to someone).
    let referredByCode: string | null = null;
    let referrerRow: WaitlistRow | null = null;
    if (refRaw) {
      const refRes = await totalumSdk.crud.query("waitlist", {
        _filter: { referral_code: refRaw },
        _limit: 1,
      } as Parameters<typeof totalumSdk.crud.query>[1]);
      const candidate = (refRes?.data as unknown as WaitlistRow[] | undefined)?.[0];
      if (candidate) {
        referrerRow = candidate;
        referredByCode = candidate.referral_code;
      }
    }

    // Position is signup order: total existing rows + 1.
    const countRes = await totalumSdk.crud.query("waitlist", {
      _aggregate: { _count: true },
    } as Parameters<typeof totalumSdk.crud.query>[1]);
    const aggData = countRes?.data as unknown;
    let totalExisting = 0;
    if (Array.isArray(aggData) && aggData.length > 0) {
      const first = aggData[0] as { _count?: number; count?: number };
      totalExisting = Number(first._count ?? first.count ?? 0);
    } else if (aggData && typeof aggData === "object") {
      const obj = aggData as { _count?: number; count?: number };
      totalExisting = Number(obj._count ?? obj.count ?? 0);
    }
    const newPosition = totalExisting + 1;

    const referral_code = await generateUniqueCode();

    const createRes = await totalumSdk.crud.createRecord("waitlist", {
      email: rawEmail,
      company_name: company_name || null,
      shopify_revenue_band,
      referral_code,
      referred_by: referredByCode,
      position: newPosition,
      referral_count: 0,
    });
    const created = createRes?.data as WaitlistRow | undefined;
    if (!created?._id) {
      console.error("[api/waitlist] create returned no _id", createRes);
      return NextResponse.json(
        { ok: false, code: "internal_error", message: "Something went wrong. Please try again." },
        { status: 500 },
      );
    }

    // Referral reward: bump referrer's count and improve their position.
    let updatedReferrer: WaitlistRow | null = null;
    if (referrerRow) {
      try {
        const nextCount = (Number(referrerRow.referral_count) || 0) + 1;
        // Move the referrer up by one slot (floor at 1) — every referral skips them one place.
        const nextPosition = Math.max(1, (Number(referrerRow.position) || newPosition) - 1);
        const updateRes = await totalumSdk.crud.editRecordById("waitlist", referrerRow._id, {
          referral_count: nextCount,
          position: nextPosition,
        });
        updatedReferrer = updateRes?.data as WaitlistRow | undefined ?? {
          ...referrerRow,
          referral_count: nextCount,
          position: nextPosition,
        };
        console.log("[api/waitlist] referrer rewarded", {
          referrer: referrerRow.referral_code,
          newCount: nextCount,
          newPosition: nextPosition,
        });
      } catch (err) {
        console.error("[api/waitlist] failed to reward referrer", err);
      }
    }

    console.log("[api/waitlist] signup ok", { email: rawEmail, position: newPosition, referral_code });

    return NextResponse.json({
      ok: true,
      data: {
        ...publicRow(created),
        already_signed_up: false,
        referrer_new_position: updatedReferrer?.position ?? null,
      },
    });
  } catch (err) {
    console.error("[api/waitlist] error", err);
    return NextResponse.json(
      { ok: false, code: "internal_error", message: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}
