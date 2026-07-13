import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { useNavigate } from "react-router-dom";
import {
  ShoppingCart, Megaphone, Sparkles, Rocket, CheckCircle2, ArrowRight,
  CreditCard, Truck, LineChart, Mail, MessageCircle, Share2, Target,
  Users, Brain, Repeat, Handshake, Wrench, BarChart3, Zap,
} from "lucide-react";

const tiers = [
  {
    name: "Quick Commerce",
    tagline: "Launch your storefront and sync operations end-to-end.",
    color: "from-blue-500 to-cyan-600",
    icon: ShoppingCart,
    features: [
      { icon: ShoppingCart, title: "Storefront & Web App", desc: "High-conversion e-commerce websites and web applications built to sell." },
      { icon: CreditCard, title: "Logistics & Checkout", desc: "Turnkey integration with payment gateways and 3PL apps for smooth fulfillment." },
      { icon: LineChart, title: "Financial Connectivity", desc: "Real-time data syncing with financial apps via pre-built connectors." },
      { icon: Brain, title: "Traffic Intelligence", desc: "Web traffic analytics and AI recommendations to strengthen and grow inbound traffic." },
    ],
  },
  {
    name: "Marketing Amplify",
    tagline: "Automate journeys, run social, and track every rupee of ad ROI.",
    color: "from-purple-500 to-pink-600",
    icon: Megaphone,
    includes: "Everything in Quick Commerce, plus:",
    features: [
      { icon: Mail, title: "Automated Journeys", desc: "Cross-channel lifecycle marketing across Email, SMS, and Push notifications." },
      { icon: MessageCircle, title: "Meta & WhatsApp Connectors", desc: "Direct-to-ad placement and WhatsApp conversational campaigns." },
      { icon: Share2, title: "Social & Content Suite", desc: "Multi-platform content planner, social media manager, and competitor tracking." },
      { icon: Target, title: "Campaign ROI Tracker", desc: "Live dashboards mapping marketing spend directly to revenue baseline data." },
    ],
  },
  {
    name: "Marketing 360",
    tagline: "Maximize LTV with unified CRM, predictive insights, and field sync.",
    color: "from-amber-500 to-orange-600",
    icon: Sparkles,
    includes: "Everything in Marketing Amplify, plus:",
    features: [
      { icon: Users, title: "Unified CRM", desc: "A centralized, 360-degree view of every customer interaction and purchase history." },
      { icon: Repeat, title: "Continuous Engagement", desc: "Automated drip campaigns, retention cycles, and loyalty triggers." },
      { icon: Brain, title: "Predictive Insights", desc: "Behavioral forecasting to capture intent and prevent customer churn." },
      { icon: Handshake, title: "Field Sales Sync", desc: "Push live marketing insights and upsell recommendations to on-field agents during store visits." },
    ],
  },
];

const proServices = [
  { icon: Wrench, title: "Turnkey Implementation & Onboarding", desc: "End-to-end configuration of your e-commerce platform, payment gateways, 3PL logistics, and financial connectors." },
  { icon: Zap, title: "Journey Mapping & Automation Setup", desc: "Strategic design and execution of automated customer lifecycles, WhatsApp flows, and cross-channel drip campaigns." },
  { icon: Share2, title: "Managed Social Media & Ad Ops", desc: "Dedicated content management, content planning, competitor monitoring, and Meta ad campaign optimization." },
  { icon: BarChart3, title: "ROI Performance Consulting", desc: "Monthly deep-dives into your Campaign ROI Tracker data to optimize spend, acquisition baselines, and retention strategies." },
];

const benefits = [
  "Ship a high-conversion storefront in weeks, not quarters",
  "One dashboard from ad click to revenue attribution",
  "Automated lifecycle journeys across Email, SMS, WhatsApp, Push",
  "Predictive churn and upsell signals baked into CRM",
  "Marketing insights delivered to field reps at the point of sale",
  "Optional expert team to run implementation and campaigns for you",
];

export default function QuickMarketingSolution() {
  const navigate = useNavigate();
  React.useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WebsiteHeader />

      <section className="pt-32 pb-20 px-3 sm:px-4 bg-gradient-to-br from-primary/15 via-background to-accent-gold/10">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-2 bg-primary/20 text-primary rounded-full text-sm font-medium mb-6">
                Quick Marketing
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Commerce, campaigns and CRM — <span className="text-primary">one growth stack</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                From your storefront to every ad, every automated journey and every field visit —
                Quick Marketing unifies acquisition, engagement and retention in one platform,
                with an expert team available to run it for you.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
                  Request Demo
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/connectors")}>
                  Explore Connectors
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-10 border border-primary/20 shadow-xl flex items-center justify-center">
                <Megaphone className="w-40 h-40 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tiers */}
      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Three tiers. <span className="text-primary">One growth engine.</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start with commerce, layer on automation, then unlock predictive CRM and field sync.
            </p>
          </div>

          <div className="space-y-10">
            {tiers.map((tier, ti) => (
              <Card key={ti} className="bg-card/50 border-border/50 overflow-hidden">
                <CardContent className="p-8">
                  <div className="flex items-start gap-4 mb-6">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${tier.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                      <tier.icon className="h-7 w-7 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-semibold mb-1">{tier.name}</h3>
                      <p className="text-muted-foreground">{tier.tagline}</p>
                      {tier.includes && (
                        <p className="text-sm text-primary font-medium mt-2">{tier.includes}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4">
                    {tier.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-3 p-4 rounded-lg bg-background/60 border border-border/40">
                        <div className="w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <f.icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-semibold mb-1">{f.title}</h4>
                          <p className="text-sm text-muted-foreground">{f.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 px-3 sm:px-4 bg-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why <span className="text-primary">Quick Marketing?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Most brands stitch together five tools and still can't tie campaigns to revenue.
                Quick Marketing collapses the stack — and lets you plug in our team when you need speed.
              </p>
              <ul className="space-y-4">
                {benefits.map((b, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0 mt-0.5" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Target className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">1x</div>
                <div className="text-sm text-muted-foreground">Attribution Source of Truth</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">4+</div>
                <div className="text-sm text-muted-foreground">Channels Orchestrated</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Repeat className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">3x</div>
                <div className="text-sm text-muted-foreground">Repeat Purchase Lift</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Rocket className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">Weeks</div>
                <div className="text-sm text-muted-foreground">To Go Live</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Services Add-on */}
      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-2 bg-accent-gold/20 text-accent-gold rounded-full text-sm font-medium mb-4">
              Premium Add-On
            </span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Professional Services — <span className="text-primary">we run it for you</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              No in-house team to drive your digital transformation? Pair any tier with our marketing
              and technical experts to accelerate time-to-market and maximize your technology investment.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {proServices.map((s, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-4">
                    <s.icon className="w-6 h-6 text-accent-gold" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{s.title}</h3>
                  <p className="text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-3 sm:px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to unify commerce, campaigns and CRM?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See Quick Marketing in action with your catalog, ad accounts and CRM data.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
              Schedule Free Demo
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
              Talk to Services Team
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}