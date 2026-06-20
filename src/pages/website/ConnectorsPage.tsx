import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Users, Mail, FileText, BarChart3, CreditCard, Mic, MessageSquare,
  Map, Briefcase, ShoppingCart, Sparkles, Cloud, Phone, Globe, Calculator,
  ArrowRight,
} from "lucide-react";

type Connector = { name: string; description: string };
type Category = {
  id: string;
  title: string;
  tagline: string;
  icon: React.ElementType;
  gradient: string;
  connectors: Connector[];
};

const categories: Category[] = [
  {
    id: "crm",
    title: "CRM & Sales",
    tagline: "Sync accounts, contacts and opportunities both ways so your field team and back-office CRM stay in lockstep.",
    icon: Users,
    gradient: "from-blue-500 to-indigo-500",
    connectors: [
      { name: "Salesforce", description: "Two-way sync of accounts, contacts, opportunities and custom objects. Field visits, orders and outlet KPIs from QuickApp flow into Salesforce so RevOps gets a single pipeline view." },
      { name: "HubSpot", description: "Push QuickApp retailers and leads into HubSpot CRM, trigger marketing workflows from visit outcomes, and pull HubSpot deal stages back into the QuickApp account 360." },
      { name: "Pipedrive", description: "Convert QuickApp visits and orders into Pipedrive deals and activities, and keep sales-stage progression aligned with on-ground execution." },
      { name: "Zoho CRM", description: "Bi-directional sync of accounts, contacts and deals with Zoho CRM, including outlet hierarchy and visit history, so SMB teams run a unified stack." },
      { name: "LinkedIn", description: "Enrich QuickApp contacts with LinkedIn profile data and log outreach activities, giving sales managers richer context on every key account." },
    ],
  },
  {
    id: "ecommerce",
    title: "E-commerce & Storefronts",
    tagline: "Connect online and offline commerce — products, inventory and orders synced across every storefront.",
    icon: ShoppingCart,
    gradient: "from-emerald-500 to-teal-500",
    connectors: [
      { name: "Shopify", description: "Sync the QuickApp product catalog, price lists and inventory with Shopify storefronts, and pull online orders into the same fulfilment queue as field orders." },
      { name: "WooCommerce", description: "Connect WordPress/WooCommerce stores to QuickApp for unified catalog, stock and order management across D2C and B2B channels." },
      { name: "Wix", description: "Push QuickApp products and stock to Wix storefronts and bring web orders back into QuickApp DMS for invoicing and dispatch." },
      { name: "PrestaShop", description: "Keep PrestaShop catalog, pricing and orders synchronised with QuickApp so e-commerce and field-sales operate on one source of truth." },
    ],
  },
  {
    id: "payments",
    title: "Payments & Billing",
    tagline: "Collect, reconcile and recur — payments and subscriptions wired straight into your QuickApp invoices.",
    icon: CreditCard,
    gradient: "from-violet-500 to-purple-500",
    connectors: [
      { name: "Stripe", description: "Generate Stripe payment links and checkout sessions from QuickApp invoices and auto-reconcile successful payments against the retailer ledger." },
      { name: "Chargebee", description: "Power subscription billing for SaaS and recurring-order customers — plans, trials and dunning are managed in Chargebee and reflected in QuickApp." },
    ],
  },
  {
    id: "accounting",
    title: "Accounting & ERP",
    tagline: "Eliminate double entry — invoices, credit notes and ledgers flow automatically into your books.",
    icon: Calculator,
    gradient: "from-amber-500 to-orange-500",
    connectors: [
      { name: "Zoho Books", description: "Auto-post QuickApp invoices, credit notes and payments to Zoho Books with matched customers and tax codes, eliminating month-end reconciliation work." },
      { name: "Wave", description: "Sync QuickApp invoices and payments to Wave for small-business accounting, with customers and items kept in step automatically." },
      { name: "SevDesk", description: "Push QuickApp sales documents to SevDesk for DACH-market bookkeeping, GoBD compliance and clean tax reporting." },
    ],
  },
  {
    id: "messaging",
    title: "Email, SMS & Messaging",
    tagline: "Reach retailers and reps on the right channel — transactional and campaign messaging built in.",
    icon: Mail,
    gradient: "from-rose-500 to-pink-500",
    connectors: [
      { name: "Mailgun", description: "Send transactional emails — order confirmations, invoices, statements — from QuickApp with deliverability analytics and bounce handling." },
      { name: "Brevo", description: "Run retailer campaigns and lifecycle emails from QuickApp segments, with opens, clicks and unsubscribes reflected back in retailer profiles." },
      { name: "Twilio", description: "Trigger SMS and WhatsApp messages from QuickApp workflows — OTPs, dispatch alerts, payment reminders — with global reach and delivery receipts." },
      { name: "GatewayAPI", description: "High-volume SMS delivery across Europe and APAC for QuickApp notifications, OTPs and retailer broadcasts with carrier-grade reliability." },
      { name: "Slack", description: "Pipe QuickApp alerts — large orders, escalations, approvals, downtime — into Slack channels so internal teams react in real time." },
    ],
  },
  {
    id: "ai",
    title: "AI & Intelligence",
    tagline: "Bring best-in-class AI models into QuickApp for voice, vision, search and recommendations.",
    icon: Sparkles,
    gradient: "from-fuchsia-500 to-purple-600",
    connectors: [
      { name: "Gemini Enterprise", description: "Power QuickApp's recommendations, summaries and document understanding with Google Gemini Enterprise models, governed with enterprise controls." },
      { name: "Perplexity", description: "Bring grounded, citation-backed answers into the QuickApp assistant for market research, competitor briefs and outlet intelligence." },
      { name: "ElevenLabs", description: "Generate natural multilingual voice for QuickApp's voice assistant, audio briefings and IVR-style nudges to field reps." },
      { name: "Attention", description: "Analyse rep–retailer conversations captured in QuickApp to score talk tracks, objection handling and uplift coaching nudges automatically." },
      { name: "Fireflies", description: "Auto-transcribe and summarise meetings with distributors and key accounts, then attach insights to the QuickApp account record." },
    ],
  },
  {
    id: "data",
    title: "Data Warehouse & Analytics",
    tagline: "Stream QuickApp's transactional data into your warehouse for enterprise BI and ML.",
    icon: BarChart3,
    gradient: "from-cyan-500 to-blue-600",
    connectors: [
      { name: "BigQuery", description: "Stream QuickApp orders, visits and master data into Google BigQuery for enterprise BI, custom dashboards and ML on top of field-level data." },
      { name: "Snowflake", description: "Land QuickApp events and snapshots in Snowflake so finance, supply-chain and analytics teams can join field data with the rest of the enterprise." },
      { name: "Databricks", description: "Push QuickApp data into Databricks lakehouse for advanced analytics, demand forecasting and AI models on secondary-sales signals." },
    ],
  },
  {
    id: "productivity",
    title: "Productivity & Collaboration",
    tagline: "Plug QuickApp into the tools where your teams already plan and execute work.",
    icon: Briefcase,
    gradient: "from-slate-500 to-slate-700",
    connectors: [
      { name: "Asana", description: "Turn QuickApp tasks — onboarding a distributor, launching a scheme, resolving a complaint — into Asana projects with progress reflected back in QuickApp." },
      { name: "Notion", description: "Sync QuickApp playbooks, SOPs and meeting notes with Notion workspaces so field knowledge stays current and discoverable." },
      { name: "Microsoft 365", description: "Single sign-on with Microsoft Entra ID, calendar sync for visits and meetings, and Excel/OneDrive export for QuickApp reports." },
    ],
  },
  {
    id: "content",
    title: "Content & CMS",
    tagline: "Manage marketing content, training and product storytelling that powers your field force.",
    icon: FileText,
    gradient: "from-lime-500 to-emerald-600",
    connectors: [
      { name: "Contentful", description: "Deliver product stories, training and marketing collateral from Contentful straight into the QuickApp rep app, version-controlled and localized." },
      { name: "WordPress", description: "Surface WordPress-managed marketing pages, knowledge base articles and announcements inside QuickApp for reps and retailers." },
    ],
  },
  {
    id: "location",
    title: "Maps & Location",
    tagline: "Routing, geocoding and rich location intelligence for every visit and beat.",
    icon: Map,
    gradient: "from-orange-500 to-red-500",
    connectors: [
      { name: "Google Maps", description: "Geocode retailer addresses, optimise beat routes and visualise field activity on rich Google Maps tiles inside QuickApp." },
    ],
  },
];

