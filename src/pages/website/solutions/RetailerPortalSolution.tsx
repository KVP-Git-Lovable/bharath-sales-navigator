import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { useNavigate } from "react-router-dom";
import {
  Smartphone, MessageCircle, Truck, Receipt, Gift, Bell,
  Megaphone, CreditCard, Star, ShoppingBag, CheckCircle2, Shield,
} from "lucide-react";

const features = [
  { icon: MessageCircle, title: "WhatsApp Self-Service Orders", description: "Retailers place secondary orders directly via WhatsApp with guided product catalog, schemes and instant order confirmation." },
  { icon: ShoppingBag, title: "Retailer Mobile App", description: "A branded retailer app for secondary orders, browsing your catalog, applying live schemes and reordering favourites in seconds." },
  { icon: Truck, title: "Order & Delivery Tracking", description: "Real-time visibility of order status — placed, picked, dispatched and delivered — with proof of delivery and ETAs." },
  { icon: Receipt, title: "Invoices & Order History", description: "Self-service access to past invoices, credit notes, returns and complete order history with one-tap reorder." },
  { icon: CreditCard, title: "Outstanding & Ledger", description: "Live outstanding balance, ageing, payment due dates and downloadable ledger statements — no calls to the back office." },
  { icon: Gift, title: "Schemes & Offers", description: "Push active and upcoming schemes directly to retailers, with eligibility, slabs and personalised recommendations." },
  { icon: Bell, title: "Feedback & Issues", description: "Capture retailer feedback, complaints and service issues in-app with SLA tracking and resolution updates." },
  { icon: Megaphone, title: "In-App Promotions", description: "Promote new launches, NPD and seasonal pushes with targeted in-app banners and personalised offers per outlet." },
];

const benefits = [
  "Cut order-taking cost — retailers self-serve via WhatsApp or app",
  "Faster cash collection with live outstanding visibility",
  "Higher scheme uptake through personalised in-app nudges",
  "Reduced complaint TAT with in-app feedback workflows",
  "Stronger retailer loyalty via NPD launches and offers",
  "24x7 ordering — no dependency on rep visit windows",
];

export default function RetailerPortalSolution() {
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
                Retailer Portal
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Put your retailers in <span className="text-primary">self-service mode</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Let retailers order, track deliveries, view invoices, check outstanding and discover schemes — through WhatsApp or a branded app. Fewer calls, faster orders, stronger loyalty.
              </p>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
                  Request Demo
                </Button>
                <Button size="lg" variant="outline" onClick={() => navigate("/features")}>
                  View All Features
                </Button>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-10 border border-primary/20 shadow-xl flex items-center justify-center">
                <Smartphone className="w-40 h-40 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything retailers need — <span className="text-primary">in their pocket</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From ordering to outstanding, schemes to feedback — all powered by QuickApp.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
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
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Why a <span className="text-primary">Retailer Portal?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Modern retailers expect Amazon-grade ordering. Give them the same experience for your products.
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
                <Star className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">3x</div>
                <div className="text-sm text-muted-foreground">Order Frequency</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <MessageCircle className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">70%</div>
                <div className="text-sm text-muted-foreground">Self-Service Orders</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Truck className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Delivery Visibility</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Shield className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Always Available</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to empower your retailers?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See QuickApp Retailer Portal in action with your own catalog and schemes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate("/request-demo")}>
              Schedule Free Demo
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/contact")}>
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}