import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { useNavigate } from "react-router-dom";
import {
  MapPin, Clock, Calendar, Camera, Receipt, ClipboardList,
  Briefcase, ShoppingBag, Users, CheckCircle2, Navigation, Timer,
} from "lucide-react";

const features = [
  { icon: Clock, title: "Photo Attendance", description: "GPS + selfie based attendance with live location tracking for every user, every day." },
  { icon: Calendar, title: "Leave Management", description: "Apply, approve and track leaves with full leave inventory and multi-step approval workflows." },
  { icon: ClipboardList, title: "Activity & Visit Planning", description: "Plan activities for the day or week, check in at sites, and update visit type, duration, status and progress." },
  { icon: Camera, title: "Site Photos & Effort", description: "Capture site photos on every visit and record effort hours via a built-in time sheet centre." },
  { icon: Briefcase, title: "Projects & Milestones", description: "Create projects and sites, define milestones, and record real-time progress against each milestone." },
  { icon: Receipt, title: "Expense Management", description: "Submit expenses with receipt uploads, track pending/approved/rejected status, and get monthly reports." },
  { icon: ShoppingBag, title: "Site Procurement", description: "End-to-end site procurement — requisitions, vendor short-list, PO generation, goods receipt and invoice approval." },
  { icon: Users, title: "Vendor 360", description: "Onboard vendors, view all POs by vendor, manage vendor payments and capture vendor feedback in one place." },
];

const benefits = [
  "Real-time visibility of field teams across every project site",
  "Eliminate paper-based attendance, leave and expense workflows",
  "Faster project execution with milestone-based progress tracking",
  "Tighter procurement control — from requisition to vendor payment",
  "Unified vendor 360 view for better negotiation and accountability",
  "Configurable plans — start free, scale to enterprise procurement",
];

export default function QuickLocateSolution() {
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
                Quick Locate
              </span>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Locate your team, <span className="text-primary">track every site</span>, control every spend
              </h1>
              <p className="text-xl text-muted-foreground mb-8">
                Quick Locate brings attendance, activity, project execution, expenses and site procurement into one mobile-first platform — purpose-built for distributed teams working across multiple sites.
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
                <MapPin className="w-40 h-40 text-primary" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything your site teams need — <span className="text-primary">in one app</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              From attendance and activities to procurement and vendor management — Quick Locate covers the full field-operations lifecycle.
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
                Why <span className="text-primary">Quick Locate?</span>
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                One platform replaces 5+ tools — attendance trackers, leave apps, project sheets, expense forms and procurement spreadsheets.
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
                <Navigation className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">100%</div>
                <div className="text-sm text-muted-foreground">Live Field Visibility</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Timer className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">60%</div>
                <div className="text-sm text-muted-foreground">Faster Approvals</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Receipt className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">5+</div>
                <div className="text-sm text-muted-foreground">Tools Replaced</div>
              </Card>
              <Card className="bg-card/50 border-primary/20 p-6 text-center">
                <Briefcase className="w-10 h-10 text-primary mx-auto mb-3" />
                <div className="text-3xl font-bold text-primary mb-1">24/7</div>
                <div className="text-sm text-muted-foreground">Project Control</div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-3 sm:px-4 bg-gradient-to-r from-primary/20 to-primary/10">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Ready to bring your sites under one roof?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            See Quick Locate in action with your own users, sites and projects.
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