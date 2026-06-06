import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const res = await totalumSdk.crud.getRecordById("esg_notification", id);
    const n = res?.data as any;
    if (!n || (n.user !== session.user.id && n.user?._id !== session.user.id)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const updated = await totalumSdk.crud.editRecordById("esg_notification", id, {
      read_status: "read",
    });
    return NextResponse.json({ ok: true, data: updated?.data });
  } catch (err: any) {
    console.error("[api/notifications/:id/read] error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
