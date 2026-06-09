import "server-only";

/**
 * Lightweight, allow-list–first validators. We intentionally do not pull in a
 * full schema library — every API route validates and sanitizes by hand against
 * a tight allow-list of expected fields and types. Unknown fields are rejected
 * (not silently ignored) to make it easy to spot exploitation attempts.
 */
export class ValidationError extends Error {
  public readonly field?: string;
  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
    this.name = "ValidationError";
  }
}

export function assertObject(body: unknown): asserts body is Record<string, unknown> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new ValidationError("Request body must be a JSON object.");
  }
}

export function assertAllowedKeys(body: Record<string, unknown>, allowed: readonly string[]) {
  const allowedSet = new Set(allowed);
  for (const key of Object.keys(body)) {
    if (!allowedSet.has(key)) {
      throw new ValidationError(`Unexpected field "${key}".`, key);
    }
  }
}

export function pickString(
  body: Record<string, unknown>,
  field: string,
  opts: { required?: boolean; maxLen?: number; pattern?: RegExp; lowercase?: boolean; uppercase?: boolean } = {},
): string | null {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (opts.required) throw new ValidationError(`Field "${field}" is required.`, field);
    return null;
  }
  if (typeof raw !== "string") {
    throw new ValidationError(`Field "${field}" must be a string.`, field);
  }
  let v = raw.trim();
  if (opts.maxLen && v.length > opts.maxLen) {
    throw new ValidationError(`Field "${field}" is too long.`, field);
  }
  if (opts.lowercase) v = v.toLowerCase();
  if (opts.uppercase) v = v.toUpperCase();
  if (opts.pattern && !opts.pattern.test(v)) {
    throw new ValidationError(`Field "${field}" has an invalid format.`, field);
  }
  return v;
}

export function pickNumber(
  body: Record<string, unknown>,
  field: string,
  opts: { required?: boolean; min?: number; max?: number; integer?: boolean } = {},
): number | null {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (opts.required) throw new ValidationError(`Field "${field}" is required.`, field);
    return null;
  }
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n)) throw new ValidationError(`Field "${field}" must be a number.`, field);
  if (opts.integer && !Number.isInteger(n)) throw new ValidationError(`Field "${field}" must be an integer.`, field);
  if (opts.min !== undefined && n < opts.min) throw new ValidationError(`Field "${field}" is below ${opts.min}.`, field);
  if (opts.max !== undefined && n > opts.max) throw new ValidationError(`Field "${field}" is above ${opts.max}.`, field);
  return n;
}

export function pickEnum<T extends string>(
  body: Record<string, unknown>,
  field: string,
  values: readonly T[],
  opts: { required?: boolean; default?: T } = {},
): T | null {
  const raw = body[field];
  if (raw === undefined || raw === null || raw === "") {
    if (opts.required) throw new ValidationError(`Field "${field}" is required.`, field);
    return opts.default ?? null;
  }
  if (typeof raw !== "string" || !values.includes(raw as T)) {
    throw new ValidationError(`Field "${field}" must be one of: ${values.join(", ")}.`, field);
  }
  return raw as T;
}

export function pickObject(
  body: Record<string, unknown>,
  field: string,
  opts: { required?: boolean; allowed?: readonly string[] } = {},
): Record<string, unknown> | null {
  const raw = body[field];
  if (raw === undefined || raw === null) {
    if (opts.required) throw new ValidationError(`Field "${field}" is required.`, field);
    return null;
  }
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new ValidationError(`Field "${field}" must be an object.`, field);
  }
  const obj = raw as Record<string, unknown>;
  if (opts.allowed) {
    const allowedSet = new Set(opts.allowed);
    for (const k of Object.keys(obj)) {
      if (!allowedSet.has(k)) throw new ValidationError(`Unexpected sub-field "${field}.${k}".`, `${field}.${k}`);
    }
  }
  return obj;
}
