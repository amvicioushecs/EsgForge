import { NextResponse } from "next/server";

/**
 * Production-safe error response. Strips stack traces and implementation details.
 * Server-side: log the full error. Client-side: get a stable {ok:false, error, message, error_code?}.
 */
export interface ApiError {
  error: string;
  message: string;
  error_code?: string;
}

export function apiError(
  status: number,
  body: ApiError & { extras?: Record<string, unknown> },
  ctx?: { logTag?: string; err?: unknown },
): NextResponse {
  if (ctx?.err) {
    console.error(`[api-error]${ctx.logTag ? ` ${ctx.logTag}` : ""}`, {
      status,
      error: body.error,
      message: body.message,
      err: ctx.err instanceof Error ? { name: ctx.err.name, message: ctx.err.message } : String(ctx.err),
    });
  }
  const payload: Record<string, unknown> = {
    ok: false,
    error: body.error,
    message: body.message,
  };
  if (body.error_code) payload.error_code = body.error_code;
  if (body.extras) Object.assign(payload, body.extras);
  return NextResponse.json(payload, { status });
}
