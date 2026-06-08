import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

async function userOwnsMetric(id: string, userId: string): Promise<boolean> {
  try {
    const res = await totalumSdk.crud.getRecordById("esg_metric", id);
    const m = res?.data as any;
    return !!m && (m.user === userId || m.user?._id === userId);
  } catch (err) {
    console.error("[metrics/:id] ownership check failed", err);
    return false;
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!(await userOwnsMetric(id, session.user.id))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    await totalumSdk.crud.deleteRecordById("esg_metric", id);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err: any) {
    console.error("[api/metrics/:id] DELETE error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
