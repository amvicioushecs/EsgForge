import Link from "next/link";
import { SiteHeader } from "@/components/common/SiteHeader";
import { Button } from "@/components/ui/button";
import { files } from "@/assets/files";
import { WaitlistForm } from "@/components/landing/WaitlistForm";

const features = [
  {
    title: "Shopify Plus Integration",
    desc: "Securely connect your store to pull sales, shipping, and supplier data in one click.",
    icon: "🛍️",
    tone: "from-cyan-400/20 to-cyan-400/0",
  },
  {
    title: "ESG Data Processing",
    desc: "We map your raw store data to CSRD, SEC, GRI and TCFD disclosure frameworks automatically.",
    icon: "🧬",
    tone: "from-emerald-400/20 to-emerald-400/0",
  },
  {
    title: "Audit-Ready Reports",
    desc: "Generate compliant PDF and structured disclosures, traceable to the underlying transactions.",
    icon: "📑",
    tone: "from-amber-400/20 to-amber-400/0",
  },
  {
    title: "Live Compliance Score",
    desc: "Track your environmental, social and governance score with trend analysis over time.",
    icon: "📈",
    tone: "from-violet-400/20 to-violet-400/0",
  },
  {
    title: "Smart Alerts",
    desc: "Get notified about new regulations, missing data, report readiness, and filing deadlines.",
    icon: "🔔",
    tone: "from-rose-400/20 to-rose-400/0",
  },
  {
    title: "Bank-Grade Security",
    desc: "Encrypted at rest, isolated per merchant, with strict access controls and audit logging.",
    icon: "🛡️",
    tone: "from-sky-400/20 to-sky-400/0",
  },
];

const frameworks = [
  { tag: "CSRD", note: "EU Corporate Sustainability Reporting" },
  { tag: "SEC", note: "US climate disclosure rules" },
  { tag: "GRI", note: "Global Reporting Initiative" },
  { tag: "TCFD", note: "Task Force on Climate-related Financial Disclosures" },
];

const steps = [
  {
    n: "01",
    title: "Connect",
    body: "Plug in your Shopify Plus store. We map your transactions, suppliers, and logistics in under five minutes.",
  },
  {
    n: "02",
    title: "Process",
    body: "Our engine translates orders, shipping miles, and supplier footprints into ESG indicators aligned to your framework.",
  },
  {
    n: "03",
    title: "Report",
    body: "Generate audit-ready disclosures, export PDFs and structured data, and share access with auditors and counsel.",
  },
];

const pricing = [
  {
    name: "Starter",
    price: "$200",
    period: "/ month",
    blurb: "For Shopify Plus merchants under $5M ARR.",
    bullets: [
      "1 Shopify Plus store",
      "Monthly compliance score",
      "CSRD + GRI report templates",
      "Email alerts",
    ],
    cta: "Start free trial",
    featured: false,
  },
  {
    name: "Growth",
    price: "$500",
    period: "/ month",
    blurb: "For merchants between $5M and $100M ARR.",
    bullets: [
      "Up to 5 stores",
      "All disclosure frameworks",
      "Quarterly audit-ready PDFs",
      "Dedicated success manager",
      "Priority support",
    ],
    cta: "Start free trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "For Shopify Plus brands above $100M ARR.",
    bullets: [
      "Unlimited stores",
      "Custom data pipelines",
      "Bespoke implementation",
      "SLA and onboarding team",
      "Legal and audit liaison",
    ],
    cta: "Talk to us",
    featured: false,
  },
];

const faqs = [
  {
    q: "Which frameworks do you support today?",
    a: "EsgForge ships with templates for CSRD (Europe), the SEC climate disclosure rule (US), GRI Standards, and TCFD. Custom frameworks are available on Enterprise.",
  },
  {
    q: "Is EsgForge a replacement for my auditor?",
    a: "No. EsgForge prepares structured, traceable disclosures and supporting evidence so your auditor or sustainability consultant can sign off quickly.",
  },
  {
    q: "How does the Shopify Plus integration work?",
    a: "We use Shopify's official admin APIs with read-only scopes. You authorize EsgForge from your Shopify admin, and we pull orders, shipping zones, and supplier data on a recurring schedule.",
  },
  {
    q: "Where is my data stored?",
    a: "All data is encrypted at rest, scoped to your account, and accessible only to users you invite. We never sell or share your data.",
  },
];

