import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminSession, isAdminConfigured } from "@/lib/admin-auth";
import { PartnersAdminClient } from "./PartnersAdminClient";

// Force SSR — auth check must run server-side on every request.
export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  // If no admin email is configured, 404 — never expose this page.
  if (!isAdminConfigured()) {
    console.warn("[admin/partners] ADMIN_EMAILS not configured — returning 404");
    notFound();
  }
  const session = await getAdminSession();
  if (!session) {
    notFound();
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
  // Always use the canonical brand URL in the displayed referral links,
  // since that's what partners will paste publicly.
  const brandUrl = "https://www.esgforge.xyz";

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 font-sans">
      <header className="border-b border-white/5 bg-[#0f172a]/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs uppercase tracking-[0.3em] text-cyan-300 hover:text-cyan-200 transition"
            >
              ← EsgForge
            </Link>
            <span className="text-slate-600">/</span>
            <span className="text-sm text-white font-semibold">Partners</span>
          </div>
          <div className="text-xs text-slate-400">
            Signed in as <span className="text-slate-200">{session.user.email}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        <div className="mb-10">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-2">
            Founding Partners
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold text-white">
            Partner referral dashboard
          </h1>
          <p className="mt-3 text-slate-400 max-w-2xl">
            Onboard agencies, generate their referral link, and track clicks and waitlist
            conversions in one place.
          </p>
        </div>

        <PartnersAdminClient brandUrl={brandUrl} appUrl={appUrl} />
      </main>
    </div>
  );
}
