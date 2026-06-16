import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import {
  ArrowLeft,
  Sparkles,
  TrendingUp,
  Users,
  Package,
  MapPin,
  Truck,
  Trophy,
  Brain,
  WifiOff,
  MessageSquare,
  CreditCard,
  Target,
  Building2,
  Megaphone,
  Eye,
  ClipboardList,
  Boxes,
  Coins,
  CheckCircle2,
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
  ComposedChart,
  Line,
} from "recharts";

// Customer anonymised. Metrics shown as growth % only — no absolute order/revenue/visit numbers.
const headlineStats = [
  { label: "Orders Growth", value: "+79%", delta: "Month-on-month", sub: "Sustained over 4 months post go-live" },
  { label: "Revenue Growth", value: "+112%", delta: "Month-on-month", sub: "Driven by AOV lift + wider coverage" },
  { label: "Retailer Visits", value: "+75%", delta: "Month-on-month", sub: "Beat compliance + new outlet adds" },
  { label: "Active Reps", value: "16 / 17", delta: "94% daily adoption", sub: "All 17 reps trained in 4 weeks" },
];

// Indexed growth trend over 16 weeks post go-live (Month 1 W1 = 100). No absolute numbers shown.
const weeklyTrend = [
  { week: "M1-W1", orders: 100, revenue: 100 },
  { week: "M1-W2", orders: 118, revenue: 122 },
  { week: "M1-W3", orders: 142, revenue: 151 },
  { week: "M1-W4", orders: 155, revenue: 168 },
  { week: "M2-W1", orders: 168, revenue: 184 },
  { week: "M2-W2", orders: 179, revenue: 198 },
  { week: "M2-W3", orders: 188, revenue: 212 },
  { week: "M2-W4", orders: 195, revenue: 224 },
  { week: "M3-W1", orders: 205, revenue: 238 },
  { week: "M3-W2", orders: 218, revenue: 256 },
  { week: "M3-W3", orders: 232, revenue: 274 },
  { week: "M3-W4", orders: 245, revenue: 291 },
  { week: "M4-W1", orders: 258, revenue: 310 },
  { week: "M4-W2", orders: 272, revenue: 332 },
  { week: "M4-W3", orders: 285, revenue: 354 },
  { week: "M4-W4", orders: 298, revenue: 378 },
];

const moduleAdoption = [
  { module: "Visit", lift: "+308%" },
  { module: "Dashboard", lift: "+275%" },
  { module: "Orders", lift: "+395%" },
  { module: "My Retailer", lift: "+300%" },
  { module: "My Beat", lift: "+383%" },
  { module: "Attendance", lift: "+129%" },
  { module: "Analytics", lift: "+129%" },
];

const capabilities = [
  { icon: Users, title: "Sales Productivity", desc: "Daily app sessions grew sharply and 16 of 17 reps now hit ≥6 productive field hours/day — auto-tracked attendance, GPS check-ins and visit timestamps removed admin friction." },
  { icon: MapPin, title: "Field Tracking & GPS", desc: "Every visit geo-stamped to a retailer location. Live dashboards show beat compliance, idle time and route deviations — without nagging the team." },
  { icon: Building2, title: "Retailer Onboarding", desc: "New retailers added via WhatsApp/SMS based verification, on-the-spot KYC photos and auto-geocoding. Onboarding time dropped from days to minutes." },
  { icon: Package, title: "Order Execution", desc: "Catalog, schemes, taxes and stock validated in-app. Average order value lifted ~18% as reps placed larger, more confident orders." },
  { icon: Truck, title: "Van Sales", desc: "Van load-in, on-vehicle stock, instant invoice and cash settlement work fully offline. Reps now close on-the-spot sales instead of carrying paper indents back." },
  { icon: Target, title: "Event ROI & Counter Sales", desc: "Event setup, counter-sale capture, sample distribution and footfall logged per activation — finance can now see ₹ returned per ₹ spent on each event." },
  { icon: Megaphone, title: "Distributor Engagement", desc: "Distributor Portal shows live primary orders, schemes, claims and stock. Conversations moved from WhatsApp screenshots to a single shared system." },
  { icon: MessageSquare, title: "Retailer Feedback & Branding", desc: "Reps capture retailer feedback, branding requests (boards, racks, fridges) and resolve them via in-app workflows — closing the loop with photographic proof." },
  { icon: Users, title: "Joint Sales", desc: "Manager + ASM joint visits captured with co-tagging, coaching notes and outcomes — turning every market day into a measurable coaching opportunity." },
  { icon: Eye, title: "Competition Insight", desc: "As a young challenger brand, every counter where reps capture competitor pricing, visibility and schemes builds a live SWOT map of the market." },
  { icon: ClipboardList, title: "Distributor Onboarding Checklist", desc: "Structured checklist — agreement, GSTIN, beats, SKUs, opening stock, credit terms — ensures new distributors go live in under 7 days." },
  { icon: Boxes, title: "Primary Sales & Inventory", desc: "Primary indents from distributors, goods receipt, stock-on-hand, expiry/batch and shortage claims all tracked in one DMS — no more reconciliation by Excel." },
];

