import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import {
  Heart,
  Target,
  Users,
  Store,
  Truck,
  Building2,
  BarChart3,
  Megaphone,
  Wallet,
  BadgeDollarSign,
  TrendingUp,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  ShieldCheck,
  Zap,
  Globe,
  Award
} from "lucide-react";

const stakeholderImpacts = [
  {
    icon: Store,
    role: "Retailer",
    headline: "Never miss an opportunity to stock what sells",
    benefits: [
      "Order on WhatsApp or the retailer app in 30 seconds",
      "Track deliveries, invoices, and outstanding dues in one place",
      "See active schemes and new launches instantly",
      "Give feedback and resolve issues without chasing anyone"
    ],
    features: ["Retailer Portal", "WhatsApp Ordering", "Scheme Broadcasts", "In-App Support"],
    metric: "Higher fill rates, fewer stock-outs"
  },
  {
    icon: Truck,
    role: "Distributor",
    headline: "Run the distribution business with visibility, not guesswork",
    benefits: [
      "Primary orders, inventory, and secondary demand on one screen",
      "Auto-suggested stock based on sell-through and schemes",
      "Faster collections with ledger and outstanding views",
      "Van sales, delivery runs, and returns digitally managed"
    ],
    features: ["Distributor Management System", "Van Sales", "Inventory Management", "Primary Order Tracking"],
    metric: "Improved inventory turns and cash flow"
  },
  {
    icon: Building2,
    role: "OEM / Brand",
    headline: "Get direct visibility into the last mile of your supply chain",
    benefits: [
      "See real-time secondary sales without waiting for distributor reports",
      "Deploy schemes to retailers and measure uptake instantly",
      "Track competition share and shelf presence through photos",
      "Protect brand identity with digital branding-request workflows"
    ],
    features: ["Market Intelligence", "Scheme Management", "Competition Tracking", "Branding Requests"],
    metric: "Faster go-to-market and better ROI on promotions"
  },
  {
    icon: BarChart3,
    role: "Sales Leader",
    headline: "Lead with data, not hunches",
    benefits: [
      "Live dashboards on team activity, coverage, and conversion",
      "AI nudges flag at-risk accounts and high-potential visits",
      "Compare performance across territories, products, and time periods",
      "Forecast accurately using actual field data"
    ],
    features: ["Sales Analytics", "AI Sales Coach", "Leaderboards", "Target Management"],
    metric: "Higher team productivity and predictable revenue"
  },
  {
    icon: Users,
    role: "Sales Execution Team",
    headline: "Spend time selling, not filling forms",
    benefits: [
      "AI recommends what to pitch before every visit",
      "Offline-first app works in low-connectivity areas",
      "Auto-capture orders, photos, and GPS in a few taps",
      "Clear targets, instant feedback, and gamified rewards"
    ],
    features: ["Beat Planning", "Visit Scheduling", "Gamification", "Offline Mode"],
    metric: "More productive visits and higher order value"
  },
  {
    icon: Megaphone,
    role: "Marketing Team",
    headline: "Launch campaigns that actually reach the shelf",
    benefits: [
      "Push schemes and new-product information directly to retailers",
      "Measure campaign uptake by region, distributor, and SKU",
      "Capture competitor activations through field photos",
      "Run targeted in-app promotions to high-potential outlets"
    ],
    features: ["Marketing Pack", "Retailer Portal Ads", "Scheme Broadcasts", "Competition Intelligence"],
    metric: "Better campaign reach and measurable ROI"
  },
  {
    icon: Heart,
    role: "HR",
    headline: "Build a motivated, accountable field force",
    benefits: [
      "Face-verified attendance prevents proxy marking",
      "Skill and competency tracking linked to real performance",
      "Gamification and recognition drive healthy competition",
      "Travel and expense claims auto-tagged to visits and routes"
    ],
    features: ["Face Verification", "Competency Dashboard", "Gamification", "Expense Management"],
    metric: "Higher engagement and lower compliance overhead"
  },
  {
    icon: Wallet,
    role: "Finance Team",
    headline: "Close the books faster with cleaner data",
    benefits: [
      "Digital invoices and credit notes reduce manual reconciliation",
      "Credit scoring flags risky accounts before orders ship",
      "Outstanding and collection tracking by retailer and distributor",
      "Automated TADA and expense validation from GPS data"
    ],
    features: ["Credit Scoring", "Invoice Management", "Collections", "Expense Validation"],
    metric: "Lower bad debt and faster collections"
  }
];

