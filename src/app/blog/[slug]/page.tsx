import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/common/SiteHeader";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";
import { blogPosts, getPostBySlug, type BlogBlock } from "@/lib/blog-posts";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found — EsgForge",
      description: "The article you're looking for doesn't exist.",
    };
  }

  return {
    title: `${post.title} — EsgForge`,
    description: post.metaDescription,
    openGraph: {
      title: post.title,
      description: post.metaDescription,
      type: "article",
      publishedTime: post.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.metaDescription,
    },
  };
}

export function generateStaticParams() {
  return blogPosts.map((p) => ({ slug: p.slug }));
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function renderBlock(block: BlogBlock, idx: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={idx}
          className="mt-12 mb-4 text-2xl sm:text-3xl font-semibold text-white tracking-tight"
        >
          {block.text}
        </h2>
      );
    case "h3":
      return (
        <h3
          key={idx}
          className="mt-8 mb-3 text-xl font-semibold text-white tracking-tight"
        >
          {block.text}
        </h3>
      );
    case "p":
      return (
        <p key={idx} className="mb-5 text-[15px] leading-7 text-slate-300/90">
          {block.text}
        </p>
      );
    case "ul":
      return (
        <ul key={idx} className="mb-5 list-disc pl-6 space-y-2 text-[15px] leading-7 text-slate-300/90 marker:text-cyan-400/70">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={idx} className="mb-5 list-decimal pl-6 space-y-2 text-[15px] leading-7 text-slate-300/90 marker:text-cyan-400/70">
          {block.items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote
          key={idx}
          className="mb-5 border-l-2 border-cyan-400/60 pl-5 italic text-slate-200"
        >
          {block.text}
        </blockquote>
      );
    default:
      return null;
  }
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-slate-200">
      <SiteHeader variant="landing" />

      <article className="relative pt-10 pb-20">
        <div className="absolute inset-x-0 top-0 h-[500px] pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/3 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-[780px] mx-auto px-5 sm:px-8">
          <div className="mb-6">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-cyan-300 transition"
            >
              <span aria-hidden>←</span> Back to blog
            </Link>
          </div>

          <header className="mb-10">
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-slate-500 mb-4">
              <span>{formatDate(post.publishedAt)}</span>
              <span aria-hidden>·</span>
              <span>{post.readTimeMinutes} min read</span>
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold text-white tracking-tight leading-[1.15]">
              {post.title}
            </h1>
            <p className="mt-5 text-lg text-slate-300/85 leading-relaxed">
              {post.excerpt}
            </p>
          </header>

          <div className="prose-blog">
            {post.body.map((block, idx) => renderBlock(block, idx))}
          </div>

          <div className="mt-16 p-8 sm:p-10 rounded-2xl glass relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-3">Try EsgForge</p>
              <h2 className="text-2xl sm:text-3xl font-semibold text-white leading-tight">
                Stop wrestling with spreadsheets.
              </h2>
              <p className="mt-3 text-slate-300/90">
                EsgForge connects to your Shopify Plus store and produces audit-ready CSRD, SEC, GRI,
                and TCFD disclosures — automatically. 14-day free trial, no card required.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <Link href="/register">
                  <Button className="h-11 px-6 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                    Start your free trial
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button
                    variant="outline"
                    className="h-11 px-6 bg-transparent border-white/10 text-white hover:bg-white/5"
                  >
                    Read more articles
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

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
