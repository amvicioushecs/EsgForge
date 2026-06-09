import { NextResponse, type NextRequest } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { totalumSdk } from "@/lib/totalum";
import { getAdminSession } from "@/lib/admin-auth";
import { apiError } from "@/lib/security/api-error";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";

/**
 * Rotate a partner's API key.
 *
 * Policy:
 *  • The current key is copied into `previous_api_key` with an expiry of NOW + 24h.
 *  • A fresh `api_key` is minted with an expiry of NOW + 1 year.
 *  • Both keys are accepted by downstream services until the previous one expires —
 *    this 24h grace window lets the partner roll their integration without an
 *    outage. After 24h, only the new key works.
 *
 * Admin-gated. Audited. The new key is returned ONCE in the response — the admin
 * is expected to hand it to the partner immediately. We do NOT store it in plain
 * text anywhere that survives this response in clear form (the row holds it for
 * downstream comparison, but the UI never displays it again).
 */

const GRACE_MS = 24 * 60 * 60 * 1000; // 24h
const KEY_LIFETIME_MS = 365 * 24 * 60 * 60 * 1000; // 1 year

interface PartnerRow {
  _id: string;
  name?: string;
  partner_code?: string;
  api_key?: string;
  api_key_expires_at?: string;
  previous_api_key?: string;
  previous_api_key_expires_at?: string;
}

function generateApiKey(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `efk_live_${hex}`;
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getAdminSession();
  if (!session) {
    return apiError(403, {
      error: "forbidden",
      message: "Admin access required.",
      error_code: "forbidden",
    });
  }

  const { id } = await params;
  if (!id || typeof id !== "string") {
    return apiError(400, {
      error: "bad_request",
      message: "Partner ID is required.",
      error_code: "bad_request",
    });
  }

  let partner: PartnerRow | undefined;
  try {
    const res = await totalumSdk.crud.getRecordById("partner", id);
    partner = res?.data as PartnerRow | undefined;
  } catch (err) {
    console.error("[api/admin/partners/rotate-key] getRecordById failed", err);
    return apiError(404, {
      error: "not_found",
      message: "Partner not found.",
      error_code: "not_found",
    });
  }

  if (!partner?._id) {
    return apiError(404, {
      error: "not_found",
      message: "Partner not found.",
      error_code: "not_found",
    });
  }

  const now = Date.now();
  const newKey = generateApiKey();
  const newExpiresAt = new Date(now + KEY_LIFETIME_MS).toISOString();
  const previousExpiresAt = new Date(now + GRACE_MS).toISOString();

  try {
    await totalumSdk.crud.editRecordById("partner", partner._id, {
      api_key: newKey,
      api_key_expires_at: newExpiresAt,
      previous_api_key: partner.api_key || "",
      previous_api_key_expires_at: partner.api_key ? previousExpiresAt : "",
    });
  } catch (err) {
    console.error("[api/admin/partners/rotate-key] update failed", err);
    return apiError(500, {
      error: "internal_error",
      message: "Failed to rotate API key.",
      error_code: "internal_error",
    });
  }

  const reqHeaders = await nextHeaders();
  const ipHash = await hashIp(clientIpFromHeaders(reqHeaders));
  void logAudit({
    action: "partner_key_rotated",
    user_email: session.user.email,
    user_id: session.user.id,
    record_id: partner._id,
    ip_hash: ipHash,
    user_agent: reqHeaders.get("user-agent") || "",
    metadata: {
      partner_code: partner.partner_code,
      previous_key_grace_expires_at: partner.api_key ? previousExpiresAt : null,
      new_key_expires_at: newExpiresAt,
    },
  });

  console.log("[api/admin/partners/rotate-key] rotated", {
    partnerId: partner._id,
    code: partner.partner_code,
    by: session.user.email,
    hadPriorKey: !!partner.api_key,
  });

  return NextResponse.json({
    ok: true,
    data: {
      partner_id: partner._id,
      api_key: newKey, // shown ONCE in the UI — admin must hand it to the partner now
      api_key_expires_at: newExpiresAt,
      previous_api_key_expires_at: partner.api_key ? previousExpiresAt : null,
      grace_period_hours: partner.api_key ? 24 : 0,
    },
  });
}