export default function Main() {
  return (
    <div className="relative overflow-hidden grain">
      <SiteHeader variant="landing" />

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/3 w-[700px] h-[700px] rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-40 -right-32 w-[500px] h-[500px] rounded-full bg-emerald-500/10 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-xs tracking-wider uppercase text-cyan-300 mb-7">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-ring" />
                Sustainability reporting on autopilot
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold text-white leading-[1.02]">
                ESG compliance,
                <br />
                <span className="italic font-light text-cyan-300/95">automated end‑to‑end</span>
                <span className="text-white"> for Shopify Plus.</span>
              </h1>

              <p className="mt-7 text-lg text-slate-300/90 max-w-2xl leading-relaxed">
                EsgForge pulls live data from your store, maps it to CSRD, SEC, GRI and TCFD
                disclosures, and produces audit-ready reports — without spreadsheets, without a
                sustainability team.
              </p>

              <div className="mt-9 flex flex-col sm:flex-row gap-3 flex-wrap">
                <Link href="/demo">
                  <Button
                    variant="outline"
                    className="h-12 px-7 text-base bg-white/5 border-white/10 text-white hover:bg-white/10"
                  >
                    See a live demo
                  </Button>
                </Link>
                <a href="#waitlist">
                  <Button className="h-12 px-7 text-base bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold glow-accent">
                    Join the Founding Merchants waitlist
                  </Button>
                </a>
              </div>

              <div className="mt-10 flex items-center gap-6 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  No credit card required
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  5-minute Shopify setup
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  Cancel anytime
                </div>
              </div>
            </div>

            {/* Hero visual: abstract illustration pointing to the demo */}
            <div className="lg:col-span-5">
              <div className="relative">
                <div className="absolute -inset-6 bg-gradient-to-tr from-cyan-500/20 via-transparent to-emerald-500/20 blur-3xl rounded-3xl" />
                <div className="relative glass rounded-2xl p-7 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-slate-400">Interactive walkthrough</p>
                      <p className="text-lg font-semibold text-white mt-0.5">See EsgForge in action</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-md bg-cyan-400/10 text-cyan-300 border border-cyan-400/20">
                      No login needed
                    </span>
                  </div>

                  <p className="text-sm text-slate-300/90 leading-relaxed">
                    Explore a fully populated sample dashboard with a sample Shopify Plus merchant,
                    Scope 1 / 2 / 3 emissions metrics, and an audit-ready ESG report —
                    rendered locally in your browser. No account required, nothing is saved.
                  </p>

                  <div className="mt-6 grid grid-cols-3 gap-3">
                    {[
                      { tag: "E", name: "Environmental", color: "bg-emerald-400" },
                      { tag: "S", name: "Social", color: "bg-cyan-400" },
                      { tag: "G", name: "Governance", color: "bg-violet-400" },
                    ].map((p) => (
                      <div key={p.tag} className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                        <p className="text-[10px] uppercase tracking-widest text-slate-400">{p.name}</p>
                        <div className="mt-3 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${p.color}`} />
                          <span className="text-xs text-slate-300">Pillar</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <Link href="/demo" className="mt-7 block">
                    <Button className="w-full h-11 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                      Launch demo →
                    </Button>
                  </Link>

                  <p className="mt-3 text-[11px] text-slate-500 text-center">
                    Sample data only · nothing written to your account or our database
                  </p>
                </div>

                <div className="absolute -top-3 -right-3 glass rounded-xl px-3 py-2 text-xs text-cyan-200 flex items-center gap-2 float-slow">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> Live in-browser
                </div>
                <div className="absolute -bottom-3 -left-3 glass rounded-xl px-3 py-2 text-xs text-emerald-200 flex items-center gap-2 float-slow" style={{ animationDelay: "1.5s" }}>
                  Exit anytime — no traces left
                </div>
              </div>
            </div>
          </div>

          {/* Framework strip */}
          <div className="mt-20 pt-10 border-t border-white/5">
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500 mb-5">Aligned with</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {frameworks.map((f) => (
                <div
                  key={f.tag}
                  className="px-5 py-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition"
                >
                  <p className="text-2xl font-semibold text-white tracking-tight">{f.tag}</p>
                  <p className="text-xs text-slate-400 mt-1">{f.note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WAITLIST */}
      <section id="waitlist" className="relative py-20 border-t border-white/5 scroll-mt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-10 right-1/4 w-[420px] h-[420px] rounded-full bg-cyan-500/10 blur-3xl" />
        </div>
        <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
          <div className="grid lg:grid-cols-12 gap-10 items-start">
            <div className="lg:col-span-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-cyan-400/20 bg-cyan-400/5 text-xs tracking-wider uppercase text-cyan-300 mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-ring" />
                Early access
              </div>
              <h2 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
                Join the Founding Merchants waitlist
              </h2>
              <p className="mt-5 text-lg text-slate-300/90 leading-relaxed max-w-xl">
                First 100 Shopify Plus merchants lock in founding launch pricing — for life.
                Refer other merchants to jump the line.
              </p>

              <ul className="mt-8 space-y-3 text-sm text-slate-300/85">
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-cyan-400/15 text-cyan-300 flex items-center justify-center text-xs">1</span>
                  <span><span className="text-white font-medium">Reserve your spot</span> with just your work email — no card, no commitment.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-cyan-400/15 text-cyan-300 flex items-center justify-center text-xs">2</span>
                  <span><span className="text-white font-medium">Share your referral link</span> — every Shopify Plus merchant who joins through it bumps you up the queue.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-md bg-cyan-400/15 text-cyan-300 flex items-center justify-center text-xs">3</span>
                  <span><span className="text-white font-medium">Lock in founding pricing</span> if you land in the top 100. Forever.</span>
                </li>
              </ul>

              <p className="mt-8 text-xs text-slate-500">
                Prefer to look around first? <Link href="/demo" className="text-cyan-300 hover:text-cyan-200">See the live demo →</Link>
              </p>
            </div>

            <div className="lg:col-span-6">
              <WaitlistForm />
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-4">Built for merchants</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
              Everything you need to stay compliant — and nothing you don&apos;t.
            </h2>
            <p className="mt-5 text-slate-300/90 text-lg">
              We focus on the disclosures Shopify Plus merchants actually need. No sprawling enterprise
              modules, no consultancy day-rates. Just sustainability reporting that works.
            </p>
          </div>

          <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f) => (
              <div
                key={f.title}
                className="relative group p-7 rounded-2xl border border-white/5 bg-gradient-to-br from-white/[0.03] to-transparent hover:from-white/[0.06] transition overflow-hidden"
              >
                <div
                  className={`absolute -top-20 -right-20 w-48 h-48 rounded-full bg-gradient-to-b ${f.tone} blur-2xl opacity-60`}
                />
                <div className="relative">
                  <span className="text-3xl">{f.icon}</span>
                  <h3 className="mt-4 text-lg font-semibold text-white">{f.title}</h3>
                  <p className="mt-2 text-sm text-slate-300/85 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="flex items-end justify-between flex-wrap gap-6 mb-14">
            <div className="max-w-xl">
              <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-4">How it works</p>
              <h2 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
                From a Shopify install to an audit-ready PDF.
              </h2>
            </div>
            <p className="text-sm text-slate-400 max-w-md">
              We handle the data plumbing, the regulatory mapping, and the report formatting.
              You review and sign.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {steps.map((s, i) => (
              <div key={s.n} className="relative p-7 rounded-2xl glass">
                <div className="absolute inset-x-0 -top-px h-px shimmer-line opacity-50" />
                <p className="text-xs uppercase tracking-[0.25em] text-cyan-300">Step {s.n}</p>
                <h3 className="mt-3 text-2xl font-semibold text-white">{s.title}</h3>
                <p className="mt-3 text-sm text-slate-300/85 leading-relaxed">{s.body}</p>
                {i < steps.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-gradient-to-r from-cyan-400/50 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="relative py-24 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-4">Founding cohort offer</p>
            <h2 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
              Founding Client Pricing.
            </h2>
            <p className="mt-5 text-slate-300/90 text-lg">
              Locked for life for the first 100 merchants. These rates are reserved for our
              founding cohort — they&apos;re not the standard list price.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {pricing.map((p) => (
              <div
                key={p.name}
                className={`relative p-8 rounded-2xl flex flex-col ${
                  p.featured
                    ? "glass glow-accent ring-1 ring-cyan-400/40"
                    : "border border-white/5 bg-white/[0.02]"
                }`}
              >
                {p.featured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs uppercase tracking-widest rounded-full bg-cyan-400 text-slate-950 font-semibold">
                    Most chosen
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <h3 className="text-2xl font-semibold text-white">{p.name}</h3>
                  <span className="px-2.5 py-1 text-[10px] uppercase tracking-widest rounded-full bg-cyan-400/10 text-cyan-300 border border-cyan-400/30 font-semibold">
                    Founding Client
                  </span>
                </div>
                <p className="text-sm text-slate-400 mt-2">{p.blurb}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-5xl font-semibold text-white">{p.price}</span>
                  <span className="text-slate-400 text-sm">{p.period}</span>
                </div>
                <p className="mt-3 text-xs text-cyan-200/90 leading-relaxed border-l-2 border-cyan-400/40 pl-3">
                  Lock this founding rate for life — price never increases as long as you stay
                  subscribed. Available only to the founding cohort (first 100 merchants).
                </p>
                <ul className="mt-6 space-y-3 text-sm text-slate-300">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2">
                      <span className="text-cyan-300 mt-0.5">✓</span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-7">
                  <Button
                    className={`w-full h-11 font-semibold ${
                      p.featured
                        ? "bg-cyan-400 hover:bg-cyan-300 text-slate-950"
                        : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
                    }`}
                  >
                    {p.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative py-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <p className="text-xs uppercase tracking-[0.25em] text-cyan-300 mb-4 text-center">FAQ</p>
          <h2 className="text-4xl sm:text-5xl font-semibold text-white text-center leading-tight">
            Common questions.
          </h2>

          <div className="mt-12 space-y-4">
            {faqs.map((item) => (
              <details
                key={item.q}
                className="group p-6 rounded-xl border border-white/5 bg-white/[0.02] open:bg-white/[0.04] transition"
              >
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="text-base font-medium text-white">{item.q}</span>
                  <span className="text-cyan-300 text-xl group-open:rotate-45 transition">+</span>
                </summary>
                <p className="mt-3 text-sm text-slate-300/85 leading-relaxed">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-24">
        <div className="max-w-4xl mx-auto px-5 sm:px-8">
          <div className="relative p-10 sm:p-14 rounded-3xl glass overflow-hidden">
            <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-cyan-400/15 blur-3xl" />
            <div className="relative text-center">
              <h2 className="text-4xl sm:text-5xl font-semibold text-white leading-tight">
                Make your next audit a 15-minute review.
              </h2>
              <p className="mt-5 text-slate-300/90 text-lg max-w-xl mx-auto">
                Join Shopify Plus merchants treating ESG as an asset, not a burden.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/register">
                  <Button className="h-12 px-7 text-base bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold">
                    Start your free trial
                  </Button>
                </Link>
                <Link href="/demo">
                  <Button
                    variant="outline"
                    className="h-12 px-7 text-base bg-transparent border-white/10 text-white hover:bg-white/5"
                  >
                    See a live demo
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
          <div className="flex items-center gap-2">
            <img src={files.appIcon.url} alt="EsgForge" className="w-6 h-6 rounded" />
            <span>© {new Date().getFullYear()} EsgForge. Built for Shopify Plus merchants.</span>
          </div>
          <div className="flex gap-6">
            <Link href="/privacy-policy" className="hover:text-cyan-300 transition">Privacy</Link>
            <Link href="/terms-of-service" className="hover:text-cyan-300 transition">Terms</Link>
            <Link href="/login" className="hover:text-cyan-300 transition">Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
