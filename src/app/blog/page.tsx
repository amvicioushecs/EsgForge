import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/common/SiteHeader";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";
import { getAllPosts } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog — EsgForge",
  description:
    "Practical guides, comparisons, and explainers on ESG reporting, CSRD, SEC climate rules, and sustainability automation for Shopify Plus merchants.",
  openGraph: {
    title: "Blog — EsgForge",
    description:
      "Practical guides, comparisons, and explainers on ESG reporting, CSRD, SEC climate rules, and sustainability automation for Shopify Plus merchants.",
    type: "website",
  },
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BlogIndexPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <SiteHeader variant="landing" />

      <section className="relative pt-16 pb-12 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 left-1/4 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-5 sm:px-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-3">Blog</p>
          <h1 className="text-4xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            ESG, CSRD, and Shopify Plus — explained.
          </h1>
          <p className="mt-4 text-slate-300/85 text-lg max-w-2xl">
            Plain-language guides for merchants navigating mandatory sustainability reporting.
            No jargon, no greenwashing, no fluff.
          </p>
        </div>
      </section>

      <section className="relative pb-24">
        <div className="max-w-5xl mx-auto px-5 sm:px-8">
          {posts.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-white/10 rounded-2xl">
              <p className="text-slate-400">No articles yet. Check back soon.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {posts.map((post) => (
                <article
                  key={post.slug}
                  className="group flex flex-col p-7 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-cyan-400/20 transition"
                >
                  <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-500 mb-4">
                    <span>{formatDate(post.publishedAt)}</span>
                    <span aria-hidden>·</span>
                    <span>{post.readTimeMinutes} min read</span>
                  </div>

                  <h2 className="text-xl sm:text-2xl font-semibold text-white leading-snug group-hover:text-cyan-200 transition">
                    <Link href={`/blog/${post.slug}`}>{post.title}</Link>
                  </h2>

                  <p className="mt-3 text-sm text-slate-300/85 leading-relaxed flex-1">
                    {post.excerpt}
                  </p>

                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-cyan-300 hover:text-cyan-200 transition"
                  >
                    Read more
                    <span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="relative py-20 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative p-10 sm:p-12 rounded-3xl glass overflow-hidden text-center">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl font-semibold text-white">
                Ready to automate your ESG reporting?
              </h2>
              <p className="mt-4 text-slate-300/90 max-w-xl mx-auto">
                Connect your Shopify Plus store and produce an audit-ready CSRD draft in days, not months.
              </p>
              <div className="mt-7 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <Button className="h-12 px-7 text-base bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                    Start your free trial
                  </Button>
                </Link>
                <Link href="/">
                  <Button
                    variant="outline"
                    className="h-12 px-7 text-base bg-transparent border-white/10 text-white hover:bg-white/5"
                  >
                    See how it works
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <img src={files.appIcon.url} alt="EsgForge" className="w-6 h-6 rounded" />
            <span>© {new Date().getFullYear()} EsgForge. Built for Shopify Plus merchants.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/blog" className="hover:text-cyan-300 transition">Blog</Link>
            <Link href="/privacy-policy" className="hover:text-cyan-300 transition">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-cyan-300 transition">Terms</Link>
            <Link href="/login" className="hover:text-cyan-300 transition">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
