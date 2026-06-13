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
  LineChart,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Months are obfuscated to "Month 1" and "Month 2"
const headlineStats = [
  { label: "Total Orders", value: "1,961", delta: "↑ 79%", sub: "703 → 1,258 orders" },
  { label: "Revenue", value: "₹36.7L", delta: "↑ 112%", sub: "₹11.8L → ₹24.9L" },
  { label: "Retailer Visits", value: "2,230", delta: "↑ 75%", sub: "1,272 → 2,230 visits" },
  { label: "Active Reps", value: "16", delta: "↑ from 12", sub: "Adoption locked in" },
];

const weeklyTrend = [
  { week: "W1", orders: 100, revenue: 200 },
  { week: "W2", orders: 140, revenue: 200 },
  { week: "W3", orders: 200, revenue: 300 },
  { week: "W4", orders: 160, revenue: 300 },
  { week: "W5", orders: 140, revenue: 300 },
  { week: "W6", orders: 250, revenue: 500 },
  { week: "W7", orders: 280, revenue: 700 },
  { week: "W8", orders: 350, revenue: 800 },
  { week: "W9", orders: 330, revenue: 500 },
];

const sessionsTrend = [
  { week: "W1", sessions: 100, users: 4 },
  { week: "W2", sessions: 0, users: 4 },
  { week: "W3", sessions: 1000, users: 12 },
  { week: "W4", sessions: 1200, users: 14 },
  { week: "W5", sessions: 1300, users: 15 },
  { week: "W6", sessions: 2400, users: 16 },
  { week: "W7", sessions: 5000, users: 18 },
  { week: "W8", sessions: 4800, users: 18 },
  { week: "W9", sessions: 2800, users: 14 },
];

const visitsBreakdown = [
  { period: "Month 1", New: 500, Repeat: 2000 },
  { period: "Month 2", New: 800, Repeat: 2500 },
];

const fieldHours = [
  { bucket: "<4 hrs", "Month 1": 40, "Month 2": 20 },
  { bucket: "4-6 hrs", "Month 1": 80, "Month 2": 60 },
  { bucket: "6-8 hrs", "Month 1": 75, "Month 2": 40 },
  { bucket: ">8 hrs", "Month 1": 30, "Month 2": 10 },
];

const moduleAdoption = [
  { module: "Visit", before: 1257, after: 5136, lift: "+308%" },
  { module: "Dashboard", before: 849, after: 3182, lift: "+275%" },
  { module: "Orders", before: 571, after: 2826, lift: "+395%" },
  { module: "My Retailer", before: 344, after: 1376, lift: "+300%" },
  { module: "My Beat", before: 137, after: 662, lift: "+383%" },
  { module: "Attendance", before: 203, after: 464, lift: "+129%" },
  { module: "Analytics", before: 130, after: 298, lift: "+129%" },
];

const topProducts = [
  { sku: "Dakshin Horeca", "Month 1": 50, "Month 2": 280 },
  { sku: "Dakshin 250G", "Month 1": 70, "Month 2": 180 },
  { sku: "Elachi 250G", "Month 1": 50, "Month 2": 130 },
  { sku: "Gold 250G", "Month 1": 120, "Month 2": 160 },
  { sku: "Gold 500G", "Month 1": 150, "Month 2": 160 },
];

const skuMix = [
  { name: "Existing SKUs", value: 28, fill: "#64748b" },
  { name: "New SKUs Activated", value: 20, fill: "#f59e0b" },
];