const values = [
  {
    icon: Heart,
    title: "Customer Outcomes First",
    description: "We measure success by the results our customers see in their business — not by feature count or user seats."
  },
  {
    icon: ShieldCheck,
    title: "Radical Transparency",
    description: "Clear pricing, honest ROI conversations, and data that every stakeholder can trust and act on."
  },
  {
    icon: Users,
    title: "Democratize Digital",
    description: "Unlimited users means everyone in the ecosystem — from the warehouse to the CEO — benefits from the same truth."
  },
  {
    icon: Lightbulb,
    title: "AI for Guidance, Not Just Records",
    description: "We don't digitize old processes. We use intelligence to tell people what to do next, in the moment that matters."
  },
  {
    icon: Globe,
    title: "Built for Real India",
    description: "Offline-first, multi-language, and low-bandwidth — designed for the conditions field teams actually face."
  },
  {
    icon: Award,
    title: "Partners in Growth",
    description: "Our success-based pricing means we win only when your revenue, efficiency, and customer relationships improve."
  }
];

const principles = [
  "Solve the full ecosystem — not just the sales rep.",
  "Prefer guidance over dashboards; action over reports.",
  "Keep data truthful with verification, not typing.",
  "Make the platform accessible to every role and language.",
  "Align commercial incentives with customer outcomes."
];

