import "server-only";
import { totalumSdk } from "@/lib/totalum";

/**
 * Append-only audit log. Application code only INSERTs — never UPDATEs or DELETEs.
 * Failures are swallowed (logged) so that audit failures never break the user request,
 * but every failure surfaces in server logs for ops.
 *
 * SOC 2 + CSRD audit trail.
 */
export type AuditAction =
  | "emissions_estimate"
  | "emissions_estimate_failed"
  | "report_export"
  | "data_access"
  | "login_success"
  | "login_failure"
  | "partner_referral_click"
  | "partner_referral_conversion"
  | "partner_created"
  | "partner_key_rotated"
  | "shopify_webhook_received"
  | "shopify_webhook_rejected"
  | "auth_rate_limited"
  | "csrf_rejected";

export interface AuditEvent {
  action: AuditAction;
  user_email?: string | null;
  user_id?: string | null;
  record_id?: string | null;
  metadata?: Record<string, unknown> | null;
  ip_hash?: string | null;
  user_agent?: string | null;
}

async function sha256Hex(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashIp(ip: string | null | undefined): Promise<string> {
  if (!ip) return "";
  return sha256Hex(ip);
}

export async function logAudit(event: AuditEvent): Promise<void> {
  try {
    const row: Record<string, unknown> = {
      action: event.action,
      user_email: event.user_email || "anonymous",
      record_id: event.record_id || null,
      metadata: event.metadata ? JSON.stringify(event.metadata) : null,
      ip_hash: event.ip_hash || "",
      user_agent: (event.user_agent || "").slice(0, 500),
    };
    if (event.user_id) row.user = event.user_id;
    await totalumSdk.crud.createRecord("audit_log", row);
  } catch (err) {
    // Never propagate — audit-log writes must not break the user request.
    console.error("[audit] failed to persist audit event", { action: event.action, err });
  }
}

export function clientIpFromHeaders(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  if (first) return first;
  return headers.get("x-real-ip") || "unknown";
}
