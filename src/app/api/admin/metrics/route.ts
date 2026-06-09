import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { getAdminSession } from "@/lib/admin-auth";
import { apiError } from "@/lib/security/api-error";
import { timedDbOp } from "@/lib/security/timing";

/**
 * Admin-only operational metrics.
 *
 * Returns headline counts for the dashboard / on-call review:
 *  • waitlist_signups        — total rows in waitlist
 *  • partner_clicks          — total partner_referral rows
 *  • partner_conversions     — partner_referrals with converted_to_waitlist === "yes"
 *  • emissions_estimates     — total esg_metric rows successfully recorded
 *  • reports_exported        — total esg_report rows in any state
 *
 * Aggregates are issued with `_count` so we don't pull large row sets into the worker.
 * Each query is wrapped in timedDbOp() so any slow probe surfaces a warning in the logs
 * even when the response itself stays under the page budget.
 */

async function countTable(table: string): Promise<number> {
  try {
    const res = await timedDbOp(`metrics.count.${table}`, () =>
      totalumSdk.crud.query(table, {
        _aggregate: { _count: true },
      } as Parameters<typeof totalumSdk.crud.query>[1]),
    );
    const raw = res?.data as unknown;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0] as { _count?: number; count?: number };
      return Number(first._count ?? first.count ?? 0);
    }
    if (raw && typeof raw === "object") {
      const obj = raw as { _count?: number; count?: number };
      return Number(obj._count ?? obj.count ?? 0);
    }
    return 0;
  } catch (err) {
    console.error(`[api/admin/metrics] count failed for ${table}`, err);
    return 0;
  }
}

async function countConvertedReferrals(): Promise<number> {
  try {
    const res = await timedDbOp("metrics.count.partner_referral.converted", () =>
      totalumSdk.crud.query("partner_referral", {
        _filter: { converted_to_waitlist: "yes" },
        _aggregate: { _count: true },
      } as Parameters<typeof totalumSdk.crud.query>[1]),
    );
    const raw = res?.data as unknown;
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0] as { _count?: number; count?: number };
      return Number(first._count ?? first.count ?? 0);
    }
    if (raw && typeof raw === "object") {
      const obj = raw as { _count?: number; count?: number };
      return Number(obj._count ?? obj.count ?? 0);
    }
    return 0;
  } catch (err) {
    console.error("[api/admin/metrics] count converted referrals failed", err);
    return 0;
  }
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return apiError(403, {
      error: "forbidden",
      message: "Admin access required.",
      error_code: "forbidden",
    });
  }

  const [
    waitlistSignups,
    partnerClicks,
    partnerConversions,
    emissionsEstimates,
    reportsExported,
  ] = await Promise.all([
    countTable("waitlist"),
    countTable("partner_referral"),
    countConvertedReferrals(),
    countTable("esg_metric"),
    countTable("esg_report"),
  ]);

  console.log("[api/admin/metrics] served", {
    by: session.user.email,
    waitlistSignups,
    partnerClicks,
    emissionsEstimates,
  });

  return NextResponse.json({
    ok: true,
    data: {
      waitlist_signups: waitlistSignups,
      partner_clicks: partnerClicks,
      partner_conversions: partnerConversions,
      emissions_estimates: emissionsEstimates,
      reports_exported: reportsExported,
      timestamp: new Date().toISOString(),
    },
  });
}
