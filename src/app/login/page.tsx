"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { files } from "@/assets/files";

function LoginForm() {
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    console.log("[login] attempting sign in", { email });

    try {
      const result = await signIn.email({ email, password });

      if (result.error) {
        console.error("[login] error", result.error);
        setError(result.error.message || "Invalid email or password.");
        setLoading(false);
        return;
      }

      setTimeout(() => {
        window.location.href = redirect;
      }, 400);
    } catch (err: any) {
      console.error("[login] exception", err);
      setError(err.message || "Could not sign you in. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8 group">
          <img src={files.appIcon.url} alt="Verdant" className="w-10 h-10 rounded-lg ring-1 ring-cyan-400/30" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold text-white tracking-tight">Verdant</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">ESG · Shopify Plus</span>
          </div>
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-7">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-400">Sign in to access your compliance dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-300">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </Button>

            <p className="text-center text-sm text-slate-400">
              No account yet?{" "}
              <Link href="/register" className="text-cyan-300 hover:text-cyan-200 font-medium">
                Create one
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Protected by industry-standard encryption. Your store data stays yours.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
