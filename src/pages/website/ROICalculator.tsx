import { useState } from "react";
import { 
  ArrowRight, ArrowLeft, Calculator, Users, Target, Clock, 
  TrendingUp, AlertTriangle, CheckCircle2, Sparkles, Calendar,
  BarChart3, Smartphone, Award, Zap, Building2, Brain, Truck,
  LineChart, FileText, ShieldCheck, Lightbulb, Handshake,
  Download, Info, Rocket, Phone, Mail, User, MessageSquare,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { WebsiteHeader, WebsiteFooter } from "@/components/website";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import quickappLogo from "@/assets/quickapp-logo-full.png";

type StepId = "team" | "process" | "challenges" | "distributor" | "institutional" | "analytics" | "ai-readiness" | "goals" | "results";

interface Answer {
  teamSize: number;
  currentProcess: string;
  challenges: string[];
  // Distributor Management
  distributorCount: string;
  distributorChallenges: string[];
  // Institutional Sales
  hasInstitutionalSales: string;
  institutionalChallenges: string[];
  // Analytics
  analyticsMaturity: string;
  analyticsNeeds: string[];
  // AI Readiness
  aiAdoption: string;
  aiInterest: string[];
  // Goals
  topPriority: string;
  priorities: string[];
}

const initialAnswers: Answer = {
  teamSize: 50,
  currentProcess: "",
  challenges: [],
  distributorCount: "",
  distributorChallenges: [],
  hasInstitutionalSales: "",
  institutionalChallenges: [],
  analyticsMaturity: "",
  analyticsNeeds: [],
  aiAdoption: "",
  aiInterest: [],
  topPriority: "",
  priorities: [],
};

const processOptions = [
  { value: "manual", label: "Manual / Paper-based", description: "Excel sheets, paper forms, WhatsApp groups", impact: 40 },
  { value: "basic-app", label: "Basic Mobile App", description: "Simple order booking app with limited features", impact: 25 },
  { value: "legacy-sfa", label: "Legacy SFA Tool", description: "Traditional SFA with per-user pricing", impact: 15 },
  { value: "none", label: "No Formal Process", description: "Reps work independently without tracking", impact: 50 },
];

const challengeOptions = [
  { value: "visibility", label: "Limited Field Visibility", description: "Don't know what reps are doing in real-time", icon: Target },
  { value: "productivity", label: "Low Rep Productivity", description: "Reps spend too much time on admin work", icon: Clock },
  { value: "accuracy", label: "Data Accuracy Issues", description: "Orders, stock data is often incorrect", icon: AlertTriangle },
  { value: "adoption", label: "Poor Tool Adoption", description: "Team doesn't use existing tools consistently", icon: Smartphone },
  { value: "insights", label: "Lack of Insights", description: "No actionable data for decision making", icon: BarChart3 },
  { value: "collections", label: "Collection Delays", description: "Payments are often delayed or missed", icon: Calendar },
];

const distributorCountOptions = [
  { value: "none", label: "No distributors", description: "Direct sales model" },
  { value: "1-10", label: "1-10 distributors", description: "Small distribution network" },
  { value: "11-50", label: "11-50 distributors", description: "Growing network" },
  { value: "50+", label: "50+ distributors", description: "Large distribution network" },
];

const distributorChallengeOptions = [
  { value: "order-visibility", label: "Primary Order Visibility", description: "No real-time view of distributor orders", icon: FileText },
  { value: "inventory", label: "Inventory Tracking", description: "Don't know distributor stock levels", icon: Truck },
  { value: "claims", label: "Claims Management", description: "Manual and delayed claims processing", icon: Calendar },
  { value: "communication", label: "Communication Gaps", description: "Difficult to coordinate with distributors", icon: Building2 },
  { value: "performance", label: "Performance Tracking", description: "Can't measure distributor effectiveness", icon: BarChart3 },
  { value: "onboarding", label: "Slow Onboarding", description: "Takes weeks to onboard new distributors", icon: Users },
];

const institutionalOptions = [
  { value: "yes-active", label: "Yes, actively growing", description: "Institutional sales is a key focus area" },
  { value: "yes-limited", label: "Yes, but limited", description: "Some institutional customers, not a focus" },
  { value: "planning", label: "Planning to start", description: "Evaluating institutional sales opportunity" },
  { value: "no", label: "No institutional sales", description: "Focus only on retail/distribution" },
];

const institutionalChallengeOptions = [
  { value: "lead-tracking", label: "Lead Management", description: "Leads fall through the cracks", icon: Target },
  { value: "pipeline", label: "Pipeline Visibility", description: "No clear view of sales pipeline", icon: LineChart },
  { value: "quotes", label: "Quote Management", description: "Manual quotation process, slow turnaround", icon: FileText },
  { value: "collections", label: "Collections", description: "Delayed payments from institutions", icon: Calendar },
  { value: "contacts", label: "Contact Management", description: "Losing track of key decision makers", icon: Users },
  { value: "pricing", label: "Custom Pricing", description: "Difficult to manage account-specific pricing", icon: Building2 },
];

const analyticsMaturityOptions = [
  { value: "none", label: "No analytics", description: "Rely on gut feeling and experience" },
  { value: "basic", label: "Basic Excel reports", description: "Monthly reports in spreadsheets" },
  { value: "moderate", label: "Some dashboards", description: "Have dashboards but not real-time" },
  { value: "advanced", label: "Advanced analytics", description: "Real-time dashboards and reports" },
];

const analyticsNeedOptions = [
  { value: "real-time", label: "Real-time Dashboards", description: "Live view of field activities", icon: BarChart3 },
  { value: "beat-analytics", label: "Beat Performance", description: "Analyze beat productivity", icon: Target },
  { value: "retailer-insights", label: "Retailer Insights", description: "Deep dive into retailer behavior", icon: Users },
  { value: "territory", label: "Territory Analysis", description: "Compare territory performance", icon: Building2 },
  { value: "trends", label: "Trend Analysis", description: "Identify patterns and forecast", icon: LineChart },
  { value: "custom-kpi", label: "Custom KPIs", description: "Track metrics specific to your business", icon: Target },
];

const aiAdoptionOptions = [
  { value: "none", label: "Not using AI", description: "Haven't explored AI solutions yet" },
  { value: "curious", label: "Curious about AI", description: "Interested but haven't implemented" },
  { value: "experimenting", label: "Experimenting", description: "Trying out AI in some areas" },
  { value: "using", label: "Actively using AI", description: "AI is part of our operations" },
];

const aiInterestOptions = [
  { value: "recommendations", label: "Smart Product Recommendations", description: "AI-suggested products for each retailer", icon: Lightbulb },
  { value: "stock-detection", label: "Shelf Stock Detection", description: "AI analyzes photos to detect stock levels", icon: Brain },
  { value: "credit-scoring", label: "Credit Risk Assessment", description: "AI-based retailer credit scoring", icon: ShieldCheck },
  { value: "sales-coach", label: "AI Sales Coach", description: "Personalized coaching tips for reps", icon: Award },
  { value: "competition", label: "Competition Analysis", description: "AI scans competitor products from photos", icon: Target },
  { value: "forecasting", label: "Demand Forecasting", description: "Predict future demand patterns", icon: LineChart },
];

const priorityOptions = [
  { value: "productivity", label: "Increase Rep Productivity", description: "Get more done with the same team" },
  { value: "visibility", label: "Improve Field Visibility", description: "Know what's happening in real-time" },
  { value: "growth", label: "Drive Sales Growth", description: "Increase orders and revenue" },
  { value: "efficiency", label: "Reduce Operational Costs", description: "Cut manual work and errors" },
  { value: "distributor", label: "Strengthen Distribution", description: "Better distributor collaboration" },
  { value: "analytics", label: "Data-Driven Decisions", description: "Make decisions based on insights" },
];

export const ROICalculator = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<StepId>("team");
  const [answers, setAnswers] = useState<Answer>(initialAnswers);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", company: "", message: "" });
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const steps: { id: StepId; label: string }[] = [
    { id: "team", label: "Your Team" },
    { id: "process", label: "Current Process" },
    { id: "challenges", label: "Challenges" },
    { id: "distributor", label: "Distribution" },
    { id: "institutional", label: "Institutional Sales" },
    { id: "analytics", label: "Analytics" },
    { id: "ai-readiness", label: "AI Readiness" },
    { id: "goals", label: "Goals" },
    { id: "results", label: "Your Results" },
  ];

  const currentStepIndex = steps.findIndex(s => s.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const canProceed = () => {
    switch (currentStep) {
      case "team": return answers.teamSize >= 5;
      case "process": return answers.currentProcess !== "";
      case "challenges": return answers.challenges.length > 0;
      case "distributor": return answers.distributorCount !== "";
      case "institutional": return answers.hasInstitutionalSales !== "";
      case "analytics": return answers.analyticsMaturity !== "";
      case "ai-readiness": return answers.aiAdoption !== "";
      case "goals": return answers.priorities.length > 0;
      default: return true;
    }
  };

  const nextStep = () => {
    const idx = steps.findIndex(s => s.id === currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1].id);
  };

  const prevStep = () => {
    const idx = steps.findIndex(s => s.id === currentStep);
    if (idx > 0) setCurrentStep(steps[idx - 1].id);
  };

  const toggleOption = (field: keyof Answer, value: string) => {
    setAnswers(prev => {
      const current = prev[field] as string[];
      return {
        ...prev,
        [field]: current.includes(value)
          ? current.filter(c => c !== value)
          : [...current, value]
      };
    });
  };

  // Generate situation summary
  const generateSituationSummary = () => {
    const processLabel = processOptions.find(p => p.value === answers.currentProcess)?.label || "Unknown";
    const distributorLabel = distributorCountOptions.find(d => d.value === answers.distributorCount)?.label || "";
    const analyticsLabel = analyticsMaturityOptions.find(a => a.value === answers.analyticsMaturity)?.label || "";
    const aiLabel = aiAdoptionOptions.find(a => a.value === answers.aiAdoption)?.label || "";
    
    return {
      processLabel,
      distributorLabel,
      analyticsLabel,
      aiLabel,
      teamSize: answers.teamSize,
      hasDistributors: answers.distributorCount !== "none",
      hasInstitutional: answers.hasInstitutionalSales === "yes-active" || answers.hasInstitutionalSales === "yes-limited",
    };
  };

  // Generate problem statements
  const generateProblemStatements = () => {
    const problems: { area: string; issue: string; impact: string }[] = [];
    
    // Field Sales challenges
    if (answers.challenges.includes("visibility")) {
      problems.push({
        area: "Field Operations",
        issue: "Limited visibility into field activities",
        impact: "Cannot make timely decisions or course-correct underperforming reps"
      });
    }
    if (answers.challenges.includes("productivity")) {
      problems.push({
        area: "Productivity",
        issue: "Reps spend excessive time on administrative tasks",
        impact: "Reduced selling time directly impacts revenue potential"
      });
    }
    if (answers.challenges.includes("adoption")) {
      problems.push({
        area: "Technology",
        issue: "Poor adoption of existing tools",
        impact: "Investment in technology not yielding expected returns"
      });
    }
    if (answers.challenges.includes("accuracy")) {
      problems.push({
        area: "Data Quality",
        issue: "Frequent data entry errors and inconsistencies",
        impact: "Wrong orders, returns, and customer dissatisfaction"
      });
    }
    
    // Distributor challenges
    if (answers.distributorChallenges.includes("order-visibility")) {
      problems.push({
        area: "Distribution",
        issue: "No real-time visibility into distributor orders",
        impact: "Cannot plan production or manage stock effectively"
      });
    }
    if (answers.distributorChallenges.includes("inventory")) {
      problems.push({
        area: "Supply Chain",
        issue: "Unable to track distributor inventory levels",
        impact: "Stock-outs at distributors leading to lost sales"
      });
    }
    if (answers.distributorChallenges.includes("claims")) {
      problems.push({
        area: "Finance",
        issue: "Manual and slow claims processing",
        impact: "Distributor dissatisfaction and relationship strain"
      });
    }
    
    // Institutional challenges
    if (answers.institutionalChallenges.includes("lead-tracking")) {
      problems.push({
        area: "Institutional Sales",
        issue: "Leads not being tracked systematically",
        impact: "Missed opportunities and revenue leakage"
      });
    }
    if (answers.institutionalChallenges.includes("pipeline")) {
      problems.push({
        area: "Sales Pipeline",
        issue: "No clear visibility into deal pipeline",
        impact: "Cannot forecast accurately or prioritize efforts"
      });
    }
    
    // Analytics gaps
    if (answers.analyticsMaturity === "none" || answers.analyticsMaturity === "basic") {
      problems.push({
        area: "Analytics",
        issue: "Decisions made without data-driven insights",
        impact: "Suboptimal resource allocation and missed opportunities"
      });
    }
    
    return problems;
  };

  // Generate recommendations with approach
  const generateRecommendations = () => {
    const recommendations: { 
      title: string; 
      description: string; 
      approach: string[];
      timeline: string;
      icon: typeof Target;
    }[] = [];
    
    // Field Sales Automation
    if (answers.currentProcess === "manual" || answers.currentProcess === "none" || answers.challenges.includes("productivity")) {
      recommendations.push({
        title: "Field Sales Automation",
        description: "Transform manual processes into automated, GPS-verified workflows",
        approach: [
          "Deploy QuickApp mobile app to all field reps with 2-day onboarding",
          "Enable GPS-verified attendance with face recognition",
          "Set up beat planning with optimized routes",
          "Configure offline-first order entry with real-time sync"
        ],
        timeline: "Week 1-2",
        icon: Smartphone
      });
    }
    
    // Gamification for adoption
    if (answers.challenges.includes("adoption")) {
      recommendations.push({
        title: "Gamification-Driven Adoption",
        description: "Use points, badges, and leaderboards to drive consistent tool usage",
        approach: [
          "Configure gamification rules aligned to your KPIs",
          "Set up real-time leaderboards visible to all teams",
          "Create badge milestones for key achievements",
          "Run weekly competitions with recognition"
        ],
        timeline: "Week 2-3",
        icon: Award
      });
    }
    
    // Distributor Portal
    if (answers.distributorCount !== "none" && answers.distributorChallenges.length > 0) {
      recommendations.push({
        title: "Distributor Portal Setup",
        description: "Give distributors their own portal for orders, inventory, and claims",
        approach: [
          "Onboard distributors to the self-service portal",
          "Enable primary order placement with approval workflows",
          "Set up real-time inventory visibility and alerts",
          "Configure digital claims submission and tracking",
          "Provide business planning tools for annual targets"
        ],
        timeline: "Week 2-4",
        icon: Building2
      });
    }
    
    // Institutional Sales CRM
    if (answers.hasInstitutionalSales === "yes-active" || answers.hasInstitutionalSales === "yes-limited") {
      recommendations.push({
        title: "Institutional Sales Module",
        description: "Full CRM capabilities for B2B/institutional sales",
        approach: [
          "Set up lead capture and qualification workflow",
          "Configure opportunity pipeline with stages",
          "Enable quotation generation with custom pricing",
          "Track all contacts and decision makers per account",
          "Automate collection reminders and follow-ups"
        ],
        timeline: "Week 3-5",
        icon: Handshake
      });
    }
    
    // Analytics & Reporting
    if (answers.analyticsMaturity === "none" || answers.analyticsMaturity === "basic" || answers.analyticsNeeds.length > 0) {
      recommendations.push({
        title: "Analytics & Insights Platform",
        description: "Real-time dashboards and reports for data-driven decisions",
        approach: [
          "Configure role-based dashboards (Rep, Manager, Leadership)",
          "Set up real-time performance tracking",
          "Enable beat and territory analytics",
          "Create custom KPI configurations for your metrics",
          "Schedule automated reports to stakeholders"
        ],
        timeline: "Week 1-3",
        icon: BarChart3
      });
    }
    
    // AI Features
    if (answers.aiAdoption !== "using" && answers.aiInterest.length > 0) {
      const aiFeatures: string[] = [];
      if (answers.aiInterest.includes("recommendations")) aiFeatures.push("Smart product recommendations based on retailer history");
      if (answers.aiInterest.includes("stock-detection")) aiFeatures.push("Shelf image analysis for stock detection");
      if (answers.aiInterest.includes("credit-scoring")) aiFeatures.push("AI-powered credit risk scoring");
      if (answers.aiInterest.includes("sales-coach")) aiFeatures.push("Personalized AI sales coaching tips");
      if (answers.aiInterest.includes("competition")) aiFeatures.push("Competition product analysis from photos");
      if (answers.aiInterest.includes("forecasting")) aiFeatures.push("Demand prediction and forecasting");
      
      recommendations.push({
        title: "AI-Powered Intelligence",
        description: "Leverage AI to augment your sales team's capabilities",
        approach: aiFeatures.length > 0 ? aiFeatures : [
          "Enable AI-powered product recommendations",
          "Set up shelf stock detection from photos",
          "Configure credit scoring for retailers"
        ],
        timeline: "Week 4-6",
        icon: Brain
      });
    }
    
    return recommendations;
  };

  // Calculate ROI Score
  const calculateROI = () => {
    let score = 0;
    
    // Process impact
    const processImpact = processOptions.find(p => p.value === answers.currentProcess)?.impact || 0;
    score += processImpact;

    // Challenges count
    score += answers.challenges.length * 5;
    
    // Distributor complexity
    if (answers.distributorCount === "50+") score += 15;
    else if (answers.distributorCount === "11-50") score += 10;
    else if (answers.distributorCount === "1-10") score += 5;
    
    score += answers.distributorChallenges.length * 3;
    
    // Institutional sales opportunity
    if (answers.hasInstitutionalSales === "yes-active") score += 10;
    else if (answers.hasInstitutionalSales === "yes-limited") score += 5;
    else if (answers.hasInstitutionalSales === "planning") score += 8;
    
    score += answers.institutionalChallenges.length * 3;
    
    // Analytics gap
    if (answers.analyticsMaturity === "none") score += 15;
    else if (answers.analyticsMaturity === "basic") score += 10;
    else if (answers.analyticsMaturity === "moderate") score += 5;
    
    score += answers.analyticsNeeds.length * 2;
    
    // AI opportunity
    if (answers.aiAdoption === "none") score += 10;
    else if (answers.aiAdoption === "curious") score += 8;
    else if (answers.aiAdoption === "experimenting") score += 5;
    
    score += answers.aiInterest.length * 2;

    // Team size factor
    const teamFactor = Math.min(answers.teamSize / 100, 1.5);
    score = score * teamFactor;

    // Normalize score to 0-100
    score = Math.min(Math.round(score), 100);

    return score;
  };

  const getScoreLevel = (score: number) => {
    if (score >= 75) return { label: "High Impact Opportunity", color: "text-green-500", bg: "bg-green-500", recommendation: "immediate" };
    if (score >= 50) return { label: "Significant Value Potential", color: "text-emerald-500", bg: "bg-emerald-500", recommendation: "pilot" };
    if (score >= 25) return { label: "Good Fit", color: "text-yellow-500", bg: "bg-yellow-500", recommendation: "explore" };
    return { label: "Moderate Opportunity", color: "text-orange-500", bg: "bg-orange-500", recommendation: "assess" };
  };

  const score = calculateROI();
  const scoreLevel = getScoreLevel(score);
  const situation = generateSituationSummary();
  const problems = generateProblemStatements();
  const recommendations = generateRecommendations();

  // Value Map — link each challenge raised by the customer to QuickApp.AI's
  // proposition that directly addresses it.
  const generateValueMap = () => {
    const fieldMap: Record<string, { value: string; capabilities: string[] }> = {
      visibility: {
        value: "Real-time field visibility across every rep and territory",
        capabilities: ["Live GPS & route replay", "Geo-tagged check-ins", "Beat & visit telemetry", "Manager live dashboard"],
      },
      productivity: {
        value: "Reps sell more, type less — admin work is automated away",
        capabilities: ["Offline-first order capture", "AI Smart Basket", "Auto beat plans", "1-tap visit logging"],
      },
      accuracy: {
        value: "Clean, trustworthy data by design — no manual reconciliation",
        capabilities: ["Validated product catalog", "Scheme & price engine", "Structured order forms", "Auto stock sync"],
      },
      adoption: {
        value: "Adoption that actually sticks across the field team",
        capabilities: ["Gamification 2.0 & streaks", "Vernacular UI (6+ languages)", "Lightweight Android app", "In-app coaching nudges"],
      },
      insights: {
        value: "Decisions in minutes, not spreadsheet cycles",
        capabilities: ["Role-based dashboards", "AI-ready reports", "Voice analytics", "Proactive alerts"],
      },
      collections: {
        value: "Faster cash with AI-driven credit & collections",
        capabilities: ["AI credit scoring", "Automated dunning", "Digital receipts", "Payment proof capture"],
      },
    };
    const distributorMap: Record<string, { value: string; capabilities: string[] }> = {
      "order-visibility": {
        value: "End-to-end primary order visibility from PO to dispatch",
        capabilities: ["Distributor Portal", "Live primary order status", "ASN & dispatch tracking", "PO approval workflow"],
      },
      inventory: {
        value: "Always know what's on every distributor's shelf",
        capabilities: ["Real-time distributor stock", "Low-stock alerts", "Auto-replenishment hints", "SKU-level ageing"],
      },
      claims: {
        value: "Claims settled in days, not months — with full audit trail",
        capabilities: ["Digital claims workflow", "Rules-based validation", "Document capture", "Settlement dashboard"],
      },
      communication: {
        value: "One channel for every distributor conversation",
        capabilities: ["Two-way portal messaging", "WhatsApp broadcasts", "Announcements & circulars", "Ticketing & SLAs"],
      },
      performance: {
        value: "Distributor performance you can measure and coach",
        capabilities: ["Distributor scorecards", "RoI dashboards", "Beat coverage analytics", "Target vs actual"],
      },
      onboarding: {
        value: "Onboard a new distributor in days, not weeks",
        capabilities: ["Self-serve onboarding", "KYC capture", "Price-book sync", "Role & permission templates"],
      },
    };
    const institutionalMap: Record<string, { value: string; capabilities: string[] }> = {
      "lead-tracking": {
        value: "Every institutional lead captured, routed and followed up",
        capabilities: ["Institutional CRM", "Lead capture forms", "Auto-assignment rules", "SLA reminders"],
      },
      pipeline: {
        value: "Predictable B2B pipeline with no surprises at quarter-end",
        capabilities: ["Visual sales pipeline", "Stage probability", "Forecast roll-up", "Win/loss analysis"],
      },
      quotes: {
        value: "Quotes out in minutes with zero pricing errors",
        capabilities: ["CPQ with templates", "Approval workflow", "One-click PDF quotations", "Version history"],
      },
      collections: {
        value: "Institutional collections accelerated and automated",
        capabilities: ["Account-level ageing", "Automated dunning", "Payment links", "Statement of accounts"],
      },
      contacts: {
        value: "A complete Account 360 for every key customer",
        capabilities: ["Stakeholder map", "Last-touch & engagement", "Activity timeline", "Document vault"],
      },
      pricing: {
        value: "Account-specific pricing managed without spreadsheets",
        capabilities: ["Custom price books", "Contracts & tiers", "Approval-bound discounts", "Margin guardrails"],
      },
    };

    type ValueMapRow = {
      area: string;
      challengeLabel: string;
      value: string;
      capabilities: string[];
    };
    const rows: ValueMapRow[] = [];
    answers.challenges.forEach((c) => {
      const m = fieldMap[c];
      const label = challengeOptions.find((o) => o.value === c)?.label || c;
      if (m) rows.push({ area: "Field Sales", challengeLabel: label, value: m.value, capabilities: m.capabilities });
    });
    answers.distributorChallenges.forEach((c) => {
      const m = distributorMap[c];
      const label = distributorChallengeOptions.find((o) => o.value === c)?.label || c;
      if (m) rows.push({ area: "Distributor / DMS", challengeLabel: label, value: m.value, capabilities: m.capabilities });
    });
    answers.institutionalChallenges.forEach((c) => {
      const m = institutionalMap[c];
      const label = institutionalChallengeOptions.find((o) => o.value === c)?.label || c;
      if (m) rows.push({ area: "Institutional CRM", challengeLabel: label, value: m.value, capabilities: m.capabilities });
    });
    return rows;
  };
  const valueMap = generateValueMap();

  // Tailored business benefits derived from the user's responses
  const generateBenefits = () => {
    const benefits: { metric: string; value: string; rationale: string }[] = [];
    if (answers.challenges.includes("productivity") || answers.currentProcess === "manual" || answers.currentProcess === "none") {
      benefits.push({ metric: "Rep Productivity", value: "+25–40%", rationale: "Automated check-ins, beat plans and offline order capture eliminate admin overhead." });
    }
    if (answers.challenges.includes("visibility")) {
      benefits.push({ metric: "Field Visibility", value: "Real-time", rationale: "Live GPS, attendance and visit telemetry across every rep and territory." });
    }
    if (answers.challenges.includes("accuracy")) {
      benefits.push({ metric: "Data Accuracy", value: "+90%", rationale: "Structured catalogs, validated orders and scheme engine remove manual errors." });
    }
    if (answers.challenges.includes("collections") || answers.distributorChallenges.includes("claims")) {
      benefits.push({ metric: "Collections Cycle", value: "-30%", rationale: "AI credit scoring, automated reminders and digital claims accelerate cash." });
    }
    if (answers.distributorCount !== "none" && answers.distributorCount !== "") {
      benefits.push({ metric: "Distributor Engagement", value: "2× faster", rationale: "Self-serve portal for primary orders, stock visibility and claims." });
    }
    if (situation.hasInstitutional) {
      benefits.push({ metric: "B2B Pipeline Conversion", value: "+15–25%", rationale: "CRM, CPQ and structured follow-ups capture every institutional opportunity." });
    }
    if (answers.analyticsMaturity === "none" || answers.analyticsMaturity === "basic") {
      benefits.push({ metric: "Decision Speed", value: "Days → Minutes", rationale: "Role-based dashboards and AI-ready reports replace spreadsheet cycles." });
    }
    if (answers.aiInterest.length > 0) {
      benefits.push({ metric: "AI Coverage", value: `${answers.aiInterest.length} use-cases`, rationale: "Tailored AI modules deployed against the capabilities you shortlisted." });
    }
    if (answers.topPriority === "growth") {
      benefits.push({ metric: "Top-line Growth", value: "+12–20%", rationale: "Smart basket, focus SKUs and gamified targets push secondary sales." });
    }
    return benefits.slice(0, 8);
  };

  // Step-by-step implementation roadmap mapped to identified needs
  const generateRoadmap = () => {
    const phases: { phase: string; weeks: string; goal: string; activities: string[]; mappedTo: string[] }[] = [];
    phases.push({
      phase: "Phase 1 — Discovery & Setup",
      weeks: "Week 1",
      goal: "Configure QuickApp to mirror your operating model.",
      activities: [
        "Kickoff workshop: territories, beats, roles, hierarchy",
        "Master data import: retailers, products, schemes, price lists",
        "Configure approval flows, attendance and leave policies",
        "Branding, invoice templates and tax masters set up",
      ],
      mappedTo: ["Current process: " + situation.processLabel],
    });
    phases.push({
      phase: "Phase 2 — Field Rollout",
      weeks: "Week 2",
      goal: "Get every rep transacting on QuickApp daily.",
      activities: [
        "Install mobile app, enable GPS + face-verified attendance",
        "Train reps on beat plans, visits and offline order capture",
        "Launch gamification: leaderboards, badges, weekly contests",
        ...(answers.challenges.includes("adoption") ? ["Adoption nudges & daily streaks to lock in tool usage"] : []),
      ],
      mappedTo: [
        ...(answers.challenges.includes("productivity") ? ["Low rep productivity"] : []),
        ...(answers.challenges.includes("adoption") ? ["Poor tool adoption"] : []),
        ...(answers.challenges.includes("visibility") ? ["Limited field visibility"] : []),
      ],
    });
    if (answers.distributorCount !== "none" && answers.distributorCount !== "") {
      phases.push({
        phase: "Phase 3 — Distribution Activation",
        weeks: "Week 2–3",
        goal: "Bring distributors onto the self-serve DMS portal.",
        activities: [
          "Onboard distributors and assign retailers / beats",
          "Enable primary orders, dispatch, GRN and stock visibility",
          "Digitise claims, schemes and credit notes",
          "Set up retailer ledgers and WhatsApp invoice delivery",
        ],
        mappedTo: answers.distributorChallenges.length ? answers.distributorChallenges.map(c => distributorChallengeOptions.find(o => o.value === c)?.label || c) : ["Distribution network"],
      });
    }
    if (situation.hasInstitutional) {
      phases.push({
        phase: "Phase 4 — Institutional Sales CRM",
        weeks: "Week 3–4",
        goal: "Stand up the B2B pipeline with CPQ.",
        activities: [
          "Lead capture, qualification and pipeline stages",
          "CPQ: quote builder with custom pricing & approvals",
          "Contact & account management with reminders",
          "Collections workflow with aging dashboards",
        ],
        mappedTo: answers.institutionalChallenges.length ? answers.institutionalChallenges.map(c => institutionalChallengeOptions.find(o => o.value === c)?.label || c) : ["Institutional sales"],
      });
    }
    phases.push({
      phase: "Phase 5 — Analytics & AI",
      weeks: "Week 4–6",
      goal: "Move from data capture to decisions.",
      activities: [
        "Role-based dashboards: rep, manager, leadership",
        "Scheduled reports and exception alerts",
        ...(answers.aiInterest.includes("recommendations") ? ["Enable smart product recommendations per retailer"] : []),
        ...(answers.aiInterest.includes("stock-detection") ? ["Activate shelf-image stock detection"] : []),
        ...(answers.aiInterest.includes("credit-scoring") ? ["Roll out AI credit scoring for retailers"] : []),
        ...(answers.aiInterest.includes("sales-coach") ? ["AI sales coach nudges for each rep"] : []),
        ...(answers.aiInterest.includes("competition") ? ["Competition scan from in-store photos"] : []),
        ...(answers.aiInterest.includes("forecasting") ? ["Demand forecasting at SKU × territory"] : []),
      ],
      mappedTo: [
        ...(answers.analyticsNeeds.map(a => analyticsNeedOptions.find(o => o.value === a)?.label || a)),
        ...(answers.aiInterest.length === 0 ? ["Analytics maturity: " + situation.analyticsLabel] : []),
      ],
    });
    phases.push({
      phase: "Phase 6 — Steady State & Optimisation",
      weeks: "Week 6+",
      goal: "Run cadences that compound the gains.",
      activities: [
        "Monthly business reviews driven by QuickApp dashboards",
        "Quarterly scheme & target re-planning",
        "Continuous catalog, pricing and territory refinement",
        "Customer success check-ins and feature enablement",
      ],
      mappedTo: ["Top priority: " + (priorityOptions.find(p => p.value === answers.topPriority)?.label || "Operational excellence")],
    });
    return phases;
  };

  const benefits = generateBenefits();
  const roadmap = generateRoadmap();

  const nextStepsList = [
    "Book a 30-minute discovery call with a QuickApp solution expert",
    "Share this report internally with sales, ops and IT stakeholders",
    "Identify a pilot territory (10–20 reps) for the first 4-week rollout",
    "Nominate a project owner and a master-data SPOC on your side",
    "Confirm integrations needed (ERP, accounting, WhatsApp, payments)",
  ];

  // Branded PDF download
  const handleDownloadPdf = async () => {
    try {
      setGeneratingPdf(true);
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 40;

      // Load logo
      const logoData: string = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          c.getContext("2d")!.drawImage(img, 0, 0);
          resolve(c.toDataURL("image/png"));
        };
        img.onerror = () => resolve("");
        img.src = quickappLogo;
      });

      const drawHeader = () => {
        if (logoData) doc.addImage(logoData, "PNG", margin, 24, 90, 24);
        doc.setFontSize(9); doc.setTextColor(120);
        doc.text("QuickApp Field Sales — ROI Assessment", pageW - margin, 38, { align: "right" });
        doc.setDrawColor(230); doc.line(margin, 60, pageW - margin, 60);
      };
      const drawFooter = (pageNum: number, total: number) => {
        doc.setFontSize(9); doc.setTextColor(120);
        doc.text("quickapp.ai  •  Generated " + new Date().toLocaleDateString(), margin, pageH - 24);
        doc.text(`Page ${pageNum} of ${total}`, pageW - margin, pageH - 24, { align: "right" });
      };

      let y = 80;
      drawHeader();
      doc.setTextColor(20); doc.setFontSize(20);
      doc.text("Your ROI Potential Report", margin, y); y += 28;
      doc.setFontSize(12); doc.setTextColor(80);
      doc.text(`Score: ${score}/100  —  ${scoreLevel.label}`, margin, y); y += 24;

      doc.setFontSize(11); doc.setTextColor(40);
      const intro = "This personalised report summarises your current sales operating model, the gaps we identified, and a step-by-step plan to capture the value QuickApp can unlock for your team.";
      doc.text(doc.splitTextToSize(intro, pageW - margin * 2), margin, y); y += 50;

      // Situation
      autoTable(doc, {
        startY: y, theme: "grid", styles: { fontSize: 10 }, headStyles: { fillColor: [37, 99, 235] },
        head: [["Your Situation", "Detail"]],
        body: [
          ["Team size", `${situation.teamSize} field reps`],
          ["Current process", situation.processLabel],
          ["Distribution", situation.distributorLabel || "No distributors"],
          ["Institutional sales", situation.hasInstitutional ? "Yes" : "No"],
          ["Analytics maturity", situation.analyticsLabel],
          ["AI adoption", situation.aiLabel],
          ["Top priority", priorityOptions.find(p => p.value === answers.topPriority)?.label || "—"],
        ],
        margin: { left: margin, right: margin },
      });
      y = (doc as any).lastAutoTable.finalY + 20;

      // Challenges
      if (problems.length) {
        autoTable(doc, {
          startY: y, theme: "striped", styles: { fontSize: 10 }, headStyles: { fillColor: [217, 119, 6] },
          head: [["Area", "Challenge", "Business Impact"]],
          body: problems.map(p => [p.area, p.issue, p.impact]),
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Benefits
      if (benefits.length) {
        if (y > pageH - 200) { doc.addPage(); drawHeader(); y = 80; }
        autoTable(doc, {
          startY: y, theme: "grid", styles: { fontSize: 10 }, headStyles: { fillColor: [16, 185, 129] },
          head: [["Expected Benefit", "Value", "Why"]],
          body: benefits.map(b => [b.metric, b.value, b.rationale]),
          margin: { left: margin, right: margin },
        });
        y = (doc as any).lastAutoTable.finalY + 20;
      }

      // Recommendations
      doc.addPage(); drawHeader(); y = 80;
      doc.setFontSize(16); doc.setTextColor(20);
      doc.text("Recommended Solution", margin, y); y += 18;
      recommendations.forEach(r => {
        if (y > pageH - 120) { doc.addPage(); drawHeader(); y = 80; }
        doc.setFontSize(12); doc.setTextColor(37, 99, 235);
        doc.text(`${r.title}  (${r.timeline})`, margin, y); y += 14;
        doc.setFontSize(10); doc.setTextColor(60);
        const desc = doc.splitTextToSize(r.description, pageW - margin * 2);
        doc.text(desc, margin, y); y += desc.length * 12 + 4;
        r.approach.forEach(a => {
          const lines = doc.splitTextToSize("• " + a, pageW - margin * 2 - 10);
          if (y + lines.length * 12 > pageH - 60) { doc.addPage(); drawHeader(); y = 80; }
          doc.text(lines, margin + 10, y); y += lines.length * 12;
        });
        y += 10;
      });

      // Roadmap
      doc.addPage(); drawHeader(); y = 80;
      doc.setFontSize(16); doc.setTextColor(20);
      doc.text("Step-by-Step Implementation Roadmap", margin, y); y += 10;
      autoTable(doc, {
        startY: y + 10, theme: "grid", styles: { fontSize: 9, valign: "top" }, headStyles: { fillColor: [37, 99, 235] },
        head: [["Phase", "Timeline", "Goal", "Key Activities", "Mapped To"]],
        body: roadmap.map(p => [p.phase, p.weeks, p.goal, p.activities.map(a => "• " + a).join("\n"), p.mappedTo.join(", ") || "—"]),
        columnStyles: { 0: { cellWidth: 90 }, 1: { cellWidth: 55 }, 2: { cellWidth: 90 }, 3: { cellWidth: 170 }, 4: { cellWidth: "auto" } },
        margin: { left: margin, right: margin },
      });

      // Next steps + contact
      doc.addPage(); drawHeader(); y = 80;
      doc.setFontSize(16); doc.setTextColor(20); doc.text("Next Steps", margin, y); y += 18;
      doc.setFontSize(11); doc.setTextColor(40);
      nextStepsList.forEach((s, i) => {
        const lines = doc.splitTextToSize(`${i + 1}. ${s}`, pageW - margin * 2);
        doc.text(lines, margin, y); y += lines.length * 14;
      });
      y += 16;
      doc.setFontSize(14); doc.setTextColor(20); doc.text("Talk to us", margin, y); y += 16;
      doc.setFontSize(11); doc.setTextColor(60);
      doc.text("Email: hello@quickapp.ai", margin, y); y += 14;
      doc.text("Web: https://quickapp.ai/demo", margin, y); y += 14;

      // Page numbers
      const total = doc.getNumberOfPages();
      for (let i = 1; i <= total; i++) { doc.setPage(i); drawFooter(i, total); }

      doc.save(`QuickApp-ROI-Report-${Date.now()}.pdf`);
      toast.success("ROI report downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error("Could not generate PDF");
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contact.name || !contact.email) { toast.error("Name and email are required"); return; }
    setSubmitting(true);
    try {
      // Persist intent locally; integration with backend can be wired later
      const payload = { ...contact, score, scoreLevel: scoreLevel.label, answers, submittedAt: new Date().toISOString() };
      const existing = JSON.parse(localStorage.getItem("roi_contact_requests") || "[]");
      existing.push(payload);
      localStorage.setItem("roi_contact_requests", JSON.stringify(existing));
      toast.success("Thanks! Our team will reach out shortly.");
      setContact({ name: "", email: "", phone: "", company: "", message: "" });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case "team":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Let&apos;s understand your team</h2>
              <p className="text-muted-foreground">How large is your field sales team?</p>
            </div>
            <div className="max-w-md mx-auto space-y-6">
              <div className="text-center">
                <span className="text-5xl font-bold text-primary">{answers.teamSize}</span>
                <span className="text-xl text-muted-foreground ml-2">field reps</span>
              </div>
              <Slider
                value={[answers.teamSize]}
                onValueChange={(v) => setAnswers(prev => ({ ...prev, teamSize: v[0] }))}
                min={5}
                max={500}
                step={5}
                className="w-full"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>5 reps</span>
                <span>500+ reps</span>
              </div>
            </div>
          </div>
        );

      case "process":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How do you manage field sales today?</h2>
              <p className="text-muted-foreground">Select the option that best describes your current process</p>
            </div>
            <RadioGroup
              value={answers.currentProcess}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, currentProcess: v }))}
              className="grid gap-4 max-w-2xl mx-auto"
            >
              {processOptions.map((option) => (
                <Label
                  key={option.value}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                    answers.currentProcess === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="mt-1" />
                  <div>
                    <p className="font-medium">{option.label}</p>
                    <p className="text-sm text-muted-foreground">{option.description}</p>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          </div>
        );

      case "challenges":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">What challenges are you facing?</h2>
              <p className="text-muted-foreground">Select all that apply to your organization</p>
            </div>
            <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {challengeOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = answers.challenges.includes(option.value);
                return (
                  <button
                    key={option.value}
                    onClick={() => toggleOption("challenges", option.value)}
                    className={cn(
                      "flex items-start gap-4 p-4 rounded-lg border text-left transition-all",
                      isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </div>
                    {isSelected && <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case "distributor":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Tell us about your distribution network</h2>
              <p className="text-muted-foreground">How many distributors do you work with?</p>
            </div>
            
            <RadioGroup
              value={answers.distributorCount}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, distributorCount: v }))}
              className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {distributorCountOptions.map((option) => (
                <Label
                  key={option.value}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                    answers.distributorCount === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Label>
              ))}
            </RadioGroup>

            {answers.distributorCount && answers.distributorCount !== "none" && (
              <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
                <p className="text-center text-muted-foreground">What distributor management challenges do you face?</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {distributorChallengeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers.distributorChallenges.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleOption("distributorChallenges", option.value)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case "institutional":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Handshake className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Do you have institutional/B2B sales?</h2>
              <p className="text-muted-foreground">Hotels, restaurants, corporates, institutions</p>
            </div>
            
            <RadioGroup
              value={answers.hasInstitutionalSales}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, hasInstitutionalSales: v }))}
              className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {institutionalOptions.map((option) => (
                <Label
                  key={option.value}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                    answers.hasInstitutionalSales === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Label>
              ))}
            </RadioGroup>

            {(answers.hasInstitutionalSales === "yes-active" || answers.hasInstitutionalSales === "yes-limited") && (
              <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
                <p className="text-center text-muted-foreground">What institutional sales challenges do you face?</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  {institutionalChallengeOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = answers.institutionalChallenges.includes(option.value);
                    return (
                      <button
                        key={option.value}
                        onClick={() => toggleOption("institutionalChallenges", option.value)}
                        className={cn(
                          "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                          isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        )}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{option.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );

      case "analytics":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How mature is your analytics capability?</h2>
              <p className="text-muted-foreground">How do you currently track and analyze performance?</p>
            </div>
            
            <RadioGroup
              value={answers.analyticsMaturity}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, analyticsMaturity: v }))}
              className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {analyticsMaturityOptions.map((option) => (
                <Label
                  key={option.value}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                    answers.analyticsMaturity === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Label>
              ))}
            </RadioGroup>

            <div className="space-y-4 max-w-3xl mx-auto">
              <p className="text-center text-muted-foreground">What analytics capabilities would you like?</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {analyticsNeedOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = answers.analyticsNeeds.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleOption("analyticsNeeds", option.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "ai-readiness":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">How ready are you for AI?</h2>
              <p className="text-muted-foreground">What is your current AI adoption status?</p>
            </div>
            
            <RadioGroup
              value={answers.aiAdoption}
              onValueChange={(v) => setAnswers(prev => ({ ...prev, aiAdoption: v }))}
              className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              {aiAdoptionOptions.map((option) => (
                <Label
                  key={option.value}
                  className={cn(
                    "flex flex-col p-4 rounded-lg border cursor-pointer transition-all",
                    answers.aiAdoption === option.value 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <RadioGroupItem value={option.value} className="sr-only" />
                  <p className="font-medium">{option.label}</p>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </Label>
              ))}
            </RadioGroup>

            <div className="space-y-4 max-w-3xl mx-auto">
              <p className="text-center text-muted-foreground">Which AI capabilities interest you?</p>
              <div className="grid sm:grid-cols-2 gap-3">
                {aiInterestOptions.map((option) => {
                  const Icon = option.icon;
                  const isSelected = answers.aiInterest.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() => toggleOption("aiInterest", option.value)}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border text-left transition-all",
                        isSelected ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                      )}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{option.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{option.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "goals":
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">What are your top priorities?</h2>
              <p className="text-muted-foreground">Click in order — your first pick becomes Priority 1, next pick Priority 2, and so on. Click again to remove.</p>
            </div>
            <div className="max-w-3xl mx-auto space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {answers.priorities.length === 0
                    ? "No priorities selected yet"
                    : `${answers.priorities.length} selected — in order`}
                </span>
                {answers.priorities.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAnswers(prev => ({ ...prev, priorities: [], topPriority: "" }))}
                    className="gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Clear all
                  </Button>
                )}
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {priorityOptions.map((option) => {
                  const rank = answers.priorities.indexOf(option.value);
                  const isSelected = rank >= 0;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        setAnswers(prev => {
                          const next = isSelected
                            ? prev.priorities.filter(v => v !== option.value)
                            : [...prev.priorities, option.value];
                          return { ...prev, priorities: next, topPriority: next[0] || "" };
                        });
                      }}
                      className={cn(
                        "relative flex flex-col p-5 rounded-lg border text-left transition-all",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {isSelected && (
                        <span className="absolute top-3 right-3 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                          {rank + 1}
                        </span>
                      )}
                      <p className="font-semibold mb-1 pr-8">{option.label}</p>
                      <p className="text-sm text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case "results":
        return (
          <div className="space-y-8">
            {/* Header */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Your Personalized Assessment</h2>
              <p className="text-muted-foreground">Based on your responses, here&apos;s our analysis</p>
              <div className="mt-4 flex justify-center">
                <Button onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-2">
                  <Download className="w-4 h-4" />
                  {generatingPdf ? "Preparing PDF..." : "Download Full Report (PDF)"}
                </Button>
              </div>
            </div>

            {/* ROI Score */}
            <Card className="p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">ROI Potential Score</h3>
                <span className={cn("text-sm font-medium px-3 py-1 rounded-full", `${scoreLevel.bg}/20 ${scoreLevel.color}`)}>
                  {scoreLevel.label}
                </span>
              </div>
              <div className="flex items-end gap-4 mb-4">
                <span className="text-6xl font-bold text-primary">{score}</span>
                <span className="text-2xl text-muted-foreground mb-2">/100</span>
              </div>
              <Progress value={score} className="h-3" />
              {/* Score explainer */}
              <div className="mt-6 grid sm:grid-cols-2 gap-3 text-xs">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-background/60 border">
                  <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-sm mb-1">What does this score mean?</p>
                    <p className="text-muted-foreground">It estimates how much measurable value QuickApp can unlock for you — based on team size, current process, challenges, distribution, analytics and AI readiness. Higher means more upside.</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-background/60 border space-y-1.5">
                  <p className="font-medium text-sm flex items-center gap-1.5"><HelpCircle className="w-4 h-4 text-primary" /> Score bands</p>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-orange-500" /><span className="text-muted-foreground">0–24 Moderate opportunity</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-yellow-500" /><span className="text-muted-foreground">25–49 Good fit</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500" /><span className="text-muted-foreground">50–74 Significant value</span></div>
                  <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500" /><span className="text-muted-foreground">75–100 High impact</span></div>
                </div>
              </div>
            </Card>

            {/* Current Situation Summary */}
            <Card className="p-6 border-blue-500/20 bg-blue-500/5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-500" />
                Your Current Situation
              </h3>
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Team Size:</span>
                    <span className="font-medium">{situation.teamSize} field reps</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Process:</span>
                    <span className="font-medium">{situation.processLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Distribution:</span>
                    <span className="font-medium">{situation.distributorLabel || "No distributors"}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Institutional Sales:</span>
                    <span className="font-medium">{situation.hasInstitutional ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Analytics Maturity:</span>
                    <span className="font-medium">{situation.analyticsLabel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">AI Adoption:</span>
                    <span className="font-medium">{situation.aiLabel}</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Problem Statement */}
            {problems.length > 0 && (
              <Card className="p-6 border-amber-500/20 bg-amber-500/5">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                  Key Challenges Identified
                </h3>
                <div className="space-y-3">
                  {problems.slice(0, 5).map((problem, idx) => (
                    <div key={idx} className="flex items-start gap-3 p-3 bg-background/50 rounded-lg">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <p className="font-medium text-sm">{problem.area}: {problem.issue}</p>
                        <p className="text-xs text-muted-foreground">{problem.impact}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Our Recommendations */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                Our Recommendations & Approach
              </h3>
              <div className="space-y-4">
                {recommendations.map((rec, idx) => {
                  const Icon = rec.icon;
                  return (
                    <Card key={idx} className="p-5 hover:border-primary/30 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold">{rec.title}</h4>
                            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">{rec.timeline}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Our Approach:</p>
                            {rec.approach.map((step, stepIdx) => (
                              <div key={stepIdx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Tailored Business Benefits */}
            {benefits.length > 0 && (
              <Card className="p-6 border-emerald-500/20 bg-emerald-500/5">
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Business Benefits Tailored to You
                </h3>
                <p className="text-sm text-muted-foreground mb-4">Outcomes we expect based on the responses you provided.</p>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {benefits.map((b, i) => (
                    <div key={i} className="p-4 rounded-lg bg-background/60 border">
                      <p className="text-2xl font-bold text-emerald-600">{b.value}</p>
                      <p className="text-sm font-medium mt-1">{b.metric}</p>
                      <p className="text-xs text-muted-foreground mt-1">{b.rationale}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Step-by-step Implementation Roadmap */}
            <Card className="p-6 border-primary/20">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <Rocket className="w-5 h-5 text-primary" />
                Step-by-Step Implementation Roadmap
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Each phase is mapped to the challenges and goals you shared.</p>
              <div className="relative pl-6 border-l-2 border-primary/20 space-y-6">
                {roadmap.map((p, i) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[34px] top-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h4 className="font-semibold">{p.phase}</h4>
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{p.weeks}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{p.goal}</p>
                    <ul className="mt-2 space-y-1">
                      {p.activities.map((a, j) => (
                        <li key={j} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span>{a}</span>
                        </li>
                      ))}
                    </ul>
                    {p.mappedTo.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="text-xs text-muted-foreground">Addresses:</span>
                        {p.mappedTo.map((m, k) => (
                          <span key={k} className="text-[11px] bg-muted px-2 py-0.5 rounded-full">{m}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {/* Project Plan Snapshot */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Project Plan Snapshot
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs uppercase text-muted-foreground border-b">
                      <th className="py-2 pr-3">Phase</th>
                      <th className="py-2 pr-3">Timeline</th>
                      <th className="py-2">Outcome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roadmap.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="py-2 pr-3 font-medium">{p.phase}</td>
                        <td className="py-2 pr-3 text-muted-foreground">{p.weeks}</td>
                        <td className="py-2 text-muted-foreground">{p.goal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Next Steps */}
            <Card className="p-6 border-blue-500/20 bg-blue-500/5">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                Your Next Steps
              </h3>
              <ol className="space-y-2">
                {nextStepsList.map((s, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="w-6 h-6 rounded-full bg-blue-500/20 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0">{i + 1}</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Contact Us */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-primary" />
                Talk to a QuickApp Expert
              </h3>
              <p className="text-sm text-muted-foreground mb-4">Share your details and we&apos;ll reach out within one business day with a tailored walkthrough.</p>
              <form onSubmit={handleContactSubmit} className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><User className="w-3.5 h-3.5" /> Full name *</Label>
                  <Input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> Company</Label>
                  <Input value={contact.company} onChange={(e) => setContact({ ...contact, company: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Work email *</Label>
                  <Input type="email" value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} required />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Phone</Label>
                  <Input value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">What would you like to discuss?</Label>
                  <Textarea rows={3} value={contact.message} onChange={(e) => setContact({ ...contact, message: e.target.value })} placeholder="Tell us about your team, timelines or specific questions" />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 justify-end">
                  <Button type="button" variant="outline" onClick={handleDownloadPdf} disabled={generatingPdf} className="gap-2">
                    <Download className="w-4 h-4" /> Download Report
                  </Button>
                  <Button type="submit" disabled={submitting} className="gap-2">
                    {submitting ? "Sending..." : "Request Callback"} <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </form>
            </Card>

            {/* CTA */}
            <Card className="p-6 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold">Ready to Get Started?</h3>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {scoreLevel.recommendation === "immediate" && 
                    "Your organization is perfectly positioned for QuickApp. Let's schedule a demo to show you how we can deliver immediate impact."
                  }
                  {scoreLevel.recommendation === "pilot" && 
                    "We recommend starting with a 4-week pilot program with a subset of your team to demonstrate measurable value."
                  }
                  {scoreLevel.recommendation === "explore" && 
                    "Let's have a discovery call to understand your specific needs and create a tailored implementation plan."
                  }
                  {scoreLevel.recommendation === "assess" && 
                    "You have a good foundation. Let's explore how QuickApp's advanced features can take you to the next level."
                  }
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button size="lg" onClick={() => navigate("/demo")} className="gap-2">
                    Schedule a Demo <ArrowRight className="w-4 h-4" />
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => navigate("/pricing")}>
                    View Pricing
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <WebsiteHeader />
      
      {/* Hero */}
      <section className="pt-28 pb-8 px-3 sm:px-4">
        <div className="container mx-auto text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 sm:px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Calculator className="w-4 h-4" />
            ROI Assessment Tool
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            Discover Your <span className="text-primary">ROI Potential</span>
          </h1>
          <p className="text-muted-foreground">
            Answer a few questions to understand how QuickApp can transform your field sales operations
          </p>
        </div>
      </section>

      {/* Progress */}
      <section className="px-4 pb-8">
        <div className="container mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-2 text-sm">
            <span className="text-muted-foreground">Step {currentStepIndex + 1} of {steps.length}</span>
            <span className="font-medium">{steps[currentStepIndex].label}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </section>

      {/* Step Content */}
      <section className="py-8 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-6 md:p-10">
            {renderStep()}
          </Card>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 px-3 sm:px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="flex justify-between">
            <Button
              variant="outline"
              size="lg"
              onClick={prevStep}
              disabled={currentStepIndex === 0}
              className="gap-2 min-w-[160px] h-12 text-base justify-center"
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </Button>
            {currentStep !== "results" ? (
              <Button
                size="lg"
                onClick={nextStep}
                disabled={!canProceed()}
                className="gap-2 min-w-[160px] h-12 text-base justify-center"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => {
                  setCurrentStep("team");
                  setAnswers(initialAnswers);
                }}
                variant="outline"
                className="gap-2 min-w-[160px] h-12 text-base justify-center"
              >
                <Zap className="w-4 h-4" /> Start Over
              </Button>
            )}
          </div>
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
};

export default ROICalculator;
