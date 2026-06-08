"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";

export function SiteHeader({ variant = "landing" }: { variant?: "landing" | "app" }) {
  const { data: session, isPending } = useSession();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", onScroll);
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/";
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${
        scrolled ? "backdrop-blur-xl bg-[#0a0f1a]/80 border-b border-white/5" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <img
              src={files.appIcon.url}
              alt="EsgForge"
              className="w-9 h-9 rounded-lg object-cover ring-1 ring-cyan-400/30 group-hover:ring-cyan-400/60 transition"
            />
            <div className="absolute inset-0 rounded-lg bg-cyan-400/0 group-hover:bg-cyan-400/10 transition pointer-events-none" />
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-semibold tracking-tight text-white">EsgForge</span>
            <span className="text-[10px] uppercase tracking-[0.18em] text-cyan-400/80">ESG · Shopify Plus</span>
          </div>
        </Link>

        {variant === "landing" && (
          <nav className="hidden md:flex items-center gap-7 text-sm text-slate-300">
            <a href="#features" className="hover:text-cyan-300 transition">Features</a>
            <a href="#how" className="hover:text-cyan-300 transition">How it works</a>
            <a href="#pricing" className="hover:text-cyan-300 transition">Pricing</a>
            <a href="#faq" className="hover:text-cyan-300 transition">FAQ</a>
          </nav>
        )}

        <div className="flex items-center gap-2">
          {isPending ? (
            <div className="h-9 w-24 rounded-md bg-white/5 animate-pulse" />
          ) : session ? (
            <>
              <Link href="/dashboard">
                <Button
                  variant="ghost"
                  className="text-slate-200 hover:text-white hover:bg-white/5 h-9"
                >
                  Dashboard
                </Button>
              </Link>
              <Button
                onClick={handleSignOut}
                className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold h-9"
              >
                Sign out
              </Button>
            </>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-block">
                <Button
                  variant="ghost"
                  className="text-slate-200 hover:text-white hover:bg-white/5 h-9"
                >
                  Log in
                </Button>
              </Link>
              <Link href="/register">
                <Button className="bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold h-9">
                  Get started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
