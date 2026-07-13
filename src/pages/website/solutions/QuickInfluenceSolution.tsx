import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { useNavigate } from "react-router-dom";
import {
  Megaphone, Users, UserCheck, Search, QrCode, Gift, Trophy, MapPin,
  MessageCircle, Camera, ShieldCheck, TrendingUp, CheckCircle2, Sparkles,
  Star, Radar, Building2, BarChart3,
} from "lucide-react";

const influencerTypes = [
  {
    icon: UserCheck,
    title: "Trade Influencers",
    tagline: "Plumbers, electricians, carpenters & masons",
    description:
      "Capture the tradespeople who actually decide which brand the end-customer buys. Onboard in under a minute via WhatsApp or micro-app, scan QR codes on packaging, and instantly credit points redeemable to UPI or gift cards.",
    highlights: [
      "30-second WhatsApp onboarding — no app download friction",
      "QR / invoice scan with OCR + single-use cryptographic tokens",
      "Retailer-verified customer slips for categories without pack QRs",
      "Milestone rewards → instant UPI, vouchers, fuel cards",
      "Bronze / Silver / Gold trust tiers with auto spot-check audits",
    ],
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: Users,
    title: "Employee Ambassadors",
    tagline: "Every employee becomes eyes on the shelf",
    description:
      "Turn finance, HR, legal and ops teams into a crowdsourced market intelligence engine. A finance exec at their neighbourhood store can log a 60-second shelf audit or pin a white-space lead straight into the sales pipeline.",
    highlights: [
      "One-tap GPS check-in at any store — under 60 seconds per audit",
      "White-space pinning auto-creates leads for the field sales beat",
      "Emoji-slider ratings for stocks, placement, quality, service",
      "Ambassador Academy — launches, schemes, ads, product cheat sheets",
      "Scout → Influencer → Market Eagle levels with peer leaderboards",
    ],
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: Radar,
    title: "Crowd Mystery Shoppers",
    tagline: "On-demand feedback from any region, on any day",
    description:
      "Deploy a network of paid mystery shoppers via a lightweight app to capture unbiased retailer feedback on your product, competition and shelf reality. Perfect for entering a new territory or defending a strong one.",
    highlights: [
      "Region-based task assignment with SLA-bound submissions",
      "Structured retailer interviews: pricing, schemes, sell-through, competition",
      "Geo + time-stamped shelf photos and competitor pack captures",
      "Territory-expansion mode for scouting untapped pin-codes",
      "Per-task payouts via UPI with fraud-detection on duplicate submissions",
    ],
    color: "from-emerald-500 to-teal-600",
  },
];

const capabilities = [
  { icon: QrCode, title: "QR & Invoice Scan Engine", description: "Single-use cryptographic tokens, OCR fallback for invoice bills, and duplicate-scan detection prevent inflation of loyalty ledgers." },
  { icon: MessageCircle, title: "WhatsApp-First Onboarding", description: "A conversational bot registers influencers, validates scans and hands off to a deep-review portal — zero app-download friction." },
  { icon: MapPin, title: "Geo-Fenced Validation", description: "Every scan, audit and mystery-shop submission is stamped with GPS + time, blocking armchair fraud." },
  { icon: Trophy, title: "Gamification Engine", description: "Points, badges, tiered milestones and peer leaderboards — proven to lift engagement 3-4x versus flat cashback." },
  { icon: Gift, title: "Redemption Wallet", description: "Instant UPI payouts, Amazon / fuel vouchers, corporate perks and CSR donations — configurable per program." },
  { icon: ShieldCheck, title: "Fraud & Audit Controls", description: "Bronze/Silver/Gold trust tiers, monthly point caps, random 5% spot-checks and field-rep call-outs on high earners." },
  { icon: Camera, title: "Shelf Photo Intelligence", description: "AI-tagged images for share-of-shelf, planogram compliance and competitor scheme detection." },
  { icon: TrendingUp, title: "White-Space Lead Router", description: "Every 'product not found' pin auto-creates a lead in the field sales CRM, routed to the nearest beat." },
];

const insights = [
  {
    metric: "10x",
    label: "Eyes on the street",
    body: "Employee ambassador programs typically expand retail visibility 10x beyond the fixed sales beat within 90 days.",
  },
  {
    metric: "68%",
    label: "Hardware buyers follow the tradesperson",
    body: "In B2B2C categories like plumbing, valves and electricals, end-customers buy the brand their technician recommends — capturing the influencer captures the sale.",
  },
  {
    metric: "3-4x",
    label: "Engagement uplift with gamification",
    body: "Tiered milestones + peer leaderboards outperform flat cashback loyalty schemes by 3-4x on monthly active users.",
  },
  {
    metric: "< 60s",
    label: "Ideal audit time budget",
    body: "Cross-industry data shows non-sales employees abandon field audit apps that take longer than 60 seconds per store.",
  },
  {
    metric: "0",
    label: "Native competitors",
    body: "Standard SFA platforms (LeadSquared, Delta Sales, dayTrack, Twib) have no built-in Employee Ambassador or Mystery Shopper module — QuickApp is first-mover.",
  },
  {
    metric: "5%",
    label: "Recommended spot-check ratio",
    body: "For Silver-tier trade influencers, a random 5% field-rep spot-check keeps fraud below 1% without hurting participation.",
  },
];

