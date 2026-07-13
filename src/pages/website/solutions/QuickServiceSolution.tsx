import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { useNavigate } from "react-router-dom";
import {
  Headphones, Phone, MessageSquare, BookOpen, Bot, LayoutDashboard,
  Wrench, CalendarClock, Boxes, ShieldCheck, Users, Receipt,
  Radio, Video, LineChart, CheckCircle2, Sparkles, Building2, Rocket, Crown,
} from "lucide-react";

const customerServiceFeatures = [
  { icon: MessageSquare, title: "Omnichannel Case Management", description: "Unified routing across Email, Web, SMS, WhatsApp and Social (Meta) into a single agent workspace." },
  { icon: CalendarClock, title: "Resolution Workflow Engine", description: "Automated SLA milestones, escalation paths and conditional approval loops keep every case on-track." },
  { icon: Phone, title: "CTI Connect", description: "Native softphone with click-to-dial, screen pops with customer history and automated call logging." },
  { icon: BookOpen, title: "Knowledge Base Management", description: "Centralized repository of internal articles for agents and external FAQs for customers." },
  { icon: Bot, title: "Autonomous AI Case Handling", description: "Voice AI for inbound/outbound calls, AI email & chat drafting, sentiment analysis and auto case-tagging." },
  { icon: Users, title: "Customer Self-Service Portal", description: "Branded portal for customers to log tickets, track repairs and search the knowledge base independently." },
  { icon: LayoutDashboard, title: "Supervisor Dashboard & Analytics", description: "Live tracking of FCR, AHT, CSAT and agent productivity across every channel." },
];

const fieldServiceFeatures = [
  { icon: CalendarClock, title: "Dynamic Scheduling & Dispatch", description: "Intelligent matching of jobs to engineers based on skills, geography and live availability." },
  { icon: Wrench, title: "Field Service Mobile App", description: "Offline-first app for engineers to view schedules, update task status, log time and capture digital signatures." },
  { icon: ShieldCheck, title: "Asset & Preventative Maintenance", description: "Track customer equipment, warranty status and recurring PM calendars automatically." },
  { icon: Boxes, title: "Spare Parts & Truck Stock", description: "Real-time visibility of warehouse and van inventory, serial number tracking and part requests." },
  { icon: Users, title: "ASP Network Portal", description: "Dispatch tickets to authorized service providers, track performance and process rebates by tier metrics." },
  { icon: ShieldCheck, title: "Contracts, Warranties & AMCs", description: "End-to-end lifecycle for AMCs, service contracts and dynamic warranty validation." },
  { icon: Receipt, title: "Engineer Expense & Job Costing", description: "Digital expense capture tied to work orders for accurate margin calculation per job." },
  { icon: Radio, title: "IoT-Driven Proactive Service", description: "Ingest machine alerts to automatically raise a field ticket before a breakdown happens." },
  { icon: Video, title: "Visual Remote Assistance", description: "Live video streams inside the app so senior technicians can guide ground engineers through complex repairs." },
];

const tiers = [
  {
    name: "Service Foundation",
    icon: Rocket,
    featured: false,
    tagline: "Digital Helpdesk",
    description: "Streamline desk-bound customer support, ticketing and basic issue resolution workflows.",
    features: [
      "Omnichannel ticketing — Email, Web & Social channels",
      "Standard resolution workflows & assignment rules",
      "Basic SLA tracking milestones",
      "Core knowledge base for agents",
      "Post-case CSAT email surveys",
      "Standard reports on volume, response & resolution",
    ],
  },
  {
    name: "Service Pro",
    icon: Building2,
    featured: true,
    tagline: "Connected Field Operations",
    description: "For organizations with physical assets and on-ground field teams requiring scheduling, contracts and inventory.",
    features: [
      "Everything in Service Foundation, plus:",
      "Field Service mobile app (offline + digital signatures)",
      "Smart drag-and-drop dispatch board",
      "Customer asset & warranty management",
      "AMC and service contract lifecycle",
      "Preventative maintenance engine",
      "Inventory & truck stock tracking",
      "Engineer expense management",
      "CTI integration with screen pops",
    ],
  },
  {
    name: "Service Ultimate",
    icon: Crown,
    featured: false,
    tagline: "Autonomous & Partner Ecosystem",
    description: "The complete enterprise suite for complex, high-scale operations with vendor networks and AI automation.",
    features: [
      "Everything in Service Pro, plus:",
      "Autonomous AI case handling — voice, email & chat",
      "ASP portal with performance tracking & rebates",
      "IoT proactive alerting & auto-dispatch",
      "Visual remote assistance (AR / video)",
      "Advanced analytics & workforce forecasting",
      "Dedicated success manager & priority support",
    ],
  },
];

