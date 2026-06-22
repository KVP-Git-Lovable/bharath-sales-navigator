import { useState, useEffect } from "react";
import { Check, Sparkles, Target, Brain, BarChart3, Users, Trophy, Truck, Building2, Shield, Settings, ArrowRight, ChevronDown, ChevronRight, X, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type Feature = {
  name: string;
  description: string;
  subFeatures?: { name: string; description: string }[];
};

const featureCategories: Array<{
  id: string;
  title: string;
  shortTitle: string;
  icon: any;
  color: string;
  tagline: string;
  features: Feature[];
}> = [
  {
    id: "sales",
    title: "Sales Execution",
    shortTitle: "Sales",
    icon: Target,
    color: "from-amber-500 to-orange-500",
    tagline: "Execute flawlessly in the field",
    features: [
      { name: "Beat Planning & Management", description: "Create, assign, and optimize sales beats with territory mapping" },
      { name: "Visit Management", description: "Plan, execute, and track retailer visits with check-in/check-out" },
      { name: "Order Entry", description: "Quick order capture with product catalog, pricing, and schemes" },
      { name: "Attendance Management", description: "Face-verified check-in/check-out with GPS location" },
      { name: "GPS Tracking", description: "Real-time location tracking and journey mapping" },
      { name: "Route Optimization", description: "AI-suggested optimal visit routes to save time" },
      { name: "No-Order Capture", description: "Record reasons for unproductive visits" },
      { name: "Visit Calendar", description: "Weekly and monthly visit planning view" },
      { name: "Joint Sales Visits", description: "Manager accompaniment tracking and feedback" },
      { name: "External Database", description: "Load purchased retailer databases by territory to expand field-sales market coverage and discover untapped outlets" },
    ]
  },
  {
    id: "retailer",
    title: "Retailer Management",
    shortTitle: "Retailers",
    icon: Users,
    color: "from-green-500 to-emerald-500",
    tagline: "Build lasting relationships",
    features: [
      { name: "Retailer Profiles", description: "Complete retailer information with photos and location" },
      { name: "Loyalty Programs", description: "Points-based rewards and redemption system" },
      { name: "Scheme Management", description: "Create and apply promotional schemes" },
      { name: "Credit Management", description: "Credit limits, outstanding tracking, and alerts" },
      { name: "Payment Collection", description: "Record payments with proof upload" },
      { name: "Retailer Feedback", description: "Capture and track retailer feedback" },
      { name: "Baseline Photos", description: "Store reference photos for each retailer" },
      { name: "Order History", description: "Complete order history and trends per retailer" },
      { name: "Bulk Import", description: "Import retailers from Excel files" },
      { name: "Branding Requests", description: "Request and track branding materials at retailer outlets" },
      {
        name: "Retailer Portal",
        description: "Self-service WhatsApp ordering plus a dedicated retailer app for orders, deliveries, invoices and schemes",
        subFeatures: [
          { name: "WhatsApp Self-Service Orders", description: "Retailers place orders directly via WhatsApp with conversational, catalog-driven flows" },
          { name: "Secondary Order Placement", description: "In-app ordering with full product catalog, live pricing and applicable schemes" },
          { name: "Order & Delivery Tracking", description: "Real-time order status and delivery tracking right from the retailer's phone" },
          { name: "Invoices & Order History", description: "Access all invoices and complete past purchase history any time" },
          { name: "Outstanding & Ledger View", description: "Live view of outstanding balances, due dates and payment history" },
          { name: "Schemes & Offers", description: "Enable schemes directly to retailers and surface new and upcoming offers automatically" },
          { name: "Feedback & Issues", description: "Raise feedback, complaints and product issues with built-in ticketing" },
          { name: "In-App Promotions & Ads", description: "Promote new products and run targeted in-app campaigns to retailers" },
        ],
      },
    ]
  },
  {
    id: "distributor",
    title: "Distributor Portal",
    shortTitle: "Distributors",
    icon: Building2,
    color: "from-indigo-500 to-purple-500",
    tagline: "Empower your distribution network",
    features: [
      { name: "Primary Orders", description: "Place and track orders to company" },
      { name: "Inventory Management", description: "Track distributor stock levels" },
      { name: "Claims Management", description: "Submit and track claims" },
      { name: "Goods Receipt", description: "Receive and verify shipments" },
      { name: "Secondary Sales", description: "Track sales to retailers" },
      { name: "Business Planning", description: "Annual business plan and targets" },
      { name: "Contact Management", description: "Manage distributor team contacts" },
      { name: "Support Requests", description: "Raise and track support tickets" },
      { name: "Idea Submission", description: "Submit product and market ideas" },
      {
        name: "Van Sales",
        description: "Mobile commerce from the van — full inventory, sales, invoicing and reconciliation workflows",
        subFeatures: [
          { name: "Morning Inventory", description: "Load van stock at start of day" },
          { name: "Stock Management", description: "Track van inventory in real-time" },
          { name: "Route Sales", description: "Execute sales directly from van" },
          { name: "Closing Stock", description: "End-of-day stock reconciliation" },
          { name: "Return Stock", description: "Process and track returned items" },
          { name: "Invoice Generation", description: "Generate invoices on-the-spot" },
          { name: "Cash Collection", description: "Track cash and payment collection" },
          { name: "Stock Transfer", description: "Transfer stock between vans" },
          { name: "Route Analysis", description: "Analyze van route performance" },
        ],
      },
    ]
  },
  {
    id: "ai",
    title: "AI Intelligence",
    shortTitle: "AI",
    icon: Brain,
    color: "from-purple-500 to-pink-500",
    tagline: "Smart insights that drive results",
    features: [
      { name: "Sales Coach AI", description: "AI-powered sales recommendations and coaching tips" },
      { name: "Stock Image Analysis", description: "AI scans shelf images to detect stock levels" },
      { name: "Credit Score AI", description: "Automatic retailer credit scoring based on payment history" },
      { name: "Smart Recommendations", description: "AI-suggested products based on retailer history" },
      { name: "Competition Insight AI", description: "Analyze competitor products from photos" },
      { name: "Board Scanning", description: "OCR to capture retailer information from signboards" },
      { name: "Voice Notes", description: "Voice-to-text for quick note capture" },
      { name: "Chat Assistant", description: "AI chatbot for instant answers and support" },
      { name: "Predictive Analytics", description: "Forecast sales trends and demand patterns" },
    ]
  },
  {
    id: "analytics",
    title: "Analytics & Insights",
    shortTitle: "Analytics",
    icon: BarChart3,
    color: "from-blue-500 to-cyan-500",
    tagline: "Data-driven decisions",
    features: [
      { name: "Real-time Dashboard", description: "Live sales, visits, and performance metrics" },
      { name: "Performance Reports", description: "Detailed reports on team and individual performance" },
      { name: "Beat Analytics", description: "Analysis of beat productivity and coverage" },
      { name: "Retailer Analytics", description: "Deep dive into retailer performance and trends" },
      { name: "Territory Dashboard", description: "Territory-wise sales and coverage analysis" },
      { name: "Target vs Achievement", description: "Track progress against sales targets" },
      { name: "Trend Analysis", description: "Historical trends and growth patterns" },
      { name: "Export Reports", description: "Download reports in Excel/PDF formats" },
      { name: "Custom KPIs", description: "Configure and track custom performance metrics" },
    ]
  },
  {
    id: "gamification",
    title: "Gamification",
    shortTitle: "Gamification",
    icon: Trophy,
    color: "from-yellow-500 to-amber-500",
    tagline: "Motivate and engage teams",
    features: [
      { name: "Leaderboard", description: "Real-time rankings with daily, weekly, monthly views" },
      { name: "Badges & Achievements", description: "Earn badges for hitting milestones" },
      { name: "Points System", description: "Earn points for productive activities" },
      { name: "Team Competition", description: "Territory and team-based competitions" },
      { name: "Streak Tracking", description: "Track consecutive productive days" },
      { name: "Performance Calendar", description: "Visual calendar showing daily performance" },
      { name: "Rewards Management", description: "Configure and distribute rewards" },
      { name: "Goal Setting", description: "Personal and team goal tracking" },
      { name: "Recognition Alerts", description: "Real-time notifications for achievements" },
    ]
  },
  {
    id: "enterprise",
    title: "Enterprise Features",
    shortTitle: "Enterprise",
    icon: Shield,
    color: "from-slate-500 to-gray-600",
    tagline: "Built for scale",
    features: [
      { name: "Multi-Language Support", description: "Hindi, Tamil, Telugu, Kannada, Gujarati, English" },
      { name: "Offline-First", description: "Full functionality without internet" },
      { name: "Role-Based Access", description: "Granular permissions and security" },
      { name: "User Management", description: "Create and manage user accounts" },
      { name: "Territory Management", description: "Hierarchical territory structure" },
      { name: "Holiday Management", description: "Configure holidays and leave" },
      { name: "Approval Workflows", description: "Multi-level approval processes" },
      { name: "Audit Trail", description: "Track all system activities" },
      { name: "Data Export", description: "Export data for external analysis" },
      { name: "WhatsApp Integration", description: "Send invoices and notifications via WhatsApp" },
      { name: "SMS Notifications", description: "Configurable SMS alerts across the platform" },
    ]
  },
  {
    id: "integration",
    title: "Connectors",
    shortTitle: "Connectors",
    icon: Settings,
    color: "from-rose-500 to-pink-500",
    tagline: "Connect QuickApp to your entire stack",
    features: [
      { name: "Prebuilt Connectors", description: "30+ ready-to-use connectors across CRM, e-commerce, accounting, messaging, AI and data warehouses — explore the full catalog on the Connectors page" },
      { name: "API Access", description: "REST APIs to integrate QuickApp with any external system" },
    ]
  },
  {
    id: "technology",
    title: "Technology",
    shortTitle: "Technology",
    icon: Brain,
    color: "from-cyan-500 to-blue-500",
    tagline: "AI-first architecture that powers every workflow",
    features: [
      { name: "Vision Intelligence", description: "AI-powered image recognition for shop boards, shelves, competition photos, and branding measurements" },
      { name: "AI Sales Coach", description: "Real-time product recommendations, visit insights, and personalized scheme suggestions" },
      { name: "Intelligent Chat Assistant", description: "Query sales data in plain language and get contextual, role-aware answers" },
      { name: "Credit Scoring Engine", description: "AI-driven credit risk assessment based on payment history, order frequency, and tenure" },
      { name: "Competition Intelligence", description: "Photo-based competitor detection, pricing extraction, and market positioning insights" },
      { name: "Face Verification", description: "Selfie-based attendance verification that prevents proxy marking" },
      { name: "Offline-First Architecture", description: "Full functionality without internet with intelligent sync and conflict resolution" },
      { name: "GPS Journey Intelligence", description: "Real-time location tracking, geo-tagged check-ins, and journey analytics" },
      { name: "Multi-Language Intelligence", description: "Support for English, Hindi, Telugu, Tamil, Kannada, and Gujarati with localized AI responses" },
      { name: "AI Processing Layer", description: "Google Gemini + edge functions process photos, voice, text, and GPS into actionable guidance" },
    ]
  },
  {
    id: "data-security",
    title: "Data Security",
    shortTitle: "Security",
    icon: ShieldCheck,
    color: "from-emerald-500 to-teal-500",
    tagline: "Built to protect your business data",
    features: [
      { name: "AWS Cloud Infrastructure", description: "Hosted on AWS with resilient, scalable compute, storage, and networking designed for enterprise workloads" },
      { name: "Encryption in Transit & At Rest", description: "All data is protected with TLS for transmission and encrypted storage on AWS services" },
      { name: "Role-Based Access Control", description: "Granular permissions ensure users access only the data and actions relevant to their role" },
      { name: "Audit Trail & Activity Logs", description: "Track user actions, data changes, and system events for accountability and review" },
      { name: "Automated Backups", description: "Regular, automated backups and point-in-time recovery options to protect against data loss" },
      { name: "Secure API Access", description: "APIs use authentication and authorization controls to keep integrations safe" },
      { name: "Data Isolation", description: "Customer environments are logically separated so your data stays within your organization" },
      { name: "Privacy by Design", description: "We collect only what is needed, do not sell data, and support your data-retention requirements" },
    ]
  }
];

const FeatureListPage = () => {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(featureCategories[0].id);
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);
  
  const currentCategory = featureCategories.find(c => c.id === activeCategory) || featureCategories[0];
  const currentIndex = featureCategories.findIndex(c => c.id === activeCategory);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {/* Website Header */}
      <WebsiteHeader />

      {/* Intro */}
      <section className="pt-10 pb-4 px-4">
        <div className="container mx-auto max-w-6xl text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 text-xs font-medium tracking-wide">AI-First • Unlimited Users • 100+ Features</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-3">
            Intelligent Tools That Guide Your Team
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto font-light text-base md:text-lg">
            Built on AI-first architecture — our platform doesn't just collect data, it <span className="text-white/90">guides your sales team</span> to success.
          </p>
        </div>
      </section>

      {/* Editorial category nav */}
      <section className="px-4 pt-6 sticky top-[60px] z-40 bg-[#0B0F1A]/95 backdrop-blur-md">
        <div className="container mx-auto max-w-6xl">
          <nav className="flex overflow-x-auto scrollbar-hide gap-x-8 gap-y-3 border-b border-slate-800/60 pb-5 justify-start md:justify-center">
            {featureCategories.map((category) => {
              const isActive = activeCategory === category.id;
              return (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={cn(
                    "relative whitespace-nowrap text-sm font-semibold tracking-wide transition-colors pb-1",
                    isActive ? "text-amber-500" : "text-slate-500 hover:text-slate-200"
                  )}
                >
                  {category.shortTitle}
                  {isActive && (
                    <span className="absolute -bottom-[21px] left-0 right-0 h-[2px] bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </section>

      {/* Editorial content */}
      <section className="px-4 pt-16 pb-20">
        <div className="container mx-auto max-w-6xl" key={activeCategory}>
          {/* Hero category header */}
          <div className="relative animate-fade-in mb-16">
            <div
              aria-hidden
              className="absolute -top-10 md:-top-16 -left-2 md:-left-6 text-[6rem] md:text-[11rem] font-bold text-slate-700/[0.07] select-none pointer-events-none uppercase tracking-tighter leading-none"
            >
              {currentCategory.shortTitle}
            </div>
            <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                <p className="text-amber-500 text-xs font-bold tracking-[0.25em] uppercase mb-3 flex items-center gap-2">
                  <currentCategory.icon className="w-3.5 h-3.5" />
                  Category {String(currentIndex + 1).padStart(2, '0')}
                </p>
                <h2 className="text-4xl md:text-6xl font-bold text-white tracking-tight">{currentCategory.title}</h2>
                <p className="text-slate-400 text-base md:text-xl mt-3 max-w-xl font-light">{currentCategory.tagline}</p>
              </div>
              <div className="flex flex-col items-start md:items-end">
                <span className="text-6xl md:text-7xl font-light text-slate-700 leading-none">
                  {String(currentCategory.features.length).padStart(2, '0')}
                </span>
                <span className="text-slate-500 uppercase tracking-widest text-[10px] font-bold mt-1">Total Features</span>
              </div>
            </div>
          </div>

          {/* Feature flow list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12 animate-fade-in">
            {currentCategory.features.map((feature, index) => {
              const interactive = !!feature.subFeatures;
              return (
                <div
                  key={feature.name}
                  onClick={() => interactive && setOpenFeature(feature)}
                  className={cn(
                    "group relative animate-fade-in",
                    interactive && "cursor-pointer"
                  )}
                  style={{ animationDelay: `${index * 30}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className="mt-1 h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-all duration-500 shadow-[0_0_20px_rgba(245,158,11,0.05)]">
                      <currentCategory.icon className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white group-hover:text-amber-500 transition-colors flex flex-wrap items-center gap-2">
                        {feature.name}
                        {feature.subFeatures && (
                          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-400/20 font-normal">
                            {feature.subFeatures.length} sub
                            <ChevronRight className="w-3 h-3" />
                          </span>
                        )}
                      </h3>
                      <p className="text-slate-400 leading-relaxed font-light text-sm">{feature.description}</p>
                      <div className="w-0 group-hover:w-full h-px bg-gradient-to-r from-amber-500 to-transparent transition-all duration-700 opacity-60" />
                      {feature.name === "Prebuilt Connectors" && (
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate('/connectors'); }}
                          className="mt-1 text-amber-400 hover:text-amber-300 text-sm font-medium inline-flex items-center gap-1"
                        >
                          View all connectors <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Technology deep-dive */}
          {activeCategory === 'technology' && (
            <div className="mt-16 text-center">
              <button
                onClick={() => navigate('/technology')}
                className="px-8 py-3 rounded-full border border-slate-700 text-slate-300 hover:text-white hover:border-amber-500 transition-all duration-300 inline-flex items-center gap-2 group"
              >
                <span>Explore the full technology architecture</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          )}

          {/* Footer navigation */}
          <div className="flex items-center justify-between mt-20 pt-8 border-t border-slate-800/60 gap-4">
            <button
              onClick={() => {
                const prevIdx = currentIndex === 0 ? featureCategories.length - 1 : currentIndex - 1;
                setActiveCategory(featureCategories[prevIdx].id);
              }}
              className="flex items-center gap-2 text-slate-500 hover:text-amber-500 transition-colors text-sm group min-w-0"
            >
              <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform shrink-0" />
              <span className="truncate">Prev · {featureCategories[currentIndex === 0 ? featureCategories.length - 1 : currentIndex - 1].shortTitle}</span>
            </button>

            <button
              onClick={() => navigate("/request-demo")}
              className="px-6 py-2.5 rounded-full bg-amber-500 text-black font-semibold hover:bg-amber-400 transition-colors text-sm whitespace-nowrap shadow-[0_0_25px_rgba(245,158,11,0.25)]"
            >
              Try {currentCategory.shortTitle}
            </button>

            <button
              onClick={() => {
                const nextIdx = currentIndex === featureCategories.length - 1 ? 0 : currentIndex + 1;
                setActiveCategory(featureCategories[nextIdx].id);
              }}
              className="flex items-center gap-2 text-slate-500 hover:text-amber-500 transition-colors text-sm group min-w-0"
            >
              <span className="truncate">Next · {featureCategories[currentIndex === featureCategories.length - 1 ? 0 : currentIndex + 1].shortTitle}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform shrink-0" />
            </button>
          </div>
        </div>
      </section>

      {/* Sub-features Dialog */}
      <Dialog open={!!openFeature} onOpenChange={(o) => !o && setOpenFeature(null)}>
        <DialogContent className="max-w-2xl bg-[#0B0F1A] border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl text-white">{openFeature?.name}</DialogTitle>
            <DialogDescription className="text-slate-400 font-light">{openFeature?.description}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 max-h-[60vh] overflow-y-auto pr-1">
            {openFeature?.subFeatures?.map((sf) => (
              <div key={sf.name} className="group">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 bg-amber-500/10 text-amber-500 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">{sf.name}</h4>
                    <p className="text-slate-400 text-xs mt-1 leading-relaxed font-light">{sf.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* CTA Section */}
      <section className="py-20 px-4 border-t border-slate-800/60 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />
        <div className="container mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight relative">
            Ready to Experience All Features?
          </h2>
          <p className="text-base md:text-lg text-slate-400 mb-8 max-w-xl mx-auto font-light relative">
            Start your free trial and explore every feature with your team.
          </p>
          <div className="flex flex-wrap justify-center gap-4 relative">
            <Button 
              size="lg"
              className="bg-amber-500 hover:bg-amber-400 text-black font-semibold px-8 rounded-full shadow-[0_0_30px_rgba(245,158,11,0.3)]"
              onClick={() => navigate("/request-demo")}
            >
              Request Demo
            </Button>
            <Button 
              size="lg"
              variant="outline"
              className="border-slate-700 text-slate-300 hover:bg-white/5 hover:text-white hover:border-amber-500 px-8 rounded-full bg-transparent"
              onClick={() => navigate("/roi-calculator")}
            >
              Calculate ROI
            </Button>
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default FeatureListPage;
