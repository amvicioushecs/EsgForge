import { NextResponse } from "next/server";
import { totalumSdk } from "@/lib/totalum";
import { requireSession } from "@/lib/session-helper";

async function userOwnsStore(storeId: string, userId: string): Promise<boolean> {
  try {
    const res = await totalumSdk.crud.getRecordById("shopify_store", storeId);
    const store = res?.data as any;
    return !!store && (store.user === userId || store.user?._id === userId);
  } catch (err) {
    console.error("[stores/[id]] ownership check failed", err);
    return false;
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession();
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }
    const { id } = await params;
    if (!(await userOwnsStore(id, session.user.id))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    console.log("[api/stores/:id] PATCH", { id });
    const updated = await totalumSdk.crud.editRecordById("shopify_store", id, body);
    return NextResponse.json({ ok: true, data: updated?.data });
  } catch (err: any) {
    console.error("[api/stores/:id] PATCH error", err);
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
    if (!(await userOwnsStore(id, session.user.id))) {
      return NextResponse.json({ ok: false, error: "Not found" }, { status: 404 });
    }
    console.log("[api/stores/:id] DELETE", { id });
    await totalumSdk.crud.deleteRecordById("shopify_store", id);
    return NextResponse.json({ ok: true, data: { deleted: true } });
  } catch (err: any) {
    console.error("[api/stores/:id] DELETE error", err);
    return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
  }
}