export default function ConnectorsPage() {
  const navigate = useNavigate();
  const total = categories.reduce((n, c) => n + c.connectors.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="border-b border-border/40 bg-gradient-to-br from-background via-background to-muted/30">
        <div className="container mx-auto px-4 py-16 md:py-20 max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold text-xs font-medium mb-4">
            <Cloud className="h-3.5 w-3.5" /> {total}+ prebuilt connectors
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight mb-4">
            QuickApp <span className="text-accent-gold">Connectors</span>
          </h1>
          <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto">
            Plug QuickApp into the tools you already run on. Every connector ships pre-built,
            secure and bi-directional — so your CRM, ERP, payments, messaging and analytics stay
            perfectly in sync with what happens in the field.
          </p>
          <div className="flex items-center justify-center gap-3 mt-6">
            <Button onClick={() => navigate('/request-demo')} className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground">
              Request a demo <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={() => navigate('/pricing')}>See pricing</Button>
          </div>
        </div>
      </section>

      {/* Category quick nav */}
      <section className="border-b border-border/40">
        <div className="container mx-auto px-4 py-6 max-w-6xl">
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((c) => (
              <a
                key={c.id}
                href={`#${c.id}`}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted transition-colors"
              >
                {c.title} <span className="text-muted-foreground">· {c.connectors.length}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-12 md:py-16 max-w-6xl space-y-14">
        {categories.map((cat) => {
          const Icon = cat.icon;
          return (
            <div key={cat.id} id={cat.id} className="scroll-mt-24">
              <div className="flex items-start gap-4 mb-6">
                <div className={`inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-br ${cat.gradient} shadow-md shrink-0`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold tracking-tight">{cat.title}</h2>
                  <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{cat.tagline}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.connectors.map((conn) => (
                  <div
                    key={conn.name}
                    className="group rounded-2xl border border-border bg-card p-5 hover:shadow-lg hover:border-accent-gold/40 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`h-8 w-8 rounded-lg bg-gradient-to-br ${cat.gradient} flex items-center justify-center text-white text-xs font-bold`}>
                        {conn.name.charAt(0)}
                      </div>
                      <h3 className="font-semibold text-sm">{conn.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {conn.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="border-t border-border/40 bg-muted/30">
        <div className="container mx-auto px-4 py-12 md:py-16 max-w-4xl text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">Don't see your tool?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            QuickApp connectors are extensible. Tell us your stack and we'll wire it up — from
            ERPs and tax engines to niche regional payment and logistics providers.
          </p>
          <Button onClick={() => navigate('/request-demo')} className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground">
            Talk to our integrations team <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}