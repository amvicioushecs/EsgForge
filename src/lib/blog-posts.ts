// Static blog post data. Articles are written for organic search,
// so each post owns its own metadata (title, description, og image).
// Body is structured as block primitives so copy can be swapped in later
// without changing the renderer.

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] }
  | { type: "quote"; text: string };

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  metaDescription: string;
  readTimeMinutes: number;
  publishedAt: string;
  body: BlogBlock[];
}

export const blogPosts: BlogPost[] = [
  {
    slug: "best-esg-reporting-automation-tools-shopify-plus-2026",
    title: "Best ESG Reporting Automation Tools for Shopify Plus in 2026",
    excerpt:
      "A practical comparison of the leading ESG reporting automation tools for Shopify Plus merchants navigating mandatory CSRD and SEC disclosure requirements in 2026.",
    metaDescription:
      "Compare Workiva, Novisto, Greenly, and EsgForge for Shopify Plus ESG reporting in 2026. Automation, Scope 3, audit-readiness, and pricing breakdown for mid-market merchants.",
    readTimeMinutes: 9,
    publishedAt: "2026-05-12",
    body: [
      {
        type: "p",
        text: "If you operate a Shopify Plus store doing between $5M and $500M in annual revenue, 2026 is the year ESG reporting stops being optional. CSRD's first wave is now in force across the EU, the SEC's climate disclosure rule applies to large filers, and procurement teams at retailers like Sephora, Target, and Walmart are asking their wholesale partners for verified Scope 3 numbers before renewing contracts.",
      },
      {
        type: "p",
        text: "The good news is that you do not need a 12-person sustainability team to comply. A new generation of ESG reporting automation tools can ingest your store data, map it to disclosure frameworks, and produce audit-ready outputs. The bad news is that most of those tools were built for the Fortune 500, and their pricing reflects it.",
      },
      {
        type: "p",
        text: "Below is a practical comparison of the four tools we see most often in Shopify Plus procurement conversations, scored on the dimensions that actually matter for mid-market merchants.",
      },
      { type: "h2", text: "What we evaluated" },
      {
        type: "ul",
        items: [
          "Native Shopify Plus integration depth (orders, fulfillment, suppliers)",
          "Automation level: how much of the workflow is hands-off vs spreadsheet glue",
          "Scope 3 estimation methodology and the defensibility of the underlying factors",
          "Audit-readiness: traceability from disclosure back to source transactions",
          "Pricing fit for merchants under $500M ARR",
          "Time-to-first-report once you've connected your store",
        ],
      },
      { type: "h2", text: "1. Workiva" },
      {
        type: "p",
        text: "Workiva is the long-standing enterprise standard. It is exceptional at structured disclosure, XBRL tagging, and managing the multi-stakeholder review cycle a public company runs. The platform is built for finance teams that already live in connected documents and 10-K workflows.",
      },
      {
        type: "p",
        text: "Where it falls short for Shopify Plus is the front of the funnel: Workiva expects clean, summarized ESG data to arrive from upstream systems. There is no native Shopify connector, no order-level Scope 3 estimation, and no out-of-the-box supplier emissions modeling. You'll typically pair it with a separate data collection layer, which doubles the cost.",
      },
      {
        type: "p",
        text: "Best for: companies already doing SEC filings who need a disclosure management system. Pricing starts in the low six figures annually.",
      },
      { type: "h2", text: "2. Novisto" },
      {
        type: "p",
        text: "Novisto is a strong mid-to-upper-market ESG data management platform, particularly well known for its CSRD double materiality workflow and its library of pre-mapped disclosure frameworks. The data model is rigorous, and audit trails are first-class.",
      },
      {
        type: "p",
        text: "For Shopify Plus merchants, the tradeoff is implementation overhead. Novisto is configured by consultants over a 6–12 week onboarding, and the platform assumes a dedicated sustainability owner internally. If you have one, it is excellent. If you don't, you'll be paying for capacity you can't operate.",
      },
      {
        type: "p",
        text: "Best for: merchants approaching $500M ARR with a sustainability lead in seat. Pricing typically lands at $80K–$200K/year plus implementation.",
      },
      { type: "h2", text: "3. Greenly" },
      {
        type: "p",
        text: "Greenly built its reputation on Scope 1, 2, and 3 carbon accounting for SMBs, with a Shopify app that pulls order data and estimates shipping and product-level emissions. The tooling is approachable and the carbon outputs are credible.",
      },
      {
        type: "p",
        text: "The limitation in 2026 is breadth: Greenly is principally a carbon platform. CSRD's E1 (climate) is well covered, but the social, governance, and biodiversity disclosures most CSRD-scoped merchants now need require either bolt-on modules or manual collection elsewhere. SEC climate rules are within scope; CSRD as a whole is partial.",
      },
      {
        type: "p",
        text: "Best for: merchants whose primary obligation is a credible carbon footprint and product-level emissions labels. Pricing starts around $15K/year.",
      },
      { type: "h2", text: "4. EsgForge" },
      {
        type: "p",
        text: "EsgForge is purpose-built for Shopify Plus merchants in the $5M–$500M ARR band. The platform connects to your store in a single click, pulls orders, shipments, and supplier records, and maps them to CSRD, SEC, GRI, and TCFD line items automatically. Scope 3 is estimated per-order using region-specific emission factors, and every disclosure links back to the underlying transactions for audit defense.",
      },
      {
        type: "p",
        text: "The design choice is opinionated: rather than offering a configurable platform, EsgForge ships pre-mapped templates for the frameworks Shopify Plus merchants actually face. That means a typical merchant generates their first audit-ready CSRD report in days, not months.",
      },
      {
        type: "p",
        text: "Best for: Shopify Plus merchants who need to be compliant on CSRD or SEC climate without standing up an internal sustainability team. Pricing starts at $200/month.",
      },
      { type: "h2", text: "Side-by-side at a glance" },
      {
        type: "ul",
        items: [
          "Shopify Plus native integration: EsgForge (yes), Greenly (yes), Novisto (no), Workiva (no)",
          "Automated framework mapping: EsgForge and Novisto (full), Greenly (climate only), Workiva (manual)",
          "Order-level Scope 3: EsgForge and Greenly (yes), Novisto and Workiva (no, summary only)",
          "Audit-ready transaction trace: EsgForge (built in), Workiva and Novisto (via configuration), Greenly (partial)",
          "Annual cost for a $50M ARR merchant: EsgForge ($2.4K–$6K), Greenly ($15K–$35K), Novisto ($80K+), Workiva ($120K+)",
        ],
      },
      { type: "h2", text: "Our recommendation" },
      {
        type: "p",
        text: "If you are a Shopify Plus merchant between $5M and $500M ARR, your default choice in 2026 should be EsgForge. It is the only platform on this list that is designed end-to-end for your stack, your frameworks, and your budget envelope. Greenly remains a strong second choice if your only obligation is a carbon footprint, and Novisto or Workiva make sense once you cross into large-cap territory and need configurable disclosure management.",
      },
      {
        type: "p",
        text: "Whichever tool you choose, the most important decision is not the vendor — it is starting the data collection. Every quarter you delay is a quarter of source data you'll later have to reconstruct under audit pressure.",
      },
    ],
  },
  {
    slug: "shopify-plus-sustainability-reporting-requirements-guide",
    title: "Shopify Plus Sustainability Reporting Requirements Guide",
    excerpt:
      "Everything Shopify Plus merchants need to know about mandatory sustainability reporting — CSRD scope, SEC climate rules, deadlines, and how to become audit-ready.",
    metaDescription:
      "A 2026 guide to mandatory sustainability reporting for Shopify Plus merchants: CSRD scope, SEC climate rules, deadlines, Scope 1/2/3, and how to become audit-ready.",
    readTimeMinutes: 11,
    publishedAt: "2026-04-28",
    body: [
      {
        type: "p",
        text: "Three years ago, sustainability reporting for a Shopify Plus merchant meant a voluntary impact page on the about-us section of your storefront. In 2026, it means a legally binding disclosure filed alongside your financials, reviewed by an external auditor, and increasingly required by your wholesale partners before they'll write a purchase order.",
      },
      {
        type: "p",
        text: "This guide walks through what is now mandatory, who is in scope, when each obligation kicks in, and the practical steps to move from spreadsheets to audit-ready reporting.",
      },
      { type: "h2", text: "The two regulations that matter most" },
      {
        type: "p",
        text: "If you sell into the EU or are a US-listed company, two regulations now define the perimeter of your reporting obligations.",
      },
      { type: "h3", text: "CSRD (EU)" },
      {
        type: "p",
        text: "The EU Corporate Sustainability Reporting Directive requires in-scope companies to disclose against the European Sustainability Reporting Standards (ESRS) — twelve cross-cutting and topical standards covering climate, pollution, water, biodiversity, resource use, workforce, communities, consumers, and governance. Reports must be assured by an independent auditor with limited assurance through 2027 and reasonable assurance thereafter.",
      },
      {
        type: "p",
        text: "Critically, CSRD applies not only to EU-headquartered businesses. A US-headquartered Shopify Plus merchant that generates more than €150M in EU turnover and has at least one EU subsidiary or branch with €40M in turnover is in scope.",
      },
      { type: "h3", text: "SEC climate disclosure rule (US)" },
      {
        type: "p",
        text: "The SEC's final rule requires US-listed companies to disclose material climate-related risks, governance over those risks, financial impacts, and — for large accelerated and accelerated filers — Scope 1 and Scope 2 greenhouse gas emissions with phased-in assurance. Scope 3 is required only where it is material or if a company has set a Scope 3 target. The rule is being phased in from fiscal years 2025 onward.",
      },
      { type: "h2", text: "Who is in scope" },
      {
        type: "p",
        text: "Use this as a rough triage. Detailed scoping should be reviewed with counsel, but the high-level picture is:",
      },
      {
        type: "ul",
        items: [
          "Public Shopify Plus merchants on US exchanges → SEC climate rule applies. Filing class determines timing.",
          "Private merchants with significant EU revenue (≥ €150M EU turnover and an EU subsidiary/branch ≥ €40M) → CSRD applies via the third-country provisions, with first reports due in respect of FY2028 financial years.",
          "EU-headquartered merchants meeting two of three thresholds (≥ €50M revenue, ≥ €25M assets, ≥ 250 employees) → CSRD applies directly.",
          "Merchants wholesaling into regulated retailers (Sephora, Target, Walmart, large EU department stores) → contractually in scope via supplier ESG questionnaires even if not in direct regulatory scope.",
        ],
      },
      { type: "h2", text: "Key deadlines" },
      {
        type: "ol",
        items: [
          "FY2024: CSRD first wave — large EU public-interest entities (already reporting).",
          "FY2025: SEC climate rule disclosures begin for large accelerated filers; CSRD second wave for large EU companies.",
          "FY2026: CSRD third wave — listed SMEs in the EU.",
          "FY2028: CSRD applies to non-EU parent groups meeting EU revenue thresholds — this is the wave that catches most US Shopify Plus brands selling in Europe.",
        ],
      },
      { type: "h2", text: "Scope 1, 2, and 3 in plain language" },
      {
        type: "p",
        text: "Almost every framework you'll encounter is built on the GHG Protocol's three-scope model. The categories sound abstract until you map them to a Shopify Plus operation.",
      },
      { type: "h3", text: "Scope 1 — Direct emissions" },
      {
        type: "p",
        text: "Anything you burn or release directly. For most Shopify Plus merchants, this is small: company-owned delivery vans, gas heating in your office or warehouse, refrigerant leaks in your facility's HVAC. If you outsource fulfillment to a 3PL, you may have no Scope 1 emissions at all.",
      },
      { type: "h3", text: "Scope 2 — Purchased energy" },
      {
        type: "p",
        text: "Electricity, steam, and heat that someone else generates and sells to you. Your office and warehouse electricity bills are the canonical example. Scope 2 has two reporting methods (location-based and market-based) and most frameworks require you to disclose both.",
      },
      { type: "h3", text: "Scope 3 — Value chain emissions" },
      {
        type: "p",
        text: "Everywhere else: the emissions embedded in the products you buy from suppliers, the freight that brings them to your warehouse, the last-mile delivery to your customer, returns, and end-of-life disposal of the product. For Shopify Plus merchants, Scope 3 typically represents 80–95% of total footprint. It is also the hardest category to measure, because the data lives in your suppliers' and carriers' systems, not yours.",
      },
      { type: "h2", text: "Steps to become audit-ready" },
      {
        type: "p",
        text: "Audit-readiness is the bar that distinguishes a sustainability report from a marketing claim. An auditor needs to trace every published number back to a source system, a methodology, and a calculation log. Here is a pragmatic path to get there.",
      },
      {
        type: "ol",
        items: [
          "Inventory your data sources. Shopify orders, fulfillment data, supplier invoices, energy bills, payroll headcount. Write down which system owns the master record for each one.",
          "Pick your frameworks early. CSRD or SEC will be the anchor; GRI and TCFD can be derived from the same underlying data once you have it.",
          "Establish a base year. Most frameworks expect year-over-year comparability. The earlier you lock in a base year, the cleaner your trend lines.",
          "Document methodology. For every estimated number — especially Scope 3 — record the emission factor, the source, the version, and the calculation. This is what an auditor will ask for first.",
          "Automate the pipeline. Manual spreadsheet collection breaks at the second reporting cycle. Connect your Shopify store, your accounting system, and your supplier registry to a platform that maintains the audit trail for you.",
          "Run a dry-run review. Six months before your first mandatory filing, produce a draft report and walk it through with your auditor. The questions they raise on a dry run are far cheaper to fix than the ones they raise on a real one.",
        ],
      },
      { type: "h2", text: "Where merchants get stuck" },
      {
        type: "p",
        text: "The pattern we see most often is merchants treating sustainability reporting as a one-time project rather than a continuous data discipline. The first report is hard. The second is harder, because you suddenly need year-over-year comparability and you discover that last year's spreadsheet is missing the methodology notes that would have made restatement easy.",
      },
      {
        type: "p",
        text: "The merchants who handle 2026 well are the ones who started in 2024 — not because they had to, but because they recognized that data collection has a long warm-up period. If you are starting now, focus on the pipeline first and the polish second. A complete, traceable, slightly rough report beats a beautiful one that cannot be defended.",
      },
      { type: "h2", text: "Where EsgForge fits" },
      {
        type: "p",
        text: "EsgForge connects to your Shopify Plus store, pulls the underlying transactions, and maintains the methodology and calculation log that auditors require. You stay in control of the disclosure; we handle the pipeline, the framework mapping, and the audit trail. Most merchants produce their first complete CSRD-aligned draft within their first month on the platform.",
      },
    ],
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}
