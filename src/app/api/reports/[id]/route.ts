import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

async function userOwnsReport(reportId: string, userId: string): Promise<boolean> {
  try {
    const res = await totalumSdk.crud.getRecordById("esg_report", reportId);
    const r = res?.data as any;
    return !!r && (r.user === userId || r.user?._id === userId);
  } catch (err) {
    console.error("[reports/:id] ownership check failed", err);
    return false;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    const res = await totalumSdk.crud.getRecordById("esg_report", id);
    const r = res?.data as any;
    if (!r || (r.user !== session.user.id && r.user?._id !== session.user.id)) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true, data: r });
  } catch (err: any) {
    console.error("[api/reports/:id] GET error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!(await userOwnsReport(id, session.user.id))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    console.log("[api/reports/:id] DELETE", { id });
    await totalumSdk.crud.deleteRecordById("esg_report", id);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err: any) {
    console.error("[api/reports/:id] DELETE error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