const capabilities = [
  { icon: Users, title: "Sales Productivity", desc: "Daily app sessions grew 28x and 16 of 17 reps now hit ≥6 productive field hours/day — auto-tracked attendance, GPS check-ins and visit timestamps removed admin friction." },
  { icon: MapPin, title: "Field Tracking & GPS", desc: "Every visit geo-stamped to a retailer location. Live dashboards show beat compliance, idle time and route deviations — without nagging the team." },
  { icon: Building2, title: "Retailer Onboarding", desc: "1,961 new retailers added with WhatsApp/SMS based verification, on-the-spot KYC photos and auto-geocoding. Onboarding time dropped from days to minutes." },
  { icon: Package, title: "Order Execution", desc: "Catalog, schemes, taxes and stock validated in-app. Average order value lifted from ₹1,673 to ₹1,980 (+18%) as reps placed larger, more confident orders." },
  { icon: Truck, title: "Van Sales", desc: "Van load-in, on-vehicle stock, instant invoice and cash settlement work fully offline. Reps now close on-the-spot sales instead of carrying paper indents back." },
  { icon: Target, title: "Event ROI & Counter Sales", desc: "Event setup, counter-sale capture, sample distribution and footfall logged per activation — finance can now see ₹ returned per ₹ spent on each event." },
  { icon: Megaphone, title: "Distributor Engagement", desc: "Distributor Portal shows live primary orders, schemes, claims and stock. Conversations moved from WhatsApp screenshots to a single shared system." },
  { icon: MessageSquare, title: "Retailer Feedback & Branding", desc: "Reps capture retailer feedback, branding requests (boards, racks, fridges) and resolve them via in-app workflows — closing the loop with photographic proof." },
  { icon: Users, title: "Joint Sales", desc: "Manager + ASM joint visits captured with co-tagging, coaching notes and outcomes — turning every market day into a measurable coaching opportunity." },
  { icon: Eye, title: "Competition Insight", desc: "As a 3-year-old challenger brand, every counter where Bharath captures competitor pricing, visibility and schemes builds a live SWOT map of the market." },
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
  { metric: "232 → 337", sub: "Attendance check-ins" },
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
      <section className="pt-12 pb-8 px-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/insights")}
            className="text-white/70 hover:text-white mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Insights
          </Button>

          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-4">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-sm font-medium">Customer Case Study</span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
            How{" "}
            <a href="https://bharathbeverages.com/" target="_blank" rel="noreferrer" className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent hover:underline">
              Bharath Beverages
            </a>{" "}
            doubled revenue in two months with QuickApp.AI
          </h1>

          <p className="text-lg text-white/70 leading-relaxed">
            A 3-year-old challenger tea brand from South India set out to professionalise its go-to-market.
            QuickApp.AI stood up Field Sales SFA + DMS in weeks — covering 17 field reps, distributors, vans,
            events and counter sales. The result: <span className="text-amber-300 font-semibold">+79% orders, +112% revenue, +75% visits</span> in
            the very first two-month window.
          </p>
        </div>
      </section>

      {/* Headline KPIs */}
      <section className="py-8 px-4">
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

      {/* The brief */}
      <section className="py-12 px-4">
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
      <section className="py-12 px-4 bg-white/5">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Orders & Revenue — Weekly Lift</h2>
          <p className="text-white/60 mb-8">Bars = orders · Line = revenue (₹ thousands). Compounding adoption from W3 onwards.</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[380px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis dataKey="week" stroke="#ffffff80" />
                <YAxis yAxisId="left" stroke="#ffffff80" />
                <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill="#64748b" radius={[6, 6, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" name="Revenue (₹K)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* App engagement + visits */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-8">Adoption That Stuck</h2>
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Sessions & Active Users</h3>
              <p className="text-xs text-white/50 mb-4">Sessions scaled from a handful to ~5,000/week as the team locked in the daily habit.</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={sessionsTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="week" stroke="#ffffff80" />
                    <YAxis yAxisId="left" stroke="#ffffff80" />
                    <YAxis yAxisId="right" orientation="right" stroke="#f59e0b" />
                    <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                    <Bar yAxisId="left" dataKey="sessions" name="Sessions" fill="#64748b" radius={[6, 6, 0, 0]} />
                    <Line yAxisId="right" type="monotone" dataKey="users" name="Active Users" stroke="#f59e0b" strokeWidth={3} dot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">New vs Repeat Visits</h3>
              <p className="text-xs text-white/50 mb-4">Both prospecting and relationship visits grew — coverage AND depth.</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={visitsBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="period" stroke="#ffffff80" />
                    <YAxis stroke="#ffffff80" />
                    <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                    <Bar dataKey="New" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Repeat" fill="#64748b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Daily Field Hours Distribution</h3>
              <p className="text-xs text-white/50 mb-4">Short days collapsed; reps now consistently put in 4–8 productive hours.</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fieldHours}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                    <XAxis dataKey="bucket" stroke="#ffffff80" />
                    <YAxis stroke="#ffffff80" />
                    <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                    <Bar dataKey="Month 1" fill="#64748b" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="Month 2" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-2">SKU Activation</h3>
              <p className="text-xs text-white/50 mb-4">20 new SKUs entered orders in Month 2 — the portfolio push is working.</p>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={skuMix} dataKey="value" nameKey="name" outerRadius={100} label>
                      {skuMix.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                    <Legend wrapperStyle={{ color: "#fff" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Top products */}
      <section className="py-12 px-4 bg-white/5">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Top SKUs — Revenue Lift</h2>
          <p className="text-white/60 mb-8">Revenue in ₹ thousands. Dakshin Horeca grew 5.6x as the team learnt where to push it.</p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff15" />
                <XAxis type="number" stroke="#ffffff80" />
                <YAxis dataKey="sku" type="category" stroke="#ffffff80" width={120} />
                <Tooltip contentStyle={{ background: "#1A1F2C", border: "1px solid #ffffff20", color: "#fff" }} />
                <Legend wrapperStyle={{ color: "#fff" }} />
                <Bar dataKey="Month 1" fill="#64748b" radius={[0, 6, 6, 0]} />
                <Bar dataKey="Month 2" fill="#f59e0b" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Module adoption */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-3xl font-bold text-white mb-2">Module Adoption</h2>
          <p className="text-white/60 mb-8">Usage growth across the QuickApp.AI stack between the two months.</p>
          <div className="rounded-2xl border border-white/10 overflow-hidden bg-white/5">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-white">
                  <th className="text-left p-4 font-semibold">Module</th>
                  <th className="text-right p-4 font-semibold">Month 1</th>
                  <th className="text-right p-4 font-semibold">Month 2</th>
                  <th className="text-right p-4 font-semibold text-amber-300">Lift</th>
                </tr>
              </thead>
              <tbody>
                {moduleAdoption.map((m, i) => (
                  <tr key={i} className={i % 2 === 0 ? "" : "bg-white/5"}>
                    <td className="p-4 text-white font-medium border-t border-white/10">{m.module}</td>
                    <td className="p-4 text-white/70 text-right border-t border-white/10">{m.before.toLocaleString()}</td>
                    <td className="p-4 text-white text-right border-t border-white/10">{m.after.toLocaleString()}</td>
                    <td className="p-4 text-amber-300 text-right border-t border-white/10 font-semibold">{m.lift}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Capabilities deployed */}
      <section className="py-12 px-4 bg-white/5">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-2">What's Running for Bharath Today</h2>
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
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-white mb-2">AI Doing the Heavy Lifting</h2>
          <p className="text-white/60 mb-8">Bharath's reps don't navigate the system. The system guides them.</p>
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
      <section className="py-12 px-4 bg-white/5">
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
                logged across both months.
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
              cross-sell. New SKU activation grew from 2 to 20 in Month 2 and average order value lifted from
              ₹1,673 to ₹1,980 — orders are now <span className="text-amber-300 font-semibold">faster, fuller and freshly assorted</span>.
            </p>
          </div>
        </div>
      </section>

      {/* What's next */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <h2 className="text-3xl font-bold text-white mb-6">Where We Go Next with Bharath</h2>
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
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-2xl p-8">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-6 h-6 text-amber-300 flex-shrink-0 mt-1" />
              <div>
                <p className="text-lg text-white/90 italic leading-relaxed">
                  "In two months QuickApp.AI gave us what most challenger brands take two years to build — a
                  single source of truth across reps, distributors, vans and retailers, with AI quietly guiding
                  every decision. The market finally feels measurable."
                </p>
                <p className="text-amber-300 mt-4 font-semibold">— Leadership, Bharath Beverages</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want results like Bharath Beverages?</h2>
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