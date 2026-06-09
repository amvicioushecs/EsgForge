import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";

/**
 * Public health probe — no auth, safe to expose to uptime monitors and load balancers.
 *
 * Returns 200 only when both checked dependencies (Totalum DB and Climatiq config)
 * are healthy. A failure on either dimension yields 503 so external probes treat
 * the worker as unhealthy and route traffic away.
 *
 * Intentionally cheap: the DB check is a 1-row `_limit: 1` query against an existing
 * table (no writes, no aggregates) so we don't load the cluster.
 */

const DB_TIMEOUT_MS = 1500;
const CLIMATIQ_TIMEOUT_MS = 1500;

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout_${ms}ms`)), ms),
    ),
  ]);
}

async function checkDb(): Promise<{ ok: boolean; ms: number; error?: string }> {
  const start = Date.now();
  try {
    await withTimeout(
      totalumSdk.crud.query("user", { _limit: 1 } as Parameters<typeof totalumSdk.crud.query>[1]),
      DB_TIMEOUT_MS,
    );
    return { ok: true, ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function checkClimatiq(): Promise<{ ok: boolean; ms: number; error?: string }> {
  // We don't burn API quota on every probe — we just confirm the secret is wired up
  // and the host resolves. A liveness check against the Climatiq base URL is enough.
  const apiKey = process.env.CLIMATIQ_API_KEY;
  if (!apiKey) {
    return { ok: false, ms: 0, error: "missing_api_key" };
  }
  const start = Date.now();
  try {
    const res = await withTimeout(
      fetch("https://api.climatiq.io/", { method: "HEAD" }),
      CLIMATIQ_TIMEOUT_MS,
    );
    // Any HTTP response (even 401) proves connectivity; we just need the host reachable.
    return { ok: res.status < 500, ms: Date.now() - start };
  } catch (err) {
    return {
      ok: false,
      ms: Date.now() - start,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET() {
  const [db, climatiq] = await Promise.all([checkDb(), checkClimatiq()]);

  const status = db.ok && climatiq.ok ? "healthy" : "degraded";
  const httpStatus = db.ok && climatiq.ok ? 200 : 503;

  const body = {
    status,
    db: {
      ok: db.ok,
      latency_ms: db.ms,
      ...(db.error ? { error: db.error } : {}),
    },
    climatiq: {
      ok: climatiq.ok,
      latency_ms: climatiq.ms,
      ...(climatiq.error ? { error: climatiq.error } : {}),
    },
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, { status: httpStatus });
}