const flowSteps = [
  { step: "01", title: "Onboard", body: "OTP or WhatsApp signup in under a minute — trade partner, employee or mystery shopper." },
  { step: "02", title: "Capture", body: "Scan a QR, upload an invoice, log a shelf audit or complete a mystery-shop task with photos." },
  { step: "03", title: "Validate", body: "Cryptographic tokens, OCR, GPS and time-stamps decide whether points unlock instantly or go to pending." },
  { step: "04", title: "Reward", body: "Points flow into the wallet — redeem to UPI, vouchers or corporate perks with one tap." },
  { step: "05", title: "Act", body: "White-space pins and competitor intel land in the field sales CRM, routed to the right beat." },
];

export default function QuickInfluenceSolution() {
  const navigate = useNavigate();
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-20 px-3 sm:px-4 bg-gradient-to-br from-primary/15 via-background to-accent-gold/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" /> Quick Influence
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Map every voice that <span className="text-primary">moves your brand</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                One platform to activate <strong>trade influencers</strong>, <strong>employee ambassadors</strong> and <strong>crowd mystery shoppers</strong> — with WhatsApp-first onboarding, gamified rewards, GPS-validated audits and fraud-proof loyalty payouts.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
                  Request Demo
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                  View Pricing
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-10 border border-primary/20 shadow-xl">
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-card/80 border-primary/20 p-4 text-center">
                    <UserCheck className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">Trade</div>
                    <div className="text-xs text-muted-foreground">Plumbers · Electricians</div>
                  </Card>
                  <Card className="bg-card/80 border-primary/20 p-4 text-center">
                    <Users className="w-8 h-8 text-violet-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">Employee</div>
                    <div className="text-xs text-muted-foreground">Every team, every store</div>
                  </Card>
                  <Card className="bg-card/80 border-primary/20 p-4 text-center col-span-2">
                    <Radar className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold">Crowd Mystery Shoppers</div>
                    <div className="text-xs text-muted-foreground">On-demand regional insight</div>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three influencer types */}
      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three influence networks — <span className="text-primary">one intelligence layer</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Each network is purpose-built for its audience, but shares the same rewards engine, fraud controls and CRM integration.
            </p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            {influencerTypes.map((t, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 overflow-hidden">
                <CardContent className="p-6">
                  <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center mb-4 shadow-lg`}>
                    <t.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-1">{t.title}</h3>
                  <p className="text-sm text-primary mb-3">{t.tagline}</p>
                  <p className="text-muted-foreground mb-4">{t.description}</p>
                  <ul className="space-y-2">
                    {t.highlights.map((h, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities grid */}
      <section className="py-20 px-3 sm:px-4 bg-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built on a shared <span className="text-primary">influence engine</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every capability works across all three networks — configure once, deploy everywhere.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {capabilities.map((c, i) => (
              <Card key={i} className="bg-card/70 border-border/50 hover:border-primary/50 transition-all">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <c.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">{c.title}</h3>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              How <span className="text-primary">Quick Influence</span> works
            </h2>
            <p className="text-lg text-muted-foreground">A single closed loop from onboarding to sales action.</p>
          </div>
          <div className="grid md:grid-cols-5 gap-4">
            {flowSteps.map((s, i) => (
              <Card key={i} className="bg-card/50 border-border/50 relative">
                <CardContent className="p-5">
                  <div className="text-3xl font-bold text-primary/40 mb-2">{s.step}</div>
                  <h3 className="font-semibold mb-2">{s.title}</h3>
                  <p className="text-sm text-muted-foreground">{s.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Reference insights */}
      <section className="py-20 px-3 sm:px-4 bg-gradient-to-br from-accent-gold/10 via-background to-primary/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-14">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-accent-gold/20 text-accent-gold-foreground rounded-full text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" /> Reference Insights
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              What the data says about <span className="text-primary">influencer programs</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Benchmarks and market patterns we've observed across FMCG, hardware, building materials and QSR rollouts.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {insights.map((ins, i) => (
              <Card key={i} className="bg-card/70 border-primary/20 hover:shadow-lg transition-all">
                <CardContent className="p-6">
                  <div className="text-4xl font-bold text-primary mb-2">{ins.metric}</div>
                  <div className="text-sm font-semibold mb-3 text-foreground">{ins.label}</div>
                  <p className="text-sm text-muted-foreground">{ins.body}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-4">
            <Card className="bg-card/60 border-border/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Building2 className="w-4 h-4 text-primary" /> Hardware brand pilot</div>
              <p className="text-sm text-muted-foreground">2,400 plumbers onboarded via WhatsApp in 6 weeks — 22% lift in premium valve sell-through across 180 retail counters.</p>
            </Card>
            <Card className="bg-card/60 border-border/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Star className="w-4 h-4 text-amber-500" /> FMCG ambassador rollout</div>
              <p className="text-sm text-muted-foreground">1,100 employees, 14,000 audits and 3,800 white-space leads in the first quarter — 31% converted into new active retailers.</p>
            </Card>
            <Card className="bg-card/60 border-border/40 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold mb-2"><Search className="w-4 h-4 text-emerald-500" /> Mystery-shop territory scan</div>
              <p className="text-sm text-muted-foreground">A single 4-week crowd-shopper wave across 3 tier-2 cities surfaced 47 competitor schemes and 12 pricing violations that field reps had missed.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-3 sm:px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <Megaphone className="w-14 h-14 text-primary mx-auto mb-4" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to turn every voice into growth?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See Quick Influence configured for your category — trade, employee or crowd — in a 30-minute walkthrough.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
              Schedule Free Demo
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
              See Pricing
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}