import { NextResponse } from "next/server";
import { cookies, headers as nextHeaders } from "next/headers";
import { totalumSdk } from "@/lib/totalum";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

interface WaitlistRow {
  _id: string;
  email: string;
  company_name?: string | null;
  shopify_revenue_band?: string | null;
  referral_code: string;
  referred_by?: string | null;
  referred_by_partner?: string | null;
  position: number;
  referral_count: number;
  createdAt?: string;
}

interface PartnerLookup {
  _id: string;
  partner_code?: string;
  status?: string;
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
    const cookieStore = await cookies();
    const partnerCookie = (cookieStore.get("ef_partner")?.value || "").trim().toUpperCase();
    const visitorCookie = (cookieStore.get("ef_visitor")?.value || "").trim();
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

    // Resolve partner attribution (only if cookie maps to an active partner).
    let partnerRow: PartnerLookup | null = null;
    let partnerCodeStamp: string | null = null;
    if (partnerCookie) {
      try {
        const pRes = await totalumSdk.crud.query("partner", {
          _filter: { partner_code: partnerCookie },
          _limit: 1,
        } as Parameters<typeof totalumSdk.crud.query>[1]);
        const candidate = (pRes?.data as unknown as PartnerLookup[] | undefined)?.[0];
        if (candidate?._id && (!candidate.status || candidate.status === "active")) {
          partnerRow = candidate;
          partnerCodeStamp = (candidate.partner_code || partnerCookie).toUpperCase();
        }
      } catch (err) {
        console.error("[api/waitlist] partner lookup failed", err);
      }
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
      referred_by_partner: partnerCodeStamp,
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

    // Convert the partner_referral row for this visitor (if any) — reuse the existing
    // row instead of creating a second tracking record. Falls back to creating a row
    // if the visitor came in before the tracker fired (edge case).
    if (partnerRow?._id) {
      try {
        let referralRowId: string | null = null;
        if (visitorCookie) {
          const refRowRes = await totalumSdk.crud.query("partner_referral", {
            _filter: { visitor_id: visitorCookie, partner: partnerRow._id },
            _sort: { createdAt: "desc" },
            _limit: 1,
          } as Parameters<typeof totalumSdk.crud.query>[1]);
          const refRow = (refRowRes?.data as unknown as Array<{ _id: string }> | undefined)?.[0];
          referralRowId = refRow?._id ?? null;
        }

        if (referralRowId) {
          await totalumSdk.crud.editRecordById("partner_referral", referralRowId, {
            converted_to_waitlist: "yes",
            waitlist: created._id,
          });
          console.log("[api/waitlist] partner_referral converted", { referralRowId, waitlistId: created._id });
        } else {
          await totalumSdk.crud.createRecord("partner_referral", {
            partner: partnerRow._id,
            landing_path: "/",
            visitor_id: visitorCookie || `late_${created._id}`,
            ip_hash: "",
            user_agent: "",
            converted_to_waitlist: "yes",
            waitlist: created._id,
          });
          console.log("[api/waitlist] late-bind partner_referral created", { waitlistId: created._id });
        }

        const reqHeaders = await nextHeaders();
        const ipHash = await hashIp(clientIpFromHeaders(reqHeaders));
        void logAudit({
          action: "partner_referral_conversion",
          ip_hash: ipHash,
          user_agent: reqHeaders.get("user-agent") || "",
          record_id: created._id,
          metadata: {
            partner_code: partnerCodeStamp,
            waitlist_position: newPosition,
          },
        });
      } catch (err) {
        console.error("[api/waitlist] failed to convert partner_referral", err);
      }
    }

    console.log("[api/waitlist] signup ok", {
      email: rawEmail,
      position: newPosition,
      referral_code,
      partner: partnerCodeStamp,
    });

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
