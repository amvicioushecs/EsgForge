"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";

const nav = [
  { href: "/dashboard", label: "Overview", icon: "◎" },
  { href: "/stores", label: "Stores", icon: "▢" },
  { href: "/reports", label: "Reports", icon: "▤" },
  { href: "/metrics", label: "Metrics", icon: "▰" },
  { href: "/calculator", label: "Calculator", icon: "∑" },
  { href: "/notifications", label: "Notifications", icon: "◉" },
  { href: "/profile", label: "Account", icon: "◇" },
];

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a]/95 backdrop-blur-xl border-r border-white/5 transform transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        } lg:static lg:translate-x-0`}
      >
        <div className="h-full flex flex-col">
          <Link href="/" className="flex items-center gap-2.5 px-6 h-16 border-b border-white/5">
            <img src={files.appIcon.url} alt="EsgForge" className="w-9 h-9 rounded-lg ring-1 ring-cyan-400/30" />
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">EsgForge</span>
              <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">ESG Console</span>
            </div>
          </Link>

          <nav className="flex-1 px-3 py-5 space-y-1">
            {nav.map((item) => {
              const active =
                item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname?.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                    active
                      ? "bg-cyan-400/10 text-white border border-cyan-400/20"
                      : "text-slate-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <span className={`text-base ${active ? "text-cyan-300" : "text-slate-500"}`}>{item.icon}</span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-emerald-400 flex items-center justify-center text-slate-950 font-semibold text-sm">
                {(session?.user?.name || session?.user?.email || "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{session?.user?.name || "Account"}</p>
                <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
              </div>
            </div>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="w-full mt-2 justify-start text-slate-300 hover:text-white hover:bg-white/5 h-9"
            >
              Sign out
            </Button>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col lg:ml-0">
        <div className="h-16 border-b border-white/5 bg-[#0a0f1a]/70 backdrop-blur-xl flex items-center px-5 sm:px-8 lg:hidden">
          <Button
            onClick={() => setOpen(true)}
            variant="ghost"
            className="text-slate-300 hover:text-white p-2"
          >
            ☰
          </Button>
          <Link href="/" className="ml-3 flex items-center gap-2">
            <img src={files.appIcon.url} alt="EsgForge" className="w-7 h-7 rounded" />
            <span className="font-semibold text-white">EsgForge</span>
          </Link>
        </div>

        <main className="flex-1 px-5 sm:px-8 py-8">{children}</main>
      </div>
    </div>
  );
}