export const ImpactPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />

      {/* Hero */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent-gold/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(circle_at_80%_20%,hsl(var(--accent-gold)/0.15),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.08)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.08)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="container mx-auto px-3 sm:px-4 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-accent-gold/20 backdrop-blur px-3 sm:px-4 py-2 rounded-full text-accent-gold text-sm border border-accent-gold/40 font-medium mb-6">
              <Sparkles className="h-4 w-4" />
              Our Impact
            </div>

            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-foreground">
              Built to Create <span className="text-accent-gold">Real Impact</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground mb-4">
              QuickApp.AI is not another sales tool. It is an operating system that connects every stakeholder in your go-to-market ecosystem and guides them toward better decisions.
            </p>

            <p className="text-lg text-muted-foreground/80 mb-8">
              From the retailer placing an order to the finance team closing the books, we design impact into every workflow.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                onClick={() => navigate('/request-demo')}
                className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground shadow-lg"
              >
                See Impact in Action
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate('/pricing')}
                className="border-border"
              >
                Why Success-Based Pricing
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Purpose / Why We Exist */}
      <section className="py-16 md:py-24 px-3 sm:px-4">
        <div className="container mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
                <Target className="h-4 w-4" />
                Purpose
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">
                Why We Exist
              </h2>
              <p className="text-lg text-muted-foreground mb-4">
                Most sales software collects data. We believe software should <strong>create progress</strong>.
              </p>
              <p className="text-lg text-muted-foreground mb-4">
                QuickApp.AI exists to make every person in the sales ecosystem — the retailer, the distributor, the rep, the leader — more effective, more informed, and more successful.
              </p>
              <p className="text-lg text-muted-foreground">
                We do this by combining deep field-sales expertise with AI that guides action in real time, not after the quarter is over.
              </p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-card">
              <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5 text-accent-gold" />
                The Change We Are Driving
              </h3>
              <ul className="space-y-4">
                {[
                  "From data collection to intelligent guidance",
                  "From reactive reporting to proactive nudges",
                  "From isolated teams to connected ecosystems",
                  "From per-seat cost to shared success"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-accent-gold mt-0.5 flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Stakeholder Impact */}
      <section className="py-16 md:py-24 px-3 sm:px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Users className="h-4 w-4" />
              Stakeholder Impact
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Impact for Everyone in Your Ecosystem
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              QuickApp.AI is built for the whole revenue chain. Every role gets capabilities that translate into measurable business outcomes.
            </p>
          </div>

          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-6">
            {stakeholderImpacts.map((stakeholder, index) => (
              <div
                key={index}
                className="group bg-card border border-border rounded-2xl p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-accent-gold to-accent-bronze text-white">
                    <stakeholder.icon className="h-6 w-6" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wide text-accent-gold">
                      {stakeholder.role}
                    </span>
                    <h3 className="text-lg font-bold text-foreground leading-tight">
                      {stakeholder.headline}
                    </h3>
                  </div>
                </div>

                <ul className="space-y-2 mb-4">
                  {stakeholder.benefits.map((benefit, bIndex) => (
                    <li key={bIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-accent-gold mt-0.5 flex-shrink-0" />
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex flex-wrap gap-2 mb-4">
                  {stakeholder.features.map((feature, fIndex) => (
                    <span
                      key={fIndex}
                      className="text-xs font-medium px-2 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-accent-gold" />
                    <span className="text-sm font-semibold text-accent-gold">{stakeholder.metric}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values & Principles */}
      <section className="py-16 md:py-24 px-3 sm:px-4">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Award className="h-4 w-4" />
              Values & Principles
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              How We Build and Operate
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              These principles shape our product, our pricing, and our partnership with every customer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {values.map((value, index) => (
              <div
                key={index}
                className="bg-card border border-border rounded-2xl p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-gold to-accent-bronze flex items-center justify-center mb-4">
                  <value.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">{value.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{value.description}</p>
              </div>
            ))}
          </div>

          <div className="max-w-4xl mx-auto bg-muted/50 border border-border rounded-2xl p-6 md:p-8">
            <h3 className="text-xl font-bold text-foreground mb-4">Our Business Principles</h3>
            <ul className="space-y-3">
              {principles.map((principle, index) => (
                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                  <BadgeDollarSign className="h-5 w-5 text-accent-gold mt-0.5 flex-shrink-0" />
                  <span>{principle}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Success-Based Pricing Connection */}
      <section className="py-16 md:py-24 px-3 sm:px-4 bg-muted/30">
        <div className="container mx-auto">
          <div className="bg-gradient-to-br from-primary/10 to-accent-gold/10 border border-accent-gold/20 rounded-2xl p-6 md:p-12">
            <div className="grid lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-accent-gold/20 text-accent-gold px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4 border border-accent-gold/30">
                  <BadgeDollarSign className="h-4 w-4" />
                  Success-Based Pricing
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Our Incentives Are Aligned With Yours
                </h2>
                <p className="text-lg text-muted-foreground mb-4">
                  We don't charge per user because we don't believe access to better tools should be rationed. Our pricing is tied to the value we help create — higher sales, better coverage, faster collections, and happier retailers.
                </p>
                <p className="text-lg text-muted-foreground">
                  When your ecosystem wins, we win. That is why we are invested in your onboarding, adoption, and ongoing outcomes — not just the sale.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  { label: "Pricing tied to outcomes, not headcount", desc: "Unlimited users across all tiers" },
                  { label: "Shared risk, shared reward", desc: "We grow when your metrics improve" },
                  { label: "No shelfware", desc: "If people don't use it, neither of us succeeds" }
                ].map((item, index) => (
                  <div key={index} className="bg-card border border-border rounded-xl p-5 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-5 w-5 text-accent-gold" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground">{item.label}</h4>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 px-3 sm:px-4">
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Ready to see impact in your organization?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Let's talk about how QuickApp.AI can create measurable outcomes for your retailers, distributors, and sales teams.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => navigate('/request-demo')}
              className="bg-accent-gold hover:bg-accent-gold/90 text-accent-gold-foreground shadow-lg"
            >
              Request a Demo
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/pricing')}
              className="border-border"
            >
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default ImpactPage;
