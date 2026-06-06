"use client";

import { useEffect, useState } from "react";
import { DashboardShell } from "@/components/common/DashboardShell";
import { api } from "@/lib/api";

interface Notification {
  _id: string;
  title: string;
  message: string;
  category: string;
  read_status: string;
  sent_at?: string;
}

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const load = async () => {
    setLoading(true);
    const res = await api.get<Notification[]>("/api/notifications");
    if (res.ok && res.data) setItems(res.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const markRead = async (id: string) => {
    await api.post(`/api/notifications/${id}/read`, {});
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read_status: "read" } : n)));
  };

  const visible = filter === "unread" ? items.filter((n) => n.read_status === "unread") : items;
  const unread = items.filter((n) => n.read_status === "unread").length;

  return (
    <DashboardShell>
      <div className="mb-8 flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Notifications</p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">Compliance alerts</h1>
          <p className="mt-2 text-slate-400 text-sm">
            {unread} unread · regulatory updates and report readiness.
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "unread"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-xs uppercase tracking-widest transition border ${
                filter === f
                  ? "bg-cyan-400/10 border-cyan-400/30 text-cyan-200"
                  : "bg-white/[0.02] border-white/5 text-slate-400 hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
          <p className="text-slate-400">All caught up — no alerts.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((n) => (
            <div
              key={n._id}
              className={`p-5 rounded-xl border transition flex items-start gap-4 ${
                n.read_status === "unread"
                  ? "border-cyan-400/30 bg-cyan-400/[0.04]"
                  : "border-white/5 bg-white/[0.02]"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 mt-2 rounded-full ${
                  n.read_status === "unread" ? "bg-cyan-400 pulse-ring" : "bg-slate-600"
                }`}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold text-white">{n.title}</h3>
                  <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded ${catBg(n.category)}`}>
                    {String(n.category || "").replace("_", " ")}
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1.5 leading-relaxed">{n.message}</p>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-2">
                  {n.sent_at ? new Date(n.sent_at).toLocaleString() : ""}
                </p>
              </div>
              {n.read_status === "unread" && (
                <button
                  onClick={() => markRead(n._id)}
                  className="text-xs text-cyan-300 hover:text-cyan-200 self-start"
                >
                  Mark read
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </DashboardShell>
  );
}

function catBg(c: string) {
  if (c === "report_ready") return "bg-cyan-400/10 text-cyan-300 border border-cyan-400/20";
  if (c === "deadline") return "bg-amber-400/10 text-amber-300 border border-amber-400/20";
  if (c === "alert") return "bg-red-400/10 text-red-300 border border-red-400/20";
  return "bg-slate-400/10 text-slate-300 border border-slate-400/20";
}
