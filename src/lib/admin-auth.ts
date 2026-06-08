import "server-only";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Server-only admin gate.
 *
 * Returns the session if the user is authenticated AND their email matches one in
 * the ADMIN_EMAILS env var (comma-separated, case-insensitive). Returns null otherwise.
 *
 * We deliberately do NOT bake the admin email into the codebase. If ADMIN_EMAILS is
 * unset, no one is admin — the dashboard returns 404. This matches the brief: no
 * cross-user data view unless explicitly gated.
 */
export async function getAdminSession() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user?.email) return null;

    const raw = process.env.ADMIN_EMAILS || "";
    if (!raw.trim()) {
      console.warn("[admin-auth] ADMIN_EMAILS env var is not set — no users will be granted admin access");
      return null;
    }
    const allowList = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    const email = session.user.email.toLowerCase();
    if (!allowList.includes(email)) {
      console.warn("[admin-auth] non-admin attempted admin access", { email });
      return null;
    }
    return session;
  } catch (err) {
    console.error("[admin-auth] error resolving session", err);
    return null;
  }
}

export function isAdminConfigured() {
  return !!(process.env.ADMIN_EMAILS && process.env.ADMIN_EMAILS.trim());
}
