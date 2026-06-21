import { Helmet } from "react-helmet-async";
import { useLocation } from "react-router-dom";

const SITE = "https://quickapp.ai";
const DEFAULT_OG_IMAGE = `${SITE}/icons/app-icon.png`;

type Meta = {
  title: string;
  description: string;
  ogType?: "website" | "article";
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
};

const ORG_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "QuickApp.ai",
  url: SITE,
  logo: DEFAULT_OG_IMAGE,
  sameAs: ["https://twitter.com/quickapp_ai"],
};

const WEBSITE_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "QuickApp.ai",
  url: SITE,
};

const articleLd = (headline: string, slug: string) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline,
  author: { "@type": "Organization", name: "QuickApp.ai" },
  publisher: { "@type": "Organization", name: "QuickApp.ai", logo: { "@type": "ImageObject", url: DEFAULT_OG_IMAGE } },
  mainEntityOfPage: `${SITE}${slug}`,
});

const serviceLd = (name: string, slug: string, description: string) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name,
  provider: { "@type": "Organization", name: "QuickApp.ai" },
  areaServed: "IN",
  url: `${SITE}${slug}`,
  description,
});

const ROUTES: Record<string, Meta> = {
  "/": {
    title: "QuickApp.ai — AI-first commerce platform | Unlimited users",
    description:
      "One AI platform for Field Sales, Distributor Management, Retailer Portal, Store Operations, e-Commerce, Marketing and Customer Service. Unlimited users, success-based pricing.",
    jsonLd: [ORG_LD, WEBSITE_LD],
  },
  "/features": {
    title: "100+ Enterprise AI Features | QuickApp.ai",
    description:
      "Explore 100+ enterprise AI features across field sales, distribution, technology, connectors and data security — built for FMCG, beverages, pharma and consumer durables.",
  },
  "/technology": {
    title: "Platform Technology & AI Architecture | QuickApp.ai",
    description:
      "Inside QuickApp's AI architecture: offline-first mobile, secure AWS infrastructure, AI gateway, connectors and analytics that guide every team to act.",
  },
  "/pricing": {
    title: "Pricing — Unlimited users, success-based | QuickApp.ai",
    description:
      "Stop paying per user. QuickApp's success-based pricing gives every employee, distributor and retailer the power of AI on one platform.",
  },
  "/impact": {
    title: "Measurable Impact for Retailers, Distributors & Field Teams",
    description:
      "See the business outcomes QuickApp customers achieve — higher productivity, better fill rates, faster collections and stronger retailer engagement.",
  },
  "/connectors": {
    title: "ERP, Accounting & 3rd-Party Connectors | QuickApp.ai",
    description:
      "Connect QuickApp to SAP, Tally, Oracle, Salesforce, Zoho and more. Pre-built connectors keep orders, inventory, ledgers and masters in sync.",
  },
  "/roi-calculator": {
    title: "ROI Calculator | QuickApp.ai",
    description:
      "Estimate the ROI of deploying QuickApp across your field sales, distribution and retailer network in minutes.",
  },
  "/request-demo": {
    title: "Request a Demo | QuickApp.ai",
    description:
      "Book a guided walkthrough of QuickApp's AI-first commerce platform tailored to your business.",
  },
  "/contact": {
    title: "Contact Sales & Support | QuickApp.ai",
    description:
      "Talk to the QuickApp team about field sales automation, distributor management and AI for commerce.",
  },
  "/privacy-policy": {
    title: "Privacy Policy | QuickApp.ai",
    description:
      "How QuickApp.ai collects, uses and protects customer and end-user data across our AI-first commerce platform.",
  },
  "/solutions/field-sales": {
    title: "Retailer Sales — AI-guided field execution | QuickApp.ai",
    description:
      "Guide every field rep with AI: smart beats, suggested orders, scheme intelligence and live coaching for FMCG and consumer brands.",
    jsonLd: serviceLd(
      "Retailer Sales (Field Sales Automation)",
      "/solutions/field-sales",
      "AI-guided field sales execution for FMCG and consumer brands."
    ),
  },
  "/solutions/distributor-portal": {
    title: "Distributor Management Portal | QuickApp.ai",
    description:
      "Primary orders, inventory, claims, schemes and retailer ledgers — a modern AI distributor portal that replaces legacy DMS.",
    jsonLd: serviceLd(
      "Distributor Management",
      "/solutions/distributor-portal",
      "Primary orders, inventory, claims and ledgers for distributors."
    ),
  },
  "/solutions/retailer-portal": {
    title: "Retailer Portal — Self-service ordering & engagement",
    description:
      "Give retailers a self-service portal for ordering, schemes, ledgers and loyalty — backed by AI recommendations.",
    jsonLd: serviceLd(
      "Retailer Portal",
      "/solutions/retailer-portal",
      "Self-service ordering and engagement for retailers."
    ),
  },
  "/solutions/van-sales": {
    title: "Van Sales — Mobile inventory & on-the-spot invoicing",
    description:
      "Run van sales operations with mobile inventory, on-the-spot invoicing, route plans and AI-suggested orders.",
    jsonLd: serviceLd(
      "Van Sales",
      "/solutions/van-sales",
      "Mobile van inventory and on-the-spot invoicing."
    ),
  },
  "/solutions/professional-services": {
    title: "Professional Services — Implementation & Success",
    description:
      "QuickApp Professional Services: implementation, data migration, change management and customer success for AI-first commerce.",
    jsonLd: serviceLd(
      "Professional Services",
      "/solutions/professional-services",
      "Implementation, migration and success services."
    ),
  },
  "/insights": {
    title: "Insights — AI for Commerce, DMS & Field Sales | QuickApp.ai",
    description:
      "Articles, guides and case studies on AI-driven commerce, distributor management and field sales transformation.",
  },
  "/insights/roi-tracker": {
    title: "ROI Tracker — How customers measure QuickApp ROI",
    description:
      "Learn how QuickApp customers track ROI across productivity, fill rates, collections and retailer growth.",
    ogType: "article",
    jsonLd: articleLd("ROI Tracker — Measuring QuickApp ROI", "/insights/roi-tracker"),
  },
  "/insights/migration-plan": {
    title: "Migration Plan — Legacy DMS/SFA to QuickApp",
    description:
      "A practical plan to move from legacy DMS and SFA tools to QuickApp's AI-first commerce platform.",
    ogType: "article",
    jsonLd: articleLd("Migration Plan: Legacy DMS to QuickApp", "/insights/migration-plan"),
  },
  "/insights/migration-checklist": {
    title: "Migration Checklist — Move to QuickApp",
    description:
      "Step-by-step migration checklist for moving sales, distribution and retailer data to QuickApp.",
    ogType: "article",
    jsonLd: articleLd("Migration Checklist", "/insights/migration-checklist"),
  },
  "/insights/implementation-toolkit": {
    title: "Implementation Toolkit | QuickApp.ai",
    description:
      "Templates and tooling to roll out QuickApp across your field, distribution and retailer network.",
    ogType: "article",
    jsonLd: articleLd("Implementation Toolkit", "/insights/implementation-toolkit"),
  },
  "/insights/professional-services-roi": {
    title: "Professional Services ROI | QuickApp.ai",
    description:
      "How professional services accelerate ROI on QuickApp deployments across FMCG and consumer brands.",
    ogType: "article",
    jsonLd: articleLd("Professional Services ROI", "/insights/professional-services-roi"),
  },
  "/insights/professional-services-checklist": {
    title: "Professional Services Checklist | QuickApp.ai",
    description:
      "Pre-engagement checklist for QuickApp professional services projects.",
    ogType: "article",
    jsonLd: articleLd("Professional Services Checklist", "/insights/professional-services-checklist"),
  },
  "/insights/why-quickapp": {
    title: "Why QuickApp — AI-first commerce platform",
    description:
      "What makes QuickApp different: AI that guides teams to act, unlimited users, offline-first mobile and success-based pricing.",
    ogType: "article",
    jsonLd: articleLd("Why QuickApp", "/insights/why-quickapp"),
  },
  "/insights/bharath-beverages-case-study": {
    title: "Bharath Beverages — QuickApp Case Study",
    description:
      "How Bharath Beverages transformed field sales and distribution with QuickApp's AI-first commerce platform.",
    ogType: "article",
    jsonLd: articleLd("Bharath Beverages Case Study", "/insights/bharath-beverages-case-study"),
  },
};

export const RouteSEO = () => {
  const { pathname } = useLocation();
  const meta = ROUTES[pathname];
  if (!meta) return null;
  const url = `${SITE}${pathname === "/" ? "/" : pathname}`;
  const ogType = meta.ogType ?? "website";
  const lds = meta.jsonLd
    ? Array.isArray(meta.jsonLd)
      ? meta.jsonLd
      : [meta.jsonLd]
    : [];

  return (
    <Helmet>
      <title>{meta.title}</title>
      <meta name="description" content={meta.description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={meta.title} />
      <meta property="og:description" content={meta.description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={ogType} />
      <meta property="og:image" content={DEFAULT_OG_IMAGE} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={meta.title} />
      <meta name="twitter:description" content={meta.description} />
      <meta name="twitter:image" content={DEFAULT_OG_IMAGE} />
      {lds.map((ld, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(ld)}
        </script>
      ))}
    </Helmet>
  );
};

export default RouteSEO;