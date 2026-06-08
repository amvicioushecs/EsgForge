import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

interface EmissionFactorInput {
  activity_id?: string;
  data_version?: string;
  region?: string;
  source?: string;
}

interface EstimateRequest {
  emission_factor?: EmissionFactorInput;
  parameters?: Record<string, unknown>;
}

interface ClimatiqErrorBody {
  error?: string;
  error_code?: string;
  message?: string;
  valid_values?: string[];
}

interface ClimatiqSuccess {
  co2e?: number;
  co2e_unit?: string;
  emission_factor?: Record<string, unknown>;
  activity_data?: Record<string, unknown>;
  constituent_gases?: Record<string, unknown>;
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session) {
    return NextResponse.json({ ok: false, code: "unauthorized", message: "Sign in to run an estimate." }, { status: 401 });
  }

  const apiKey = process.env.CLIMATIQ_API_KEY;
  if (!apiKey) {
    console.error("[api/emissions/estimate] CLIMATIQ_API_KEY is not set");
    return NextResponse.json(
      { ok: false, code: "not_configured", message: "Emissions service is not configured. Contact support." },
      { status: 500 },
    );
  }

  const body = (await req.json().catch(() => ({}))) as EstimateRequest;
  const emission_factor = body.emission_factor;
  const parameters = body.parameters;

  if (!emission_factor?.activity_id || typeof emission_factor.activity_id !== "string") {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "An activity_id is required." },
      { status: 400 },
    );
  }
  if (!parameters || typeof parameters !== "object" || Array.isArray(parameters) || Object.keys(parameters).length === 0) {
    return NextResponse.json(
      { ok: false, code: "bad_request", message: "Estimate parameters are required (e.g. energy + energy_unit)." },
      { status: 400 },
    );
  }

  // Pin to Climatiq factor data version 34 by default. Caret form lets Climatiq
  // pick the latest minor release within major 34, so audits stay reproducible
  // while we still benefit from non-breaking factor updates.
  const selector: EmissionFactorInput = {
    activity_id: emission_factor.activity_id,
    data_version: emission_factor.data_version || "^34",
  };
  if (emission_factor.region) selector.region = emission_factor.region;
  if (emission_factor.source) selector.source = emission_factor.source;

  console.log("[api/emissions/estimate] calling climatiq", {
    userId: session.user.id,
    activity_id: selector.activity_id,
    data_version: selector.data_version,
    region: selector.region || null,
  });

  let upstream: Response;
  try {
    upstream = await fetch("https://api.climatiq.io/data/v1/estimate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
      },
      body: JSON.stringify({ emission_factor: selector, parameters }),
    });
  } catch (err) {
    console.error("[api/emissions/estimate] network error contacting Climatiq", err);
    return NextResponse.json(
      { ok: false, code: "upstream_error", message: "Emissions service error, please retry shortly." },
      { status: 502 },
    );
  }

  if (upstream.status === 200) {
    const data = (await upstream.json().catch(() => ({}))) as ClimatiqSuccess;
    const co2e = typeof data.co2e === "number" ? data.co2e : 0;
    const co2e_unit = typeof data.co2e_unit === "string" ? data.co2e_unit : "kg";

    const ef = (data.emission_factor || {}) as Record<string, unknown>;
    const efName = typeof ef.name === "string" ? ef.name : (selector.activity_id ?? "Estimate");
    const resolvedDataVersion = typeof ef.data_version === "string" ? ef.data_version : "";

    try {
      await totalumSdk.crud.createRecord("esg_metric", {
        metric_name: efName,
        category: "environmental",
        value: co2e,
        unit: co2e_unit,
        period: "",
        trend: "stable",
        recorded_at: new Date().toISOString(),
        activity_id: selector.activity_id,
        data_version: resolvedDataVersion,
        input_parameters: JSON.stringify(parameters),
        user: session.user.id,
      });
    } catch (err) {
      console.error("[api/emissions/estimate] failed to persist esg_metric", err);
    }

    return NextResponse.json({
      ok: true,
      co2e,
      co2e_unit,
      emission_factor: data.emission_factor,
      activity_data: data.activity_data,
      constituent_gases: data.constituent_gases,
    });
  }

  const status = upstream.status;
  const errBody = (await upstream.json().catch(() => ({}))) as ClimatiqErrorBody;
  const code = errBody.error_code || errBody.error || "";
  const upstreamMessage = errBody.message || "";

  console.warn("[api/emissions/estimate] climatiq non-200", {
    userId: session.user.id,
    status,
    code,
  });

  if (status === 400) {
    if (code === "no_emission_factors_found") {
      return NextResponse.json(
        {
          ok: false,
          code: "no_match",
          message: "We couldn't match this activity to an emission factor. Try a different activity or unit.",
        },
        { status: 400 },
      );
    }
    if (code === "invalid_unit_type_supplied") {
      return NextResponse.json(
        {
          ok: false,
          code: "invalid_unit",
          message: "Wrong unit type.",
          valid_values: Array.isArray(errBody.valid_values) ? errBody.valid_values : [],
        },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { ok: false, code: "bad_request", message: upstreamMessage || "The estimate request was rejected." },
      { status: 400 },
    );
  }

  if (status === 401 || status === 403) {
    return NextResponse.json(
      { ok: false, code: "auth_error", message: "Emissions service auth failed." },
      { status: 502 },
    );
  }

  if (status === 429) {
    if (code === "quota_exceeded") {
      return NextResponse.json(
        {
          ok: false,
          code: "quota_exceeded",
          message: "Monthly emissions quota reached. Try again next month or upgrade.",
        },
        { status: 429 },
      );
    }
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message: "Too many requests right now, please retry in a few minutes.",
      },
      { status: 429 },
    );
  }

  if (status === 503) {
    const retryHeader = upstream.headers.get("Retry-After");
    const retry_after = retryHeader ? Number(retryHeader) : null;
    return NextResponse.json(
      {
        ok: false,
        code: "service_unavailable",
        retry_after: Number.isFinite(retry_after) ? retry_after : null,
        message: "Emissions service is temporarily unavailable.",
      },
      { status: 503 },
    );
  }

  return NextResponse.json(
    { ok: false, code: "upstream_error", message: "Emissions service error, please retry shortly." },
    { status: 502 },
  );
}
