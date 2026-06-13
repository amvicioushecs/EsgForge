import { NextResponse } from "next/server";
import { headers as nextHeaders } from "next/headers";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";
import { climatiqSemaphore } from "@/lib/security/semaphore";
import { logAudit, hashIp, clientIpFromHeaders } from "@/lib/security/audit-log";
import { apiError } from "@/lib/security/api-error";
import {
  assertObject,
  assertAllowedKeys,
  pickObject,
  pickString,
  ValidationError,
} from "@/lib/security/validation";
import { timedDbOp } from "@/lib/security/timing";

interface EmissionFactorSelector {
  activity_id: string;
  data_version: string;
  region?: string;
  source?: string;
}

interface ClimatiqErrorBody {
  error?: string;
  error_code?: string;
  message?: string;
  valid_values?: { unit_type?: string[] } | string[];
}

interface ClimatiqSuccess {
  co2e?: number;
  co2e_unit?: string;
  emission_factor?: Record<string, unknown>;
  activity_data?: Record<string, unknown>;
  constituent_gases?: Record<string, unknown>;
}

const MAX_RETRIES = 3;
const BACKOFF_MS = [1000, 2000, 4000];

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

// Constant-time string comparison for API key check. Always walks the full
// length of the expected key so the loop count doesn't reveal the prefix
// match length to a timing attacker.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function callClimatiq(payload: object, apiKey: string): Promise<Response> {
  return fetch("https://api.climatiq.io/data/v1/estimate", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify(payload),
  });
}