const benefits = [
  "One platform for customer service, field service and partner networks",
  "Enterprise-grade alternative to Salesforce Service Cloud & Field Service",
  "AI-first — deflect routine cases and boost agent productivity",
  "Offline-ready mobile app built for field engineers",
  "Proactive service with IoT alerts and preventative maintenance",
  "Full visibility of SLAs, CSAT, FCR and workforce utilisation",
];

export default function QuickServiceSolution() {
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
                Quick Service
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Enterprise customer & <span className="text-primary">field service</span> — reinvented with AI
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Quick Service unifies omnichannel case management, field dispatch, contracts, IoT-driven proactive service and partner networks into one AI-first platform — an enterprise-grade alternative to Salesforce Service Cloud & Field Service.
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
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-10 border border-primary/20 shadow-xl flex items-center justify-center">
                <Headphones className="w-40 h-40 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold mb-3">The Digital Core</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quick <span className="text-primary">Customer Service</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              A unified agent workspace with omnichannel routing, AI-assisted resolution and a branded self-service portal for your customers.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {customerServiceFeatures.map((f, i) => (
              <Card key={i} className="bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4 bg-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold mb-3">The Ground Engine</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Quick <span className="text-primary">Field Service</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Schedule, dispatch and complete field jobs with an offline-first engineer app, contracts, spare parts and an ASP partner network — all in one place.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {fieldServiceFeatures.map((f, i) => (
              <Card key={i} className="bg-card/70 border-border/50 hover:border-primary/50 transition-all duration-300">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center mb-4">
                    <f.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
                  <p className="text-muted-foreground">{f.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Choose your <span className="text-primary">Quick Service</span> edition
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Three packaged tiers — from a digital helpdesk to a full autonomous service ecosystem.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((t) => {
              const Icon = t.icon;
              return (
                <Card key={t.name} className={`relative p-6 flex flex-col ${t.featured ? "border-primary bg-primary/5 shadow-xl shadow-primary/10 scale-[1.02]" : "border-border bg-card"}`}>
                  {t.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{t.name}</h3>
                    <p className="text-xs uppercase tracking-wider text-primary mt-1">{t.tagline}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{t.description}</p>
                  <ul className="space-y-3 mb-8 flex-grow">
                    {t.features.map((f, idx) => (
                      f.endsWith("plus:") ? (
                        <li key={idx} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">{f}</li>
                      ) : (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{f}</span>
                        </li>
                      )
                    ))}
                  </ul>
                  <Button className={`w-full ${t.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-foreground hover:bg-muted/80 border border-border"}`} onClick={() => navigate("/request-demo")}>
                    Talk to Sales
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4 bg-primary/5">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why <span className="text-primary">Quick Service?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Consolidate helpdesk, field operations, contracts, spare parts and partner networks — with AI woven into every step.
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
                <LineChart className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">40%</div>
                <div className="text-sm text-muted-foreground">Faster First Response</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Bot className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">60%</div>
                <div className="text-sm text-muted-foreground">AI Deflection Rate</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Wrench className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">2x</div>
                <div className="text-sm text-muted-foreground">Engineer Utilisation</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Sparkles className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">95%</div>
                <div className="text-sm text-muted-foreground">CSAT Achievable</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to modernise your service organisation?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See Quick Service in action with your own cases, engineers and contracts.
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