import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function GET() {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    console.log("[api/notifications] GET", { userId: session.user.id });
    const res = await totalumSdk.crud.query("esg_notification", {
      _filter: { user: session.user.id },
      _sort: { sent_at: "desc" },
      _limit: 50,
    } as any);
    return NextResponse.json({ ok: true, data: res?.data ?? [] });
  } catch (err: any) {
    console.error("[api/notifications] GET error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