export async function POST(req: Request) {
  const reqHeaders = await nextHeaders();
  const ipHash = await hashIp(clientIpFromHeaders(reqHeaders));
  const userAgent = reqHeaders.get("user-agent") || "";

  // Auth: this is now a service-to-service endpoint. Every inbound request
  // MUST carry `Authorization: Bearer <ESGFORGE_API_KEY>`. The token is
  // compared in constant time against the env-configured key. Missing
  // header, missing env, or mismatched token → 401 {"error":"Unauthorized"}.
  const authHeader = reqHeaders.get("authorization") || "";
  const bearerMatch = authHeader.match(/^Bearer\s+(.+)$/i);
  const expectedKey = process.env.ESGFORGE_API_KEY || "";

  if (!bearerMatch || !expectedKey || !constantTimeEqual(bearerMatch[1].trim(), expectedKey)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No user session attached on service calls. Downstream code treats this
  // route as caller="service" — same audit/log fields, no user reference.
  const session: Awaited<ReturnType<typeof requireSession>> = null;
  const isServiceCall = true;

  const apiKey = process.env.CLIMATIQ_API_KEY;
  if (!apiKey) {
    console.error("[api/emissions/estimate] CLIMATIQ_API_KEY is not set");
    return apiError(500, {
      error: "not_configured",
      message: "Emissions service is not configured. Contact support.",
      error_code: "not_configured",
    });
  }

  // ── Input validation ────────────────────────────────────────────────────────
  let selector: EmissionFactorSelector;
  let parameters: Record<string, unknown>;
  try {
    const raw = await req.json().catch(() => ({}));
    assertObject(raw);
    assertAllowedKeys(raw, ["emission_factor", "parameters"]);

    const efObj = pickObject(raw, "emission_factor", {
      required: true,
      allowed: ["activity_id", "data_version", "region", "source"],
    })!;
    const activity_id = pickString(efObj, "activity_id", { required: true, maxLen: 200 })!;
    const region = pickString(efObj, "region", { maxLen: 32 });
    const source = pickString(efObj, "source", { maxLen: 200 });

    // PHASE 1: pin every selector to data_version "^34" — caret form lets Climatiq
    // pick the latest minor release within major 34 so audits stay reproducible
    // while we still benefit from non-breaking factor updates.
    selector = {
      activity_id,
      data_version: "^34",
      ...(region ? { region } : {}),
      ...(source ? { source } : {}),
    };

    const paramsObj = pickObject(raw, "parameters", { required: true });
    if (!paramsObj || Object.keys(paramsObj).length === 0) {
      throw new ValidationError("Estimate parameters are required (e.g. energy + energy_unit).");
    }
    parameters = paramsObj;
  } catch (err) {
    if (err instanceof ValidationError) {
      return apiError(400, {
        error: "bad_request",
        message: err.message,
        error_code: "validation_failed",
      });
    }
    return apiError(400, {
      error: "bad_request",
      message: "Invalid request body.",
      error_code: "bad_request",
    });
  }

  console.log("[api/emissions/estimate] calling climatiq", {
    caller: isServiceCall ? "service" : "user",
    userId: session?.user.id ?? null,
    activity_id: selector.activity_id,
    data_version: selector.data_version,
    region: selector.region || null,
  });

  // ── Outbound call with concurrency cap + retry policy ──────────────────────
  const release = await climatiqSemaphore.acquire();
  let upstream: Response | null = null;
  try {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        upstream = await callClimatiq({ emission_factor: selector, parameters }, apiKey);
      } catch (err) {
        console.error("[api/emissions/estimate] network error", { attempt, err });
        if (attempt === MAX_RETRIES) {
          await logAudit({
            action: "emissions_estimate_failed",
            user_email: session?.user.email ?? null,
            user_id: session?.user.id ?? null,
            ip_hash: ipHash,
            user_agent: userAgent,
            metadata: {
              activity_id: selector.activity_id,
              reason: "network_error",
              caller: isServiceCall ? "service" : "user",
            },
          });
          return apiError(502, {
            error: "upstream_error",
            message: "Emissions service error, please retry shortly.",
            error_code: "upstream_unreachable",
          });
        }
        await sleep(BACKOFF_MS[attempt] ?? 4000);
        continue;
      }

      // 200 → done
      if (upstream.status === 200) break;

      // 429 — distinguish quota_exceeded (terminal) from temporary rate limit (retry)
      if (upstream.status === 429) {
        const cloned = upstream.clone();
        const body = (await cloned.json().catch(() => ({}))) as ClimatiqErrorBody;
        const code = body.error_code || body.error || "";
        if (code === "quota_exceeded") {
          // Don't retry — surface immediately.
          break;
        }
        // temporarily_rate_limited → exponential backoff retry
        if (attempt < MAX_RETRIES) {
          console.warn("[api/emissions/estimate] 429 rate-limited, retrying", {
            attempt,
            backoffMs: BACKOFF_MS[attempt],
          });
          await sleep(BACKOFF_MS[attempt] ?? 4000);
          continue;
        }
        break;
      }

      // 503 — respect Retry-After then retry within budget
      if (upstream.status === 503 && attempt < MAX_RETRIES) {
        const retryAfter = upstream.headers.get("Retry-After");
        const waitMs = retryAfter ? Math.min(Number(retryAfter) * 1000, 10_000) : BACKOFF_MS[attempt];
        console.warn("[api/emissions/estimate] 503, honoring Retry-After", { attempt, waitMs });
        await sleep(Number.isFinite(waitMs) && waitMs > 0 ? waitMs : (BACKOFF_MS[attempt] ?? 4000));
        continue;
      }

      // Any other non-200 → stop, hand to error mapper
      break;
    }
  } finally {
    release();
  }

  if (!upstream) {
    return apiError(502, {
      error: "upstream_error",
      message: "Emissions service error, please retry shortly.",
      error_code: "upstream_unreachable",
    });
  }

  // ── Success path ────────────────────────────────────────────────────────────
  if (upstream.status === 200) {
    const data = (await upstream.json().catch(() => ({}))) as ClimatiqSuccess;
    const co2e = typeof data.co2e === "number" ? data.co2e : 0;
    const co2e_unit = typeof data.co2e_unit === "string" ? data.co2e_unit : "kg";

    const ef = (data.emission_factor || {}) as Record<string, unknown>;
    const efName = typeof ef.name === "string" ? ef.name : selector.activity_id;
    const resolvedDataVersion = typeof ef.data_version === "string" ? ef.data_version : "";

    let metricId: string | null = null;
    try {
      const metricRow: Record<string, unknown> = {
        metric_name: efName,
        category: "environmental",
        value: co2e,
        unit: co2e_unit,
        period: "",
        trend: "stable",
        recorded_at: new Date().toISOString(),
        activity_id: selector.activity_id,
        data_version: resolvedDataVersion,
        climatiq_data_version: resolvedDataVersion,
        input_parameters: JSON.stringify(parameters),
      };
      // Only attach a user reference for session-authenticated calls. Service
      // calls (Shopify app) don't carry a user identity at this layer.
      if (session) metricRow.user = session.user.id;
      const createRes = await timedDbOp("esg_metric.create", () =>
        totalumSdk.crud.createRecord("esg_metric", metricRow),
      );
      const created = createRes?.data as { _id?: string } | undefined;
      metricId = created?._id ?? null;
    } catch (err) {
      console.error("[api/emissions/estimate] failed to persist esg_metric", err);
    }

    await logAudit({
      action: "emissions_estimate",
      user_email: session?.user.email ?? null,
      user_id: session?.user.id ?? null,
      record_id: metricId,
      ip_hash: ipHash,
      user_agent: userAgent,
      metadata: {
        activity_id: selector.activity_id,
        co2e,
        co2e_unit,
        data_version: resolvedDataVersion,
        caller: isServiceCall ? "service" : "user",
      },
    });

    return NextResponse.json({
      ok: true,
      co2e,
      co2e_unit,
      emission_factor: data.emission_factor,
      activity_data: data.activity_data,
      constituent_gases: data.constituent_gases,
    });
  }

  // ── Error mapping (clean, user-facing messages) ────────────────────────────
  const status = upstream.status;
  const errBody = (await upstream.json().catch(() => ({}))) as ClimatiqErrorBody;
  const code = errBody.error_code || errBody.error || "";

  console.warn("[api/emissions/estimate] climatiq non-200", {
    caller: isServiceCall ? "service" : "user",
    userId: session?.user.id ?? null,
    status,
    code,
  });

  await logAudit({
    action: "emissions_estimate_failed",
    user_email: session?.user.email ?? null,
    user_id: session?.user.id ?? null,
    ip_hash: ipHash,
    user_agent: userAgent,
    metadata: {
      activity_id: selector.activity_id,
      climatiq_status: status,
      climatiq_code: code,
      caller: isServiceCall ? "service" : "user",
    },
  });

  if (status === 400) {
    if (code === "no_emission_factors_found") {
      return apiError(400, {
        error: "no_match",
        message: "We couldn't match this activity to an emissions factor — try adjusting your inputs.",
        error_code: "no_emission_factors_found",
      });
    }
    if (code === "invalid_unit_type_supplied") {
      // Surface valid_values.unit_type so the UI can prompt the user with the right options.
      const vv = errBody.valid_values;
      const valid_unit_types = Array.isArray(vv)
        ? vv
        : Array.isArray((vv as { unit_type?: string[] } | undefined)?.unit_type)
          ? (vv as { unit_type: string[] }).unit_type
          : [];
      return apiError(400, {
        error: "invalid_unit",
        message: "The unit type isn't supported for this activity. Pick one of the valid units.",
        error_code: "invalid_unit_type_supplied",
        extras: { valid_unit_types },
      });
    }
    return apiError(400, {
      error: "bad_request",
      message: "The estimate request was rejected.",
      error_code: code || "bad_request",
    });
  }

  if (status === 401 || status === 403) {
    return apiError(502, {
      error: "auth_error",
      message: "Emissions service auth failed.",
      error_code: "upstream_auth_error",
    });
  }

  if (status === 429) {
    if (code === "quota_exceeded") {
      return apiError(429, {
        error: "quota_exceeded",
        message: "Monthly emissions quota reached — contact support.",
        error_code: "quota_exceeded",
      });
    }
    return apiError(429, {
      error: "rate_limited",
      message: "Too many requests right now, please retry in a few minutes.",
      error_code: "rate_limited",
    });
  }

  if (status === 503) {
    const retryHeader = upstream.headers.get("Retry-After");
    const retry_after = retryHeader ? Number(retryHeader) : null;
    return apiError(503, {
      error: "service_unavailable",
      message: "Emissions service is temporarily unavailable.",
      error_code: "service_unavailable",
      extras: { retry_after: Number.isFinite(retry_after) ? retry_after : null },
    });
  }

  return apiError(502, {
    error: "upstream_error",
    message: "Emissions service error, please retry shortly.",
    error_code: "upstream_error",
  });
}
