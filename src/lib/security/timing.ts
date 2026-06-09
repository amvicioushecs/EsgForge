import "server-only";

const SLOW_QUERY_MS = 200;

/**
 * Time an async DB operation. Warns if it takes longer than 200ms — that's our
 * "slow Totalum query" threshold for the stress-test instrumentation pass.
 */
export async function timedDbOp<T>(label: string, fn: () => Promise<T>): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const elapsed = Date.now() - start;
    if (elapsed > SLOW_QUERY_MS) {
      console.warn("[slow-query]", { label, elapsed_ms: elapsed });
    }
    return result;
  } catch (err) {
    const elapsed = Date.now() - start;
    console.error("[db-op-failed]", { label, elapsed_ms: elapsed, err });
    throw err;
  }
}

export function logRequestTiming(method: string, pathname: string, status: number, startMs: number) {
  const elapsed = Date.now() - startMs;
  console.log("[req]", { method, path: pathname, status, ms: elapsed });
}
