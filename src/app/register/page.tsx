"use client";

import { useState } from "react";
import { signUp } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { files } from "@/assets/files";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    console.log("[register] signing up", { email: formData.email });

    try {
      const result = await signUp.email({
        email: formData.email,
        password: formData.password,
        name: formData.name,
      });

      if (result.error) {
        console.error("[register] error", result.error);
        setError(result.error.message || "Could not create your account. The email might already be in use.");
        setLoading(false);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("[register] exception", err);
      setError(err.message || "Could not create your account.");
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
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <img src={files.appIcon.url} alt="EsgForge" className="w-10 h-10 rounded-lg ring-1 ring-cyan-400/30" />
          <div className="flex flex-col leading-none">
            <span className="text-base font-semibold text-white tracking-tight">EsgForge</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">ESG · Shopify Plus</span>
          </div>
        </Link>

        <div className="glass rounded-2xl p-8">
          <div className="text-center mb-7">
            <h1 className="text-3xl font-semibold text-white tracking-tight">Create your account</h1>
            <p className="mt-2 text-sm text-slate-400">14-day free trial. No card required.</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            {error && (
              <Alert variant="destructive" className="bg-red-500/10 border-red-500/30 text-red-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-slate-300">Full name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Your name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-slate-300">Work email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@brand.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-slate-300">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="At least 6 characters"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm text-slate-300">Confirm password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                className="h-11 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:border-cyan-400/60"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold disabled:opacity-60"
            >
              {loading ? "Creating account…" : "Create account"}
            </Button>

            <p className="text-center text-sm text-slate-400">
              Already have an account?{" "}
              <Link href="/login" className="text-cyan-300 hover:text-cyan-200 font-medium">
                Sign in
              </Link>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By creating an account you agree to our{" "}
          <Link href="/terms-of-service" className="text-slate-300 hover:text-cyan-300">Terms</Link> and{" "}
          <Link href="/privacy-policy" className="text-slate-300 hover:text-cyan-300">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
