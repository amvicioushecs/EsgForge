"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/common/DashboardShell";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ProfilePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const user = session?.user;

  useEffect(() => {
    if (!isPending && !user) {
      router.replace("/login");
    }
  }, [isPending, user, router]);

  const handleLogout = async () => {
    await signOut();
    router.push("/");
  };

  if (isPending || !user) {
    return (
      <DashboardShell>
        <div className="h-40 rounded-2xl bg-white/5 animate-pulse" />
      </DashboardShell>
    );
  }

  const initial = (user.name?.charAt(0) || user.email?.charAt(0) || "U").toUpperCase();

  return (
    <DashboardShell>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Account</p>
        <h1 className="text-3xl sm:text-4xl font-semibold text-white">Your profile</h1>
        <p className="mt-2 text-slate-400 text-sm">Manage your EsgForge account and preferences.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl glass">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-400/30 to-cyan-400/5 border border-cyan-400/30 flex items-center justify-center text-3xl font-semibold text-cyan-200">
                {initial}
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-white truncate">{user.name || "EsgForge user"}</h2>
                <p className="text-sm text-slate-400 truncate">{user.email}</p>
                <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-300 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Active subscription
                </span>
              </div>
            </div>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Account information</h3>
            <dl className="grid sm:grid-cols-2 gap-5">
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">Full name</dt>
                <dd className="text-sm text-white mt-1">{user.name || "—"}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">Email</dt>
                <dd className="text-sm text-white mt-1 truncate">{user.email}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">Plan</dt>
                <dd className="text-sm text-white mt-1">Growth · $200/mo</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-widest text-slate-500">Billing</dt>
                <dd className="text-sm text-white mt-1">Renews monthly</dd>
              </div>
            </dl>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
            <h3 className="text-sm uppercase tracking-widest text-slate-400 mb-4">Security</h3>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-sm font-medium text-white">Password</p>
                <p className="text-xs text-slate-400 mt-0.5">Change your sign-in password.</p>
              </div>
              <Button
                variant="outline"
                disabled
                className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 disabled:opacity-50"
              >
                Change password
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-6 rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-cyan-400/10 to-transparent">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">Upgrade</p>
            <h3 className="text-lg font-semibold text-white">Unlock unlimited reports</h3>
            <p className="text-sm text-slate-300 mt-2">
              Move to Enterprise for unlimited stores, custom frameworks, and a dedicated compliance partner.
            </p>
            <Button className="mt-4 w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
              Talk to sales
            </Button>
          </div>

          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-400 mb-2">Session</p>
            <p className="text-sm text-slate-300 mb-4">
              Signed in as <span className="text-white">{user.email}</span>.
            </p>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full text-red-300 hover:bg-red-500/10 border border-red-500/20"
            >
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
