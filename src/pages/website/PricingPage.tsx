import { Check, Zap, Building2, Rocket, Crown, Package, RefreshCw, Bolt, Users, Brain, Sparkles, Headphones, Settings, Code, Store, MessageCircle, Megaphone, LayoutGrid, PackagePlus, LifeBuoy, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";

const pricingTiers = [
  {
    name: "Free",
    price: "₹0",
    period: "for 3 months",
    description: "Perfect for trying out the platform",
    icon: Zap,
    featured: false,
    features: [
      "Up to 5 users",
      "25 orders per day",
      "50 retailers",
      "5 beats",
      "1 GB storage",
      "7-day data retention",
      "Standard reports",
    ],
    cta: "Get Started Free",
  },
  {
    name: "Starter",
    price: "₹25,000",
    period: "/month",
    description: "For small teams starting digital transformation",
    icon: Rocket,
    featured: false,
    highlights: [
      "5,000 orders/month",
      "AI-powered insights — 2,500 AI requests/month",
    ],
    features: [
      "Unlimited users",
      "Secondary sales management",
      "Beat planning & tracking",
      "Visit plan AI (recommended visits)",
      "Territory management",
      "Retailer onboarding - Whatsapp and SMS based verification",
      "Order management",
      "Scheme management",
      "Offline capabilities",
      "Basic analytics",
      "Marketing Pack & Retailer Portal available as add-ons (₹)",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Professional",
    price: "₹45,000",
    period: "/month",
    description: "For growing teams with distributor needs",
    icon: Building2,
    featured: true,
    highlights: [
      "10,000 orders/month",
      "25 distributor portals",
      "AI-powered insights — 5,000 AI requests/month",
    ],
    features: [
      "All features in Starter, plus:",
      "Distributor management system",
      "Primary sales management",
      "Distributor Inventory Management",
      "Van sales and next day delivery and packing list",
      "Distribution invoicing and collection process automation",
      "Distributor target vs. actual",
      "Integration to Zoho Books for distributor",
      "API for Integration",
      "Advanced reporting",
    ],
    cta: "Start Free Trial",
  },
  {
    name: "Enterprise",
    price: "₹85,000",
    period: "/month",
    description: "For large teams with complex operations",
    icon: Crown,
    featured: false,
    highlights: [
      "20,000 orders/month",
      "200 distributor portals",
      "AI-powered insights — 10,000 AI requests/month",
    ],
    features: [
      "All features in Professional, plus:",
      "Institution sales - HORECA and associates for larger orders",
      "Sales coach",
      "Gamification",
      "Retailer loyalty program",
      "Event ROI track and counter sales",
      "Access to 33 pre-built connectors|link:/connectors",
      "Retailer Portal (unlimited retailer logins) (add-on ₹)",
      "Marketing Pack (unlimited campaigns) (add-on ₹)",
      "Microsoft Power BI connector (add-on ₹)",
      "Dedicated Customer Success Manager",
      "Priority support",
    ],
    cta: "Contact Sales",
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "quick-locate" ? "quick-locate" : "field-sales";
  const [activeTab, setActiveTabState] = useState(initialTab);
  const setActiveTab = (val: string) => {
    setActiveTabState(val);
    const next = new URLSearchParams(searchParams);
    next.set("tab", val);
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-3 sm:px-4 overflow-hidden bg-gradient-to-br from-primary/15 via-background to-accent-gold/10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,hsl(var(--primary)/0.18),transparent_55%),radial-gradient(circle_at_80%_20%,hsl(var(--accent-gold)/0.15),transparent_55%)]" />
        <div className="relative w-full mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            One Price • Unlimited Users • Success-Based
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            <span className="text-primary">Success-Based</span> Pricing
          </h1>
          <p className="text-xl text-muted-foreground mb-4">
            We don't charge per user — we charge for the success our platform creates for your business.
          </p>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everyone in your organization deserves the power of digital and AI. That's why all plans include <strong>unlimited users</strong>. 
            Built on AI-first architecture, our platform <strong>guides your team</strong> — not just collects data.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm">
            <a href="#core" className="px-4 py-2 rounded-full bg-muted hover:bg-muted/70 transition-colors font-medium">Core Products</a>
            <a href="#addons" className="px-4 py-2 rounded-full bg-muted hover:bg-muted/70 transition-colors font-medium">Add-Ons</a>
            <a href="#support" className="px-4 py-2 rounded-full bg-muted hover:bg-muted/70 transition-colors font-medium">Support & Services</a>
          </div>
        </div>
      </section>

      {/* ============ CORE PRODUCTS ============ */}
      <section id="core" className="pt-8 pb-4 px-3 sm:px-4">
        <div className="w-full mx-auto max-w-5xl text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-3">
            <LayoutGrid className="w-4 h-4" />
            Core Products
          </div>
          <h2 className="text-2xl md:text-3xl font-bold">Choose the products that fit your business</h2>
          <p className="text-muted-foreground mt-2">Standalone or combined — pay only for the capabilities you need.</p>
        </div>
      </section>

      {/* Tabbed: Quick Field Sales & Quick Locate */}
      <section className="py-4 px-3 sm:px-4">
        <div className="mx-auto w-full max-w-7xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mx-auto grid w-full max-w-md grid-cols-2 mb-8">
              <TabsTrigger value="field-sales">Quick Field Sales</TabsTrigger>
              <TabsTrigger value="quick-locate">Quick Locate</TabsTrigger>
            </TabsList>

            <TabsContent value="field-sales">
      <section className="pt-2 pb-4 px-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="text-center mb-8">
            <h3 className="text-xl md:text-2xl font-semibold">Quick Field Sales</h3>
            <p className="text-sm text-muted-foreground mt-1">For your field reps, distributors, and sales operations.</p>
          </div>
        <div className="w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingTiers.map((tier) => {
              const Icon = tier.icon;
              return (
                <Card
                  key={tier.name}
                  className={`relative p-6 flex flex-col ${
                    tier.featured
                      ? "border-primary bg-primary/5 scale-105 shadow-xl shadow-primary/10"
                      : "border-border bg-card"
                  }`}
                >
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>

                  <div className="mb-4">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                    {tier.name !== "Free" && (
                      <p className="text-xs text-muted-foreground mt-1">Paid Annually (Annual plan only)</p>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {tier.description}
                  </p>

                  {tier.highlights && (
                    <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">
                        Plan capacity
                      </div>
                      <ul className="space-y-1.5">
                        {tier.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      feature.endsWith("plus:") ? (
                        <li key={idx} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">
                          {feature}
                        </li>
                      ) : (
                        (() => {
                          const [text, linkPart] = feature.split("|link:");
                          return (
                            <li key={idx} className="flex items-start gap-2 text-sm">
                              <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                              <span>
                                {text}
                                {linkPart && (
                                  <>
                                    {" "}
                                    <a
                                      href={linkPart}
                                      onClick={(e) => { e.preventDefault(); navigate(linkPart); }}
                                      className="text-primary underline"
                                    >
                                      View catalog
                                    </a>
                                  </>
                                )}
                              </span>
                            </li>
                          );
                        })()
                      )
                    ))}
                  </ul>

                  <Button
                    className={`w-full ${
                      tier.featured
                        ? "bg-primary text-primary-foreground hover:bg-primary/90"
                        : "bg-muted text-foreground hover:bg-muted/80 border border-border"
                    }`}
                    onClick={() => navigate("/request-demo")}
                  >
                    {tier.cta}
                  </Button>
                </Card>
              );
            })}
          </div>
        </div>
        </div>
      </section>

      {/* Implementation & Support */}
      <section className="pt-2 pb-8 px-0">
        <div className="w-full mx-auto max-w-7xl">
          <Card className="p-6 border-border bg-muted/30">
            <h4 className="text-base font-semibold mb-4">
              A One-time implementation cost of 30% of the Annual Contract Value (ACV) is applicable
            </h4>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>The support includes configuration, data upload, profile set-up, reports, user and admin training</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Detailed process documentation</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Testing & Quality Assurance (QA)</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>UAT testing process</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Enabling key reports</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>User training and admin training with training documents for future reference</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Any integration and customisation of new features are not covered.</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>Post go-live support is not covered in implementation plan</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <span>ACV is rate for the edition and add-ons combined</span>
              </li>
            </ul>
          </Card>
        </div>
      </section>

      {/* Retailer Portal */}
      {/* Capacity Packs — compact strip under Field Sales tiers */}
      <section className="pt-2 pb-8 px-0">
        <div className="w-full mx-auto max-w-7xl">
          <Card className="p-5 border-border bg-muted/20">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <PackagePlus className="w-4 h-4 text-primary" />
                  Extend Your Field Sales Plan — Additional Storage
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Add storage anytime on top of your plan. Simple, predictable pricing.
                </p>
              </div>
              <div className="text-xs md:min-w-[280px]">
                <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary text-center">
                  <p className="font-semibold text-sm">Storage Pack</p>
                  <p className="text-muted-foreground">₹500 for 2 GB / month</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* Add-on Order Packs */}
      <section className="pb-8 px-0">
        <div className="w-full mx-auto max-w-7xl">
          <Card className="p-5 border-border bg-muted/20">
            <div className="mb-4">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <PackagePlus className="w-4 h-4 text-primary" />
                Add-on Order Packs
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                Extend your monthly order limit with flexible order packs.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { orders: "500 orders", price: "₹3,500" },
                { orders: "1,000 orders", price: "₹6,500" },
                { orders: "2,000 orders", price: "₹12,000" },
              ].map((pack, i) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-lg bg-primary/5 border border-primary text-center"
                >
                  <p className="font-semibold text-sm">{pack.orders}</p>
                  <p className="text-muted-foreground">{pack.price}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
            </TabsContent>

            <TabsContent value="quick-locate">
      {/* ============ QUICK LOCATE PRICING ============ */}
      <section className="pt-2 pb-4 px-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-3">
              <MapPin className="w-4 h-4" />
              Quick Locate
            </div>
            <h3 className="text-xl md:text-2xl font-semibold">Quick Locate — Attendance, Activities & Site Procurement</h3>
            <p className="text-sm text-muted-foreground mt-1">For distributed teams managing attendance, projects, expenses and vendors across multiple sites.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {[
              {
                name: "Starter", price: "₹0", period: "for 3 months",
                description: "Try Quick Locate free for 3 months.", icon: Zap, featured: false, isTrial: true,
                highlights: ["Up to 5 users", "1 GB storage", "3-month free trial"],
                features: [
                  "Photo attendance",
                  "Leave management",
                  "Apply leave",
                  "Leave approval workflow",
                  "Leave inventory tracking",
                  "1 GB",
                ],
                cta: "Start 3-Month Trial",
              },
              {
                name: "Professional", price: "₹4,000", period: "/month",
                description: "For growing field teams with full activity, visit and leave workflows.", icon: Rocket, featured: true,
                highlights: ["Unlimited users", "2 GB storage"],
                features: [
                  "Photo attendance",
                  "Leave management",
                  "Apply leave",
                  "Leave approval workflow",
                  "Leave inventory tracking",
                  "Plan activity for the day / week",
                  "Visit check-in (at site)",
                  "Visit update — visit type, duration, status and progress",
                ],
                cta: "Start Free Trial",
              },
              {
                name: "Enterprise", price: "₹8,000", period: "/month",
                description: "For project-driven teams that need full expense control.", icon: Building2, featured: false,
                highlights: ["Unlimited users", "5 GB storage"],
                features: [
                  "Photo attendance",
                  "Live location tracking",
                  "Leave management",
                  "Apply leave",
                  "Leave approval workflow",
                  "Leave inventory tracking",
                  "Plan activity for the day / week",
                  "Visit check-in (at site)",
                  "Site photo",
                  "Visit update — visit type, duration, status and progress",
                  "Expense submission",
                  "Receipt / bill upload",
                  "Pending / Approved / Rejected tracking",
                  "User-wise expense summary",
                  "Monthly expense reports",
                  "Effort recording & time-sheet centre",
                  "Advanced expense approvals",
                ],
                cta: "Contact Sales",
              },
            ].map((tier) => {
              const Icon = tier.icon;
              return (
                <Card key={tier.name} className={`relative p-6 flex flex-col ${tier.featured ? "border-primary bg-primary/5 scale-105 shadow-xl shadow-primary/10" : "border-border bg-card"}`}>
                  {tier.featured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">Most Popular</span>
                    </div>
                  )}
                  <div className="mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">{tier.name}</h3>
                  </div>
                  <div className="mb-4">
                    <span className="text-3xl font-bold">{tier.price}</span>
                    <span className="text-muted-foreground">{tier.period}</span>
                    {!tier.isTrial && (
                      <p className="text-xs text-muted-foreground mt-1">Paid Annually (Annual plan only)</p>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">{tier.description}</p>
                  {tier.highlights && (
                    <div className="mb-5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                      <div className="text-[10px] uppercase tracking-wider font-semibold text-primary mb-2">Plan capacity</div>
                      <ul className="space-y-1.5">
                        {tier.highlights.map((h, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm font-medium">
                            <Sparkles className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                            <span>{h}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      feature.endsWith("plus:") ? (
                        <li key={idx} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-1">{feature}</li>
                      ) : (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      )
                    ))}
                  </ul>
                  <Button className={`w-full ${tier.featured ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-foreground hover:bg-muted/80 border border-border"}`} onClick={() => navigate("/request-demo")}>
                    {tier.cta}
                  </Button>
                </Card>
              );
            })}
          </div>

          <div className="mt-10">
            <div className="text-center mb-6">
              <h4 className="text-lg md:text-xl font-semibold flex items-center gap-2 justify-center">
                <PackagePlus className="w-5 h-5 text-primary" />
                Extend Quick Locate — Add-on Packs
              </h4>
              <p className="text-xs text-muted-foreground mt-1">Bolt on CRM, project or procurement capabilities. Unlimited users on every pack. Add-on packs run on one of the Quick Locate editions and consume the same storage as that edition.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "Quick CRM Lite",
                  price: "₹3,000 / month",
                  note: "Unlimited users",
                  items: [
                    "Sales team can create opportunities linked to a customer record",
                    "Track opportunity pipeline by team member — status, value and expected close date (PO)",
                    "Revenue planning — payment milestones and revenue forecasting",
                    "Planned vs actual billing date and value comparison",
                    "Map decision makers and multiple contacts (procurement, supporter)",
                    "Upload quotes and customer purchase orders / sign-offs",
                  ],
                },
                {
                  name: "Quick Project Lite",
                  price: "₹3,000 / month",
                  note: "Unlimited users",
                  items: [
                    "Creation of project",
                    "Project milestones",
                    "Progress recording of each milestone",
                    "Project photos",
                    "Project risk reporting",
                    "Project site visit — check-in and check-out",
                  ],
                },
                {
                  name: "Quick Procure Lite",
                  price: "₹3,000 / month",
                  note: "Unlimited users",
                  items: [
                    "Procurement",
                    "Site procurement",
                    "Vendor registrations",
                    "Requisitions from site",
                    "Vendor short-list",
                    "Goods receipt and inspection",
                    "Vendor invoice approval",
                    "Vendor payment status",
                    "Vendor 360",
                    "Vendor onboarding",
                    "All POs by vendor",
                    "Vendor payment",
                    "Vendor feedback",
                  ],
                },
              ].map((pack) => (
                <Card key={pack.name} className="p-5 border-border bg-card flex flex-col">
                  <div className="mb-3">
                    <h5 className="text-base font-semibold">{pack.name}</h5>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-primary">{pack.price}</span>
                      <span className="text-xs text-muted-foreground">{pack.note}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Paid Annually (Annual plan only)</p>
                  </div>
                  <ul className="space-y-2 mb-4 flex-grow">
                    {pack.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/request-demo")}>
                    Add Pack
                  </Button>
                </Card>
              ))}
            </div>

            <Card className="mt-6 p-5 border-border bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-primary" />
                    Extend Your Quick Locate Plan — Additional Storage
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Add storage anytime on top of your plan. Simple, predictable pricing.</p>
                </div>
                <div className="text-xs md:min-w-[280px]">
                  <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary text-center">
                    <p className="font-semibold text-sm">Storage Pack</p>
                    <p className="text-muted-foreground">₹1,000 per 1 GB / month</p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>
            </TabsContent>
          </Tabs>
        </div>
      </section>

      {/* Enterprise Plus Section */}
      <section className="py-16 px-3 sm:px-4">
        <div className="w-full mx-auto max-w-4xl">
          <Card className="p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">Enterprise Plus</h2>
                <p className="text-muted-foreground mb-4">
                  For large enterprises with large field reps and multi-region operations
                </p>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Unlimited everything
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    White-label options
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Custom integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    Dedicated success manager
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    SLA guarantees
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-primary" />
                    On-premise deployment
                  </li>
                </ul>
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Custom pricing</p>
                <Button size="lg" onClick={() => navigate("/request-demo")}>
                  Contact Sales
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* ============ ADD-ONS ============ */}
      <section id="addons" className="py-16 px-3 sm:px-4">
        <div className="w-full mx-auto max-w-7xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Package className="w-4 h-4" />
              Add-Ons
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Engagement, Channels & Customer Portal</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Add new channels and customer-facing apps. Predictable, prepaid pricing — no per-transaction penalties.
            </p>
            <p className="text-xs text-muted-foreground max-w-2xl mx-auto mt-2">
              Storage is as per the edition you choose. Add-ons run on one of the editions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* WhatsApp Pack */}
            <Card className="p-6 flex flex-col border-border hover:border-primary/50 transition-colors">
                <div className="mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                    <MessageCircle className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">WhatsApp Pack</h3>
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-bold">₹5,000</span>
                  <span className="text-muted-foreground">/Pack</span>
                </div>
                <p className="text-sm text-muted-foreground mb-6">
                  For dedicated, high-volume WhatsApp communication.
                </p>
                <ul className="space-y-3 mb-6 flex-grow">
                  {[
                    "Unlimited campaigns",
                    "2,500 messages included",
                    "Template & broadcast management",
                    "Delivery & engagement analytics",
                  ].map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="border-t border-border pt-3 mb-4 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">Additional Pack:</span> ₹2,000 per 1,000 messages — stackable & rolls over.
                </div>
                <Button
                  className="w-full bg-muted text-foreground hover:bg-muted/80 border border-border"
                  onClick={() => navigate("/request-demo")}
                >
                  Activate Pack
                </Button>
              </Card>

            {/* Marketing Pack */}
            <Card className="p-6 flex flex-col border-primary bg-primary/5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  New
                </span>
              </div>
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Megaphone className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Marketing Pack</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">₹5,000</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                A unified social media marketing suite.
              </p>
              <ul className="space-y-3 mb-8 flex-grow">
                {[
                  "Unlimited campaigns",
                  "Unified analytics across channels",
                  "Journey Builder",
                  "Ad Campaign Management (Facebook & Instagram)",
                  "Return on Investment (ROI) tracking",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate("/request-demo")}
              >
                Activate Pack
              </Button>
              <div className="mt-3 text-xs text-muted-foreground border-t border-border pt-3">
                <span className="font-semibold text-foreground">Disclaimer:</span> Advertisement costs are not included. Ad spend will be paid directly to the respective platform based on your marketing plan and budget.
              </div>
            </Card>

            {/* Customer Portal */}
            <Card className="p-6 flex flex-col border-border hover:border-primary/50 transition-colors">
              <div className="mb-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Store className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Customer Portal</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold">₹10,000</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                Let customers & retailers self-order via iOS, Android apps and WhatsApp AI.
              </p>
              <ul className="space-y-3 mb-6 flex-grow">
                {[
                  "Customer logins",
                  "iOS & Android apps (Play Store + App Store)",
                  "Storage as per the edition you choose",
                  "WhatsApp AI conversational order-taking",
                  "Order placement, shipment tracking & schemes",
                  "Returns & issue raising from the app",
                  "Standard support",
                ].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="w-full bg-muted text-foreground hover:bg-muted/80 border border-border"
                onClick={() => navigate("/request-demo")}
              >
                Start Free Trial
              </Button>
            </Card>
          </div>

          {/* WhatsApp Pack FAQ */}
          <Card className="p-5 border-border bg-muted/20 mb-8">
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-primary" />
              WhatsApp Pack — Quick Guide
            </h4>
            <div className="grid md:grid-cols-3 gap-4 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-0.5">How are messages counted?</p>
                <p>Every message sent to a unique WhatsApp number counts as one — regardless of message type (text, image, template, or AI reply).</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Do unused messages roll over?</p>
                <p>Yes. Unused messages from your pack roll over until fully consumed. Additional packs (₹2,000 / 1,000 messages) also roll over.</p>
              </div>
              <div>
                <p className="font-medium text-foreground mb-0.5">Message types explained</p>
                <ul className="space-y-1 mt-1 list-disc pl-4">
                  <li><strong className="text-foreground">Utility:</strong> Order confirmations, shipment alerts, payment reminders.</li>
                  <li><strong className="text-foreground">Advertisement:</strong> Promotional broadcasts, scheme announcements, product launches.</li>
                  <li><strong className="text-foreground">AI Conversation BOT:</strong> Two-way WhatsApp chat where retailers can ask questions, check stock, or place orders.</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Benefits */}
          <div className="grid sm:grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Unused Quota Rolls Over</p>
              <p className="text-xs text-muted-foreground">Never lose what you paid for</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Stack Multiple Packs</p>
              <p className="text-xs text-muted-foreground">Buy as many as you need</p>
            </div>
            <div className="flex flex-col items-center gap-2 p-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bolt className="w-5 h-5 text-primary" />
              </div>
              <p className="text-sm font-medium">Instant Activation</p>
              <p className="text-xs text-muted-foreground">Start using immediately</p>
            </div>
          </div>
        </div>
      </section>

      {/* ============ SUPPORT & SERVICES ============ */}
      <section id="support" className="py-16 px-3 sm:px-4 bg-muted/30">
        <div className="w-full mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-4">
              <LifeBuoy className="w-4 h-4" />
              Support & Services
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Enterprise-Grade Support</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Empower your organization with seamless operations, high user adoption, and continuous business value. Our professional services deliver comprehensive, scalable, and outcome-driven support.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* L1 Support */}
            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium text-primary">L1</span>
                  <h3 className="font-semibold">User Support</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Helpdesk, Proactive Monitoring & Enablement
              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>First point of contact for all end-users</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>App usage and 'how-to' queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Proactive monitoring & training sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Dedicated Customer Success Manager</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Platform updates, and access to our help portal.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Any new change request and integration request is not covered in the support.</span>
                </li>
              </ul>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-1">9 AM to 7 PM IST, Mon-Fri</p>
                <p className="text-sm font-semibold">20% of annual contract value of overall subscription (edition and add-ons)</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Fair usage: Max 50 hours/year. Additional support budget may be requested for significant increase in requests.
                </p>
              </div>
            </Card>

            {/* L2 Support */}
            <Card className="p-6 border-primary bg-primary/5 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Most Requested
                </span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium text-primary">L2</span>
                  <h3 className="font-semibold">Configuration Support</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Configuration & Minor Change Requests
              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>System/process configuration support</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Minor change requests (field additions)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Report tweaks and customizations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Root cause analysis & solution deployment</span>
                </li>
              </ul>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold">Estimates provided per request</p>
                <p className="text-xs text-muted-foreground">Based on scope of work</p>
              </div>
            </Card>

            {/* L3 Support */}
            <Card className="p-6 border-border hover:border-primary/50 transition-colors">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Code className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <span className="text-xs font-medium text-primary">L3</span>
                  <h3 className="font-semibold">Enhancement Support</h3>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                New Features, Enhancements & Integrations
              </p>
              <ul className="space-y-2 text-sm mb-6">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Custom feature development</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Third-party integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Platform enhancements</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Complex workflow automation</span>
                </li>
              </ul>
              <div className="border-t border-border pt-4">
                <p className="text-sm font-semibold">Custom project pricing</p>
                <p className="text-xs text-muted-foreground">Based on requirements & timeline</p>
              </div>
            </Card>
          </div>

          <div className="text-center mb-6 flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={() => navigate("/request-demo")} size="lg">
              Discuss Your Support Needs
            </Button>
            <Button 
              onClick={() => navigate("/solutions/professional-services")} 
              size="lg" 
              variant="outline"
            >
              Learn More About Professional Services
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Tax (GST) applicable as per government rules at the time of purchase.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-3 sm:px-4 bg-muted/30">
        <div className="w-full mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Why do you offer unlimited users?</h3>
              <p className="text-muted-foreground text-sm">
                We believe everyone in your organization deserves access to the power of digital and AI. Per-user pricing creates barriers that prevent full adoption. With unlimited users, your entire team can benefit from intelligent sales guidance.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What does "success-based pricing" mean?</h3>
              <p className="text-muted-foreground text-sm">
                Our pricing is tied to the value we create — measured by orders, retailers, and visits. We're invested in your success, not in charging for empty seats. When your business grows, we grow together.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How is QuickApp.AI different from other SFAs?</h3>
              <p className="text-muted-foreground text-sm">
                We're built on AI-first architecture. That means our platform doesn't just collect data — it actively <strong>guides</strong> your sales team with intelligent recommendations, predictive insights, and coaching. It's like having an AI sales coach for every rep.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">What happens if I exceed my plan limits?</h3>
              <p className="text-muted-foreground text-sm">
                We'll notify you at 80% and 100% consumption. You can instantly top up with Add-On Packs — no per-transaction penalties, just predictable pricing.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Is there a free trial?</h3>
              <p className="text-muted-foreground text-sm">
                Yes! All paid plans come with a 14-day free trial. No credit card required. Experience the full power of AI-guided sales.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">How much retailer records or orders can be consumed in one GB?</h3>
              <p className="text-muted-foreground text-sm">
                One GB typically stores around 10,000–12,000 retailer records or 10,000 to 20,000 order records depending on line items per orders. The exact count depends on the amount of metadata, images, and attachments associated with each record. Storage usage scales with your data richness, not just count.
              </p>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};