const aiPlays = [
  { icon: MapPin, title: "Territory Intelligence", desc: "AI scores every territory by potential vs. coverage — surfacing under-served pin-codes and recommending where to add beats next." },
  { icon: Building2, title: "Retailer Intelligence", desc: "Per-outlet RFM scoring flags churning retailers, identifies premium upsell targets and suggests the next-best SKU to push." },
  { icon: Package, title: "Product Recommendations", desc: "Smart Basket suggests 2–4 complementary SKUs at order time based on the retailer's history, segment and seasonality — driving the 18% AOV lift." },
  { icon: Coins, title: "Scheme & Campaign Design", desc: "AI simulates trade scheme payoff before launch and recommends slab/value/free-good structures that hit the target ROI without margin leakage." },
  { icon: Brain, title: "Visit Recommendations", desc: "Tomorrow's beat is auto-generated: must-visit retailers, overdue outlets, high-potential prospects and white-space — ranked by expected revenue." },
  { icon: Target, title: "AI Beat Planning", desc: "Auto-planned beats balance distance, frequency and potential. Reviewed by managers in a dry-run before publishing — no surprises in the field." },
];

const cultureWins = [
  { metric: "+308%", sub: "Visit module usage" },
  { metric: "+395%", sub: "Orders module usage" },
  { metric: "+45%", sub: "Attendance check-ins" },
  { metric: "0", sub: "Absent days logged" },
];

