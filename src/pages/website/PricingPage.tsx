import { Check, Zap, Building2, Rocket, Crown, Package, Users, Brain, Sparkles, Store, Megaphone, LayoutGrid, PackagePlus, MapPin } from "lucide-react";
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
      "Unlimited users",
      "5,000 orders/month",
      "5 GB storage",
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
      "Unlimited users",
      "10,000 orders/month",
      "10 GB storage",
      "25 distributor portals",
      "AI-powered insights — 5,000 AI requests/month",
    ],
    features: [
      "All features in Starter, plus:",
      "Distributor management system",
      "Primary sales management",
      "Distributor Inventory Management",
      "Van sales and next day delivery and packing list",
      "Retailer invoicing and collection process automation",
      "Distributor target vs. actual",
      "Integration to Zoho Books for distributor",
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
      "Unlimited users",
      "20,000 orders/month",
      "20 GB storage",
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
      "API for Integration",
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
  const tabParam = searchParams.get("tab");
  const initialTab =
    tabParam === "quick-locate" ? "quick-locate" :
    tabParam === "quick-marketing" ? "quick-marketing" :
    "field-sales";
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
            <TabsList className="mx-auto grid w-full max-w-2xl grid-cols-3 mb-8">
              <TabsTrigger value="field-sales">Quick Field Sales</TabsTrigger>
              <TabsTrigger value="quick-locate">Quick Locate</TabsTrigger>
              <TabsTrigger value="quick-marketing">Quick Marketing</TabsTrigger>
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
      <section className="pt-12 md:pt-16 pb-8 px-0">
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
                  <p className="text-muted-foreground">Rs. 500 per month for 2 GB</p>
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
                Extend your order limit with flexible order packs.
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

            <TabsContent value="quick-marketing">
      {/* ============ QUICK MARKETING PRICING ============ */}
      <section className="pt-2 pb-4 px-0">
        <div className="mx-auto w-full max-w-7xl">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-3">
              <Megaphone className="w-4 h-4" />
              Quick Marketing
            </div>
            <h3 className="text-xl md:text-2xl font-semibold">Quick Marketing — Commerce, Amplify & 360°</h3>
            <p className="text-sm text-muted-foreground mt-1">A three-tier marketing platform — from storefront to omnichannel journeys, ads and ROI.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 w-full">
            {[
              {
                name: "QuickCommerce", price: "₹15,000", period: "/month", icon: Store, featured: false,
                description: "Launch a high-conversion storefront and start selling online — fast.",
                highlights: ["Unlimited users", "1 branded storefront", "5 GB storage"],
                features: [
                  "Branded storefront (web + mobile-optimized)",
                  "Product catalog with variants, pricing & inventory sync",
                  "Cart, checkout & order management",
                  "Payment gateway integration (Razorpay / Stripe ready)",
                  "Shipping & delivery zone configuration",
                  "Customer accounts, order history & re-order",
                  "Coupons, discounts & basic promotions",
                  "SEO-ready pages & meta management",
                  "Basic storefront analytics (traffic, orders, conversion)",
                  "WhatsApp & email order notifications",
                  "Standard support (business hours)",
                ],
                cta: "Start Free Trial",
              },
              {
                name: "MarketingAmplify", price: "₹30,000", period: "/month", icon: Megaphone, featured: true,
                description: "Add multi-channel campaigns, journeys and ad management on top of commerce.",
                highlights: ["Everything in QuickCommerce", "Unlimited campaigns", "10 GB storage"],
                features: [
                  "All QuickCommerce features, plus:",
                  "Multi-channel campaigns — Email, SMS, WhatsApp & Push",
                  "Journey Builder with triggers & automations",
                  "Customer segmentation & lookalike audiences",
                  "Meta (Facebook & Instagram) ad campaign management",
                  "Google Ads campaign management (search & shopping)",
                  "Landing page builder for campaigns",
                  "Content planning calendar",
                  "A/B testing for creatives, subject lines & CTAs",
                  "Lead capture forms & CRM sync",
                  "Unified campaign analytics across channels",
                  "Basic ROI dashboards",
                ],
                cta: "Start Free Trial",
              },
              {
                name: "Marketing360", price: "₹55,000", period: "/month", icon: Crown, featured: false,
                description: "Full-stack marketing — commerce, campaigns, ROI intelligence & customer retention.",
                highlights: ["Everything in MarketingAmplify", "Advanced ROI tracker", "25 GB storage"],
                features: [
                  "All MarketingAmplify features, plus:",
                  "Campaign ROI Tracker — spend, CAC, LTV, ROAS",
                  "Retention & loyalty program builder",
                  "Referral program with tracking & payouts",
                  "Advanced customer segmentation (RFM, cohorts)",
                  "Competitor monitoring (mentions, ads, pricing signals)",
                  "Social listening & sentiment tracking",
                  "Influencer / affiliate tracking",
                  "Attribution modeling (first-touch, last-touch, multi-touch)",
                  "Custom dashboards & exec reporting",
                  "Predictive insights (churn risk, next-best-offer)",
                  "Priority support with dedicated marketing success lead",
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
                    <p className="text-xs text-muted-foreground mt-1">Paid Annually (Annual plan only)</p>
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

          {/* Professional Services (Quick Marketing) */}
          <div className="mt-10">
            <div className="text-center mb-6">
              <h4 className="text-lg md:text-xl font-semibold flex items-center gap-2 justify-center">
                <Sparkles className="w-5 h-5 text-primary" />
                Professional Services — Done-For-You Marketing
              </h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-3xl mx-auto">
                Buy the software and let our marketing specialists run it. All professional services are quoted as <strong>custom pricing</strong> based on scope, channels and monthly retainer.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[
                {
                  name: "Turnkey Implementation",
                  price: "Custom pricing",
                  items: [
                    "Storefront setup, theming & branding",
                    "Product catalog upload & taxonomy",
                    "Payment, shipping & tax configuration",
                    "Domain, SEO & analytics setup",
                    "Team training & go-live support",
                  ],
                },
                {
                  name: "Customer Journey Mapping",
                  price: "Custom pricing",
                  items: [
                    "Persona & funnel workshops",
                    "Lifecycle journey design (acquisition → retention)",
                    "Journey Builder automation setup",
                    "Message & creative frameworks",
                    "KPI definition & measurement plan",
                  ],
                },
                {
                  name: "Managed Social Media & Ad Ops",
                  price: "Custom pricing",
                  items: [
                    "Content planning & calendar management",
                    "Post scheduling across Meta, LinkedIn, YouTube",
                    "Meta & Google ad campaign setup and optimisation",
                    "Creative production coordination",
                    "Competitor monitoring & monthly reporting",
                  ],
                },
                {
                  name: "ROI Performance Consulting",
                  price: "Custom pricing",
                  items: [
                    "Monthly Campaign ROI deep-dive",
                    "CAC, LTV and ROAS optimisation",
                    "Budget re-allocation across channels",
                    "Retention & loyalty strategy tuning",
                    "Executive dashboards & QBRs",
                  ],
                },
                {
                  name: "SEO & Content Services",
                  price: "Custom pricing",
                  items: [
                    "Technical SEO audit & fixes",
                    "Keyword strategy & content calendar",
                    "Blog & landing page copywriting",
                    "Backlink and outreach programs",
                    "Monthly organic performance reporting",
                  ],
                },
                {
                  name: "WhatsApp & CRM Enablement",
                  price: "Custom pricing",
                  items: [
                    "WhatsApp Business API onboarding",
                    "Template design & approvals",
                    "Broadcast & drip campaign setup",
                    "CRM data hygiene & segmentation",
                    "Chatbot flow design",
                  ],
                },
              ].map((svc) => (
                <Card key={svc.name} className="p-5 border-border bg-card flex flex-col">
                  <div className="mb-3">
                    <h5 className="text-base font-semibold">{svc.name}</h5>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-xl font-bold text-primary">{svc.price}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1">Scoped monthly or per-project</p>
                  </div>
                  <ul className="space-y-2 mb-4 flex-grow">
                    {svc.items.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs">
                        <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => navigate("/request-demo")}>
                    Request Quote
                  </Button>
                </Card>
              ))}
            </div>

            {/* Disclaimers */}
            <Card className="mt-6 p-5 border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                What is not included
              </h4>
              <ul className="space-y-1.5 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Ad spend is not covered.</strong> Advertising budgets for Meta, Google, LinkedIn or any other platform are paid directly by you to the respective platform.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span><strong className="text-foreground">Third-party app costs are not covered.</strong> Licenses or usage fees for tools such as WhatsApp Business API, email/SMS gateways, payment gateways, CRM, design tools and analytics platforms are billed directly by the provider.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Creative production costs (video shoots, influencer fees, premium stock, translations) are quoted separately when required.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  <span>Taxes (GST) applicable as per government rules at the time of purchase.</span>
                </li>
              </ul>
            </Card>

            {/* Storage add-on */}
            <Card className="mt-4 p-5 border-border bg-muted/20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <PackagePlus className="w-4 h-4 text-primary" />
                    Extend Your Quick Marketing Plan — Additional Storage
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">Add storage anytime on top of your plan for creatives, product images and campaign assets.</p>
                </div>
                <div className="text-xs md:min-w-[280px]">
                  <div className="px-4 py-3 rounded-lg bg-primary/5 border border-primary text-center">
                    <p className="font-semibold text-sm">Storage Pack</p>
                    <p className="text-muted-foreground">₹1,000 per 5 GB / month</p>
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
