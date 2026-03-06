import { Check, Zap, Building2, Rocket, Crown, Package, RefreshCw, Bolt, Users, Brain, Sparkles, Headphones, Settings, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";

const pricingTiers = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    description: "Perfect for trying out the platform",
    icon: Zap,
    featured: false,
    features: [
      "Up to 10 users",
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
    features: [
      "Unlimited users",
      "5,000 orders/month",
      "GPS Tracking",
      "Secondary sales management",
      "Beat planning & tracking",
      "AI-powered insights — 2,500 AI credits/month",
      "5 GB storage",
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
    features: [
      "Everything in Starter, plus:",
      "10,000 orders/month",
      "25 distributor portals",
      "Primary sales management",
      "Product bundles",
      "AI-powered insights — 5,000 AI credits/month",
      "10 GB storage",
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
    features: [
      "Everything in Professional, plus:",
      "20,000 orders/month",
      "100 distributor portals",
      "Institutional sales",
      "AI-powered insights — 10,000 AI credits/month",
      "15 GB storage",
      "Sales coach",
      "Gamification",
      "Retailer loyalty program",
      "Priority support",
    ],
    cta: "Contact Sales",
  },
];

export const PricingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
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
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-4">
        <div className="container mx-auto">
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
                  </div>

                  <p className="text-sm text-muted-foreground mb-6">
                    {tier.description}
                  </p>

                  <ul className="space-y-3 mb-8 flex-grow">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
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
      </section>

      {/* Enterprise Plus Section - Hidden */}

      {/* Add-On Packs Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Package className="w-4 h-4" />
              Add-On Packs
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Need More Capacity?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Top up instantly with prepaid add-on packs. No per-transaction penalties, just predictable pricing.
            </p>
          </div>

          {/* Order Pack Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Basic Pack */}
            <Card className="p-6 border-border hover:border-primary/50 transition-colors text-center">
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <h3 className="font-semibold text-foreground">Basic Pack</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">₹3,500</span>
              </div>
              <p className="text-sm text-muted-foreground">500 orders per pack</p>
            </Card>

            {/* Standard Pack */}
            <Card className="p-6 border-primary bg-primary/5 relative text-center">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <h3 className="font-semibold text-foreground">Standard Pack</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">₹6,500</span>
              </div>
              <p className="text-sm text-muted-foreground">1,000 orders per pack</p>
            </Card>

            {/* Premium Pack */}
            <Card className="p-6 border-border hover:border-primary/50 transition-colors text-center">
              <div className="flex items-center justify-center gap-2 mb-5">
                <div className="w-3 h-3 rounded-full bg-purple-500" />
                <h3 className="font-semibold text-foreground">Premium Pack</h3>
              </div>
              <div className="mb-4">
                <span className="text-3xl font-bold text-foreground">₹12,000</span>
              </div>
              <p className="text-sm text-muted-foreground">2,000 orders per pack</p>
            </Card>
          </div>

          {/* Add-on Boxes */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-5 border-border hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Storage Add-on</p>
                  <p className="text-xs text-muted-foreground">Expand your storage capacity</p>
                </div>
              </div>
              <span className="text-lg font-bold text-foreground">₹500 <span className="text-sm font-normal text-muted-foreground">/ 5 GB</span></span>
            </Card>

            <Card className="p-5 border-border hover:border-primary/50 transition-colors flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bolt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">AI Credits Add-on</p>
                  <p className="text-xs text-muted-foreground">Additional AI-powered insights</p>
                </div>
              </div>
              <span className="text-lg font-bold text-foreground">₹500 <span className="text-sm font-normal text-muted-foreground">/ 2,500 credits</span></span>
            </Card>
          </div>
        </div>
      </section>

      {/* Professional Services Section */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Headphones className="w-4 h-4" />
              Professional Services
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
                  <span>Mobile app usage and 'how-to' queries</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Proactive monitoring & training sessions</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>Dedicated Customer Success Manager</span>
                </li>
              </ul>
              <div className="border-t border-border pt-4">
                <p className="text-xs text-muted-foreground mb-1">9 AM to 7 PM IST, Mon-Fri</p>
                <p className="text-sm font-semibold">25% of annual subscription (Year 1)</p>
                <p className="text-sm font-semibold">20% from Year 2 onwards</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Fair usage: Max 50 hours/month. Additional support budget may be requested for significant increase in requests.
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
      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-3xl">
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
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};