export const BharathBeveragesCaseStudy = () => {
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
            <span className="text-amber-400 text-sm font-medium">Customer Case Study</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            How a{" "}
            <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
              branded tea manufacturer
            </span>{" "}
            doubled revenue in four months with QuickApp.AI
          </h1>

          <p className="text-lg text-white/70 leading-relaxed">
            A challenger tea brand with <span className="text-white font-semibold">17 field reps</span> set out
            to professionalise its go-to-market. From discovery to go-live in just <span className="text-white font-semibold">4 weeks</span> —
            including setup, data migration and end-to-end training — QuickApp.AI stood up Field Sales SFA + DMS
            covering reps, distributors, vans, events and counter sales. Over the next{" "}
            <span className="text-white font-semibold">4 months</span>, the team delivered{" "}
            <span className="text-amber-300 font-semibold">+79% orders, +112% revenue and +75% visits</span> month-on-month
            — with adoption locking in across the entire field force.
          </p>
        </div>
      </section>

      {/* Headline KPIs */}
      <section className="py-8 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {headlineStats.map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-3xl font-bold text-white">{s.value}</div>
                <div className="text-amber-400 text-sm font-semibold mt-1">{s.delta}</div>
                <div className="text-white/60 text-xs mt-2">{s.label}</div>
                <div className="text-white/40 text-xs mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4-week rollout timeline */}
      <section className="py-10 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Discovery to Go-Live in 4 Weeks</h2>
          <p className="text-white/60 mb-8">A tight, structured rollout — no big-bang risk, no productivity hit.</p>
          <div className="grid md:grid-cols-4 gap-4">
            {[
              { w: "Week 1", t: "Discovery & Blueprint", d: "Process mapping for SFA, DMS, vans, events. Roles, beats, schemes and approval flows agreed." },
              { w: "Week 2", t: "Setup & Configuration", d: "Tenant provisioned. Products, schemes, taxes, distributors, beats and user hierarchy configured." },
              { w: "Week 3", t: "Data Migration", d: "Retailer master, opening stock, price book and outstanding ledgers migrated and reconciled." },
              { w: "Week 4", t: "Training & Go-Live", d: "Classroom + in-field training for all 17 reps, distributors and managers. Live on day 28." },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <div className="text-amber-300 text-xs font-semibold mb-2">{s.w}</div>
                <div className="text-white font-semibold mb-2">{s.t}</div>
                <p className="text-white/60 text-xs leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The brief */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-6">The Brief</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-red-300 mb-3">Where they started</h3>
              <ul className="space-y-2 text-white/70 text-sm">
                <li>• Field activity tracked on paper and WhatsApp</li>
                <li>• No visibility on which retailers were being visited</li>
                <li>• Distributors reconciling primary sales on Excel</li>
                <li>• Schemes and trade spends with no measurable ROI</li>
                <li>• Limited insight into competition in new territories</li>
              </ul>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6">
              <h3 className="text-xl font-semibold text-amber-300 mb-3">What we deployed</h3>
              <ul className="space-y-2 text-white/80 text-sm">
                <li>• QuickApp.AI Field Sales SFA for 17 reps</li>
                <li>• Distributor Portal (DMS) for primary orders & claims</li>
                <li>• Van Sales, Event ROI and Counter Sales modules</li>
                <li>• Retailer Portal + WhatsApp ordering</li>
                <li>• AI Sales Coach, Smart Basket and Beat Planner</li>
                <li>• Gamification: points, badges, leaderboards</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Weekly trend */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Orders & Revenue — 16-Week Lift</h2>
          <p className="text-white/60 mb-8">Indexed to 100 at go-live week. Bars = orders · Line = revenue. Compounding growth across all four months.</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="week" stroke="#ffffff80" />
                <YAxis yAxisId="left" stroke="#ffffff80" tick={false} axisLine={false} />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" tick={false} axisLine={false} />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} formatter={(v: number) => `Index ${v}`} />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar yAxisId="left" dataKey="orders" name="Orders (indexed)" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (indexed)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Module adoption */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Module Adoption</h2>
          <p className="text-white/60 mb-8">Usage growth across the QuickApp.AI stack from Month 1 to Month 4.</p>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white">
                  <th className="text-left p-4 font-semibold">Module</th>
                  <th className="text-right p-4 font-semibold text-amber-300">Usage Lift</th>
                </tr>
              </thead>
              <tbody>
                {moduleAdoption.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? "" : "bg-white/5"}>
                    <td className="p-4 text-white font-medium border-t border-white/10">{m.module}</td>
                    <td className="p-4 text-amber-300 text-right border-t border-white/10 font-semibold">{m.lift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Capabilities deployed */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-2">What's Running for the Team Today</h2>
          <p className="text-white/60 mb-8">A single platform — Field Sales + DMS + B2B + Retailer Portal — wired into one playbook.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {capabilities.map((c, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                  <c.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{c.title}</h3>
                <p className="text-white/60 text-sm">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI plays */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-2">AI Doing the Heavy Lifting</h2>
          <p className="text-white/60 mb-8">The reps don't navigate the system. The system guides them.</p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {aiPlays.map((a, i) => (
              <div key={i} className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-5">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center mb-4">
                  <a.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{a.title}</h3>
                <p className="text-white/70 text-sm">{a.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gamification + Credit + WhatsApp + Offline */}
      <section className="py-12 px-3 sm:px-4 bg-white/5">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-8">Culture, Cash and Coverage</h2>

          <div className="grid md:grid-cols-2 gap-6 mb-10">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <Trophy className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">Gamification — Built a Winning Culture</h3>
              </div>
              <p className="text-white/70 text-sm mb-5">
                Points for visits, orders, new retailers, on-time check-ins and target attainment. Weekly
                leaderboards and badges turned individual effort into a team sport. Zero absent days were
                logged across the four months post go-live.
              </p>
              <div className="grid grid-cols-2 gap-3">
                {cultureWins.map((c, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-amber-300">{c.metric}</div>
                    <div className="text-xs text-white/60 mt-1">{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">AI Credit Management — Cash Flow Unlocked</h3>
              </div>
              <p className="text-white/70 text-sm">
                Every retailer gets a live AI credit score based on payment history, ageing, ticket size and
                seasonality. Reps see a green/amber/red flag at order time. Overdue collections are auto-prioritised
                in tomorrow's beat and a WhatsApp reminder fires the night before. Collections moved from
                reactive chasing to a calm daily routine — and bad-debt risk dropped sharply.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <MessageSquare className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">WhatsApp Orders & Retailer Portal</h3>
              </div>
              <p className="text-white/70 text-sm">
                Retailers re-order from their phone — WhatsApp catalog or the Retailer Portal — without waiting
                for a rep visit. Orders flow into the same DMS pipeline; reps focus on prospecting, premiumisation
                and counter activation instead of pure order-taking.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <WifiOff className="w-6 h-6 text-amber-400" />
                <h3 className="text-xl font-semibold text-white">True Offline-First — Coverage in Deep Markets</h3>
              </div>
              <p className="text-white/70 text-sm">
                Visits, orders, payments, photos and GPS all work 100% offline. In Tier-3 and rural beats where
                competition still scribbles on duplicate books, Bharath's reps run a digital, audited, real-time
                process — and sync the moment they hit signal.
              </p>
            </div>
          </div>

          {/* Smart bundles & beat */}
          <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <Brain className="w-6 h-6 text-amber-400" />
              <h3 className="text-xl font-semibold text-white">Faster Orders, Better Beats</h3>
            </div>
            <p className="text-white/80 text-sm">
              AI-driven visit priority surfaces the right outlet next. Product bundles auto-suggest the
              cross-sell. SKU activation expanded 10x and average order value lifted ~18% across the four-month
              window — orders are now <span className="text-amber-300 font-semibold">faster, fuller and freshly assorted</span>.
            </p>
          </div>
        </div>
      </section>

      {/* What's next */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-6">Where We Go Next</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              { icon: Target, title: "Predictive Targeting", desc: "Auto-allocate FY targets down to user × territory × SKU using last 90-day velocity." },
              { icon: Eye, title: "Competition SWOT 2.0", desc: "AI-vision capture of competitor shelves to build a live share-of-shelf map." },
              { icon: Coins, title: "Scheme A/B Engine", desc: "Run controlled trade scheme experiments and let AI pick the winner per cluster." },
              { icon: TrendingUp, title: "Premiumisation Engine", desc: "Identify retailers ready to upgrade from Gold to Horeca and auto-trigger conversion plays." },
              { icon: ClipboardList, title: "Distributor Scorecards", desc: "Live distributor scorecards on fill-rate, claim cycle time and beat coverage." },
              { icon: Truck, title: "Route Optimisation", desc: "OSRM-based route snapping to cut field km by ~15% per beat day." },
            ].map((n, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-5 flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0">
                  <n.icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h4 className="text-white font-semibold mb-1 text-sm">{n.title}</h4>
                  <p className="text-white/60 text-xs">{n.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pull quote */}
      <section className="py-12 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-amber-300 flex-shrink-0 mt-1" />
              <div>
                <p className="text-lg text-white/90 italic leading-relaxed">
                  "In four months QuickApp.AI gave us what most challenger brands take two years to build — a
                  single source of truth across reps, distributors, vans and retailers, with AI quietly guiding
                  every decision. The market finally feels measurable."
                </p>
                <p className="text-amber-300 mt-4 font-semibold">— Leadership, Branded Tea Manufacturer</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want results like this?</h2>
          <p className="text-white/70 mb-6">Go live in 2–4 weeks. One price, unlimited users. AI guidance from day one.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Button
              size="lg"
              onClick={() => navigate("/request-demo")}
              className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white"
            >
              Book a Demo
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
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default BharathBeveragesCaseStudy;