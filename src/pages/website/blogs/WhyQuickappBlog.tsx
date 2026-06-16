import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import {
  ArrowLeft,
  Sparkles,
  Check,
  X,
  Brain,
  WifiOff,
  Users,
  DollarSign,
  Building2,
  Zap,
  TrendingUp,
  Trophy,
  ShieldCheck,
  Rocket,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

const pricingData = [
  { name: "QuickApp.AI", cost: 1, fill: "#f59e0b" },
  { name: "Bizom", cost: 6, fill: "#64748b" },
  { name: "FieldAssist", cost: 7, fill: "#64748b" },
  { name: "Botree SFA", cost: 5, fill: "#64748b" },
  { name: "ZNI CRM", cost: 4, fill: "#64748b" },
];

const capabilityRadar = [
  { capability: "AI Guidance", QuickApp: 9.5, Traditional: 4 },
  { capability: "Offline-First", QuickApp: 10, Traditional: 5 },
  { capability: "DMS + SFA + CRM", QuickApp: 9, Traditional: 5 },
  { capability: "Gamification", QuickApp: 9, Traditional: 4 },
  { capability: "Time-to-Value", QuickApp: 9, Traditional: 5 },
  { capability: "Pricing Fairness", QuickApp: 10, Traditional: 3 },
];

const impactStats = [
  { metric: "Productive Visits", before: 55, after: 82 },
  { metric: "Order Strike Rate", before: 38, after: 64 },
  { metric: "Data Accuracy", before: 60, after: 95 },
  { metric: "Time on Admin", before: 35, after: 12 },
];

const competitorMatrix = [
  {
    feature: "Pricing Model",
    quickapp: "One price, unlimited users",
    bizom: "Per user / month",
    fieldassist: "Per user / month",
    botree: "Per user / module",
    zni: "Per user / module",
  },
  {
    feature: "AI-First Architecture",
    quickapp: "Native (Coach, Recos, Insights)",
    bizom: "Add-on analytics",
    fieldassist: "Dashboards only",
    botree: "Limited",
    zni: "Limited",
  },
  {
    feature: "True Offline Mode",
    quickapp: "100% offline (orders, photos, GPS)",
    bizom: "Partial",
    fieldassist: "Partial",
    botree: "Partial",
    zni: "Basic",
  },
  {
    feature: "Field Sales + DMS + B2B CRM",
    quickapp: "Unified single platform",
    bizom: "SFA + DMS (separate modules)",
    fieldassist: "SFA-focused",
    botree: "SFA + DMS (separate)",
    zni: "SFA-focused",
  },
  {
    feature: "Gamification",
    quickapp: "Native points, badges, leaderboards",
    bizom: "Basic",
    fieldassist: "Basic",
    botree: "Not native",
    zni: "Not native",
  },
  {
    feature: "Retailer Portal",
    quickapp: "Unlimited retailer logins (Enterprise)",
    bizom: "Add-on",
    fieldassist: "Add-on",
    botree: "Add-on",
    zni: "Not available",
  },
  {
    feature: "Time to Go-Live",
    quickapp: "2–4 weeks",
    bizom: "8–12 weeks",
    fieldassist: "8–12 weeks",
    botree: "6–10 weeks",
    zni: "4–8 weeks",
  },
  {
    feature: "BI Connector (Power BI)",
    quickapp: "Available (add-on ₹)",
    bizom: "Limited",
    fieldassist: "Limited",
    botree: "Not standard",
    zni: "Not standard",
  },
];

const usps = [
  {
    icon: DollarSign,
    title: "One Price, Unlimited Users",
    desc: "Everyone in your firm gets digital + AI access. No per-seat tax on growth.",
  },
  {
    icon: Brain,
    title: "AI That Guides, Not Just Tracks",
    desc: "AI Sales Coach, smart basket, credit scoring and predictive insights at every step.",
  },
  {
    icon: WifiOff,
    title: "True Offline-First",
    desc: "Orders, visits, photos and GPS work 100% offline. Sync when connected.",
  },
  {
    icon: Building2,
    title: "Field Sales + DMS + B2B CRM",
    desc: "Three platforms unified. Manage the entire sell-in to sell-out journey.",
  },
  {
    icon: Trophy,
    title: "Native Gamification",
    desc: "Points, badges, leaderboards and competencies built-in — not bolted on.",
  },
  {
    icon: ShieldCheck,
    title: "Enterprise-Grade Security",
    desc: "RLS, role-based permissions, audit trails and on-demand data exports.",
  },
];

export const WhyQuickappBlog = () => {
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] via-[#1A1F2C] to-[#0F1218]">
      <WebsiteHeader />

      {/* Hero */}
      <section className="pt-12 pb-8 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/insights")}
            className="text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Insights
          </Button>

          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 sm:px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Why QuickApp.AI</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            Beyond Traditional SFA & DMS:{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              Why QuickApp.AI Wins
            </span>
          </h1>

          <p className="text-lg text-white/70 leading-relaxed">
            Most field sales platforms still treat the field team as a data-entry workforce. We rebuilt the
            category around a different idea — AI that <em>guides</em> sellers, a price that doesn't punish
            growth, and a stack that unifies Field Sales, Distributor Management and B2B CRM. Here's how we
            stack up against Bizom, FieldAssist, Botree SFA and ZNI CRM — and why customers see measurable
            impact in weeks, not quarters.
          </p>
        </div>
      </section>

      {/* USPs */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-8">Our Unique Value</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {usps.map((u, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-6 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                  <u.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{u.title}</h3>
                <p className="text-white/60 text-sm">{u.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing chart */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Cost of Ownership (illustrative)</h2>
          <p className="text-white/60 mb-8">
            Relative 3-year cost for a 100-user field team. Traditional vendors charge per-seat — QuickApp.AI
            doesn't.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pricingData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="name" stroke="#ffffff80" />
                <YAxis stroke="#ffffff80" label={{ value: "Relative cost (x)", angle: -90, position: "insideLeft", fill: "#ffffff80" }} />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                <Bar dataKey="cost" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-white/40 mt-3">
            Indicative based on published per-user pricing bands and analyst reports. Your mileage will vary.
          </p>
        </div>
      </section>

      {/* Capability radar */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Capability Footprint</h2>
          <p className="text-white/60 mb-8">
            QuickApp.AI vs. a typical traditional SFA/DMS stack across the dimensions that drive adoption and ROI.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[420px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={capabilityRadar}>
                <PolarGrid stroke="#ffffff25" />
                <PolarAngleAxis dataKey="capability" tick={{ fill: "#ffffffb0", fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 10]} tick={{ fill: "#ffffff60" }} />
                <Radar name="QuickApp.AI" dataKey="QuickApp" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.5} />
                <Radar name="Traditional SFA/DMS" dataKey="Traditional" stroke="#64748b" fill="#64748b" fillOpacity={0.3} />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Competitor matrix */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-2">How We Compare</h2>
          <p className="text-white/60 mb-8">
            QuickApp.AI vs. Bizom, FieldAssist, Botree SFA and ZNI CRM.
          </p>
          <div className="rounded-2xl border border-white/10 overflow-x-auto bg-white/5">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white">
                  <th className="text-left p-4 font-semibold">Capability</th>
                  <th className="text-left p-4 font-semibold text-amber-300">QuickApp.AI</th>
                  <th className="text-left p-4 font-semibold">Bizom</th>
                  <th className="text-left p-4 font-semibold">FieldAssist</th>
                  <th className="text-left p-4 font-semibold">Botree SFA</th>
                  <th className="text-left p-4 font-semibold">ZNI CRM</th>
                </tr>
              </thead>
              <tbody>
                {competitorMatrix.map((row, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? "bg-white/0" : "bg-white/5"}>
                    <td className="p-4 text-white font-medium border-t border-white/10">{row.feature}</td>
                    <td className="p-4 text-amber-300 border-t border-white/10">
                      <div className="flex items-start gap-2">
                        <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{row.quickapp}</span>
                      </div>
                    </td>
                    <td className="p-4 text-white/70 border-t border-white/10">{row.bizom}</td>
                    <td className="p-4 text-white/70 border-t border-white/10">{row.fieldassist}</td>
                    <td className="p-4 text-white/70 border-t border-white/10">{row.botree}</td>
                    <td className="p-4 text-white/70 border-t border-white/10">{row.zni}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-white/40 mt-3">
            Based on publicly available product documentation as of 2026. Vendor names belong to their respective owners.
          </p>
        </div>
      </section>

      {/* Traditional SFA vs QuickApp */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-8">Traditional SFA/DMS vs. QuickApp.AI</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-4 flex items-center gap-2">
                <X className="w-5 h-5" /> Traditional SFA & DMS
              </h3>
              <ul className="space-y-3 text-white/70 text-sm">
                <li>• Per-user pricing that punishes scaling teams</li>
                <li>• Tracks activity but doesn't guide the seller</li>
                <li>• Partial offline — orders fail in low-network territories</li>
                <li>• SFA, DMS and B2B are separate, integrated with effort</li>
                <li>• Long 8–12 week implementations, change management heavy</li>
                <li>• Reports are retrospective, not prescriptive</li>
              </ul>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-amber-300 mb-4 flex items-center gap-2">
                <Check className="w-5 h-5" /> QuickApp.AI
              </h3>
              <ul className="space-y-3 text-white/80 text-sm">
                <li>• One price, unlimited users — your CFO will smile</li>
                <li>• AI Sales Coach nudges next-best action in real time</li>
                <li>• True offline-first — orders never get lost</li>
                <li>• Unified Field Sales + DMS + B2B CRM out of the box</li>
                <li>• Go-live in 2–4 weeks with guided onboarding</li>
                <li>• Predictive insights: who to visit, what to sell, when</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Impact chart */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Impact We Create</h2>
          <p className="text-white/60 mb-8">
            Median lift seen by QuickApp.AI customers within the first 90 days of go-live.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={impactStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="metric" stroke="#ffffff80" />
                <YAxis stroke="#ffffff80" unit="%" />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar dataKey="before" name="Before QuickApp" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="after" name="After QuickApp" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4 mt-8">
            {[
              { icon: TrendingUp, label: "+27%", sub: "Productive visits" },
              { icon: Zap, label: "+68%", sub: "Order strike rate" },
              { icon: Users, label: "+58%", sub: "Data accuracy" },
              { icon: Rocket, label: "−66%", sub: "Time on admin" },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <s.icon className="w-6 h-6 text-amber-400 mx-auto mb-2" />
                <div className="text-2xl font-bold text-white">{s.label}</div>
                <div className="text-xs text-white/60 mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8 text-center">
            <h2 className="text-3xl font-bold text-white mb-4">Ready to leave legacy SFA behind?</h2>
            <p className="text-white/80 mb-6">
              See how QuickApp.AI replaces three tools with one — and pays for itself in the first quarter.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="lg"
                onClick={() => navigate("/pricing")}
                className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
              >
                See Pricing
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => navigate("/roi-calculator")}
                className="border-white/20 text-white hover:bg-white/10"
              >
                Calculate Your ROI
              </Button>
            </div>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default WhyQuickappBlog;