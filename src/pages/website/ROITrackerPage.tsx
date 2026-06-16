import { useState } from "react";
import { ArrowLeft, Download, Sparkles, ShieldCheck, TrendingUp, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { ROITracker, METRIC_GROUPS, ROIMetricsValue } from "@/components/implementation/ROITracker";
import { useToast } from "@/hooks/use-toast";
import { insertRoiEntry } from "@/lib/websiteLeads";
import { supabase } from "@/integrations/supabase/client";
import { generateROIAssessmentPDF } from "@/utils/roiAssessmentPDFGenerator";

interface Contact {
  fullName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  companySize: string;
  industry: string;
  location: string;
  notes: string;
}

const defaultContact: Contact = {
  fullName: "",
  email: "",
  phone: "",
  company: "",
  jobTitle: "",
  companySize: "",
  industry: "",
  location: "",
  notes: "",
};

const computeOverallRoi = (m: ROIMetricsValue) => {
  let groupSum = 0;
  let groupsCounted = 0;
  METRIC_GROUPS.forEach((g) => {
    const filled = g.metrics.filter(
      (mm) =>
        m.baseline?.[mm.id] != null &&
        m.target?.[mm.id] != null &&
        m.actual?.[mm.id] != null,
    );
    if (!filled.length) return;
    const avg =
      filled.reduce((sum, mm) => {
        const base = m.baseline[mm.id] || 0;
        const tgt = m.target[mm.id] || 0;
        const act = m.actual[mm.id] || 0;
        if (tgt === base) return sum;
        if (mm.lowerIsBetter) {
          const imp = base - act;
          const tImp = base - tgt;
          return sum + (tImp > 0 ? Math.min(100, (imp / tImp) * 100) : 0);
        }
        const imp = act - base;
        const tImp = tgt - base;
        return sum + (tImp > 0 ? Math.min(100, (imp / tImp) * 100) : 0);
      }, 0) / filled.length;
    groupSum += avg;
    groupsCounted += 1;
  });
  return groupsCounted > 0 ? Math.round(groupSum / groupsCounted) : 0;
};

export default function ROITrackerPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState<"contact" | "track">("contact");
  const [contact, setContact] = useState<Contact>(defaultContact);
  const [metrics, setMetrics] = useState<ROIMetricsValue>({ baseline: {}, target: {}, actual: {} });
  const [busy, setBusy] = useState(false);

  const proceed = () => {
    if (!contact.fullName.trim() || !contact.email.trim() || !contact.company.trim()) {
      toast({
        title: "Required",
        description: "Name, work email and company are required to start the ROI assessment.",
        variant: "destructive",
      });
      return;
    }
    setStep("track");
    setTimeout(() => window.scrollTo({ top: 0, behavior: "smooth" }), 0);
  };

  const handleGenerate = async () => {
    const overallRoi = computeOverallRoi(metrics);
    setBusy(true);
    try {
      // Build metric detail for AI + persistence
      const metricsDetail = METRIC_GROUPS.flatMap((g) =>
        g.metrics.map((m) => ({
          group: g.title,
          id: m.id,
          label: m.label,
          unit: m.unit,
          baseline: metrics.baseline?.[m.id] ?? null,
          target: metrics.target?.[m.id] ?? null,
          actual: metrics.actual?.[m.id] ?? null,
        })),
      );

      // Call AI assessment
      let assessment = {
        summary: "Assessment unavailable.",
        strengths: [] as string[],
        gaps: [] as string[],
        recommendations: [] as string[],
        quickWins: [] as string[],
      };
      try {
        const { data, error } = await supabase.functions.invoke("roi-tracker-assessment", {
          body: { contact, metrics, overallRoi, metricsDetail },
        });
        if (error) throw error;
        if (data?.assessment) assessment = { ...assessment, ...data.assessment };
      } catch (err: any) {
        console.error("AI assessment failed", err);
        toast({
          title: "AI assessment unavailable",
          description: "We'll still generate your PDF with the metric data.",
          variant: "destructive",
        });
      }

      // Persist to backend
      const { error: insertErr } = await insertRoiEntry({
        full_name: contact.fullName,
        company: contact.company,
        email: contact.email,
        phone: contact.phone || null,
        company_size: contact.companySize || null,
        industry: contact.industry || null,
        location: contact.location || null,
        submission_data: {
          source: "standalone-roi-tracker",
          contact,
          metrics,
          metricsDetail,
        },
        calculated_results: { overallRoi },
        roi_summary: { assessment },
      });
      if (insertErr) {
        console.error("ROI insert failed", insertErr);
      }

      // Generate PDF
      await generateROIAssessmentPDF({
        contact: {
          fullName: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          companySize: contact.companySize,
          industry: contact.industry,
          location: contact.location,
        },
        metrics,
        overallRoi,
        assessment,
      });

      toast({
        title: "Report ready",
        description: "Your ROI assessment PDF has been downloaded.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] via-[#1A1F2C] to-[#0F1218]">
      <WebsiteHeader />

      <section className="pt-8 pb-4 px-3 sm:px-4">
        <div className="container mx-auto max-w-5xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/insights")}
            className="text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Insights
          </Button>
          <div className="flex items-start gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white">
                ROI{" "}
                <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Tracker
                </span>
              </h1>
              <p className="text-white/70 max-w-2xl">
                Benchmark baseline vs target vs actuals across financials, coverage, field discipline
                and productivity. Get an AI assessment and a branded PDF you can share with your team.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-5xl">
          {step === "contact" ? (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  Your details
                </CardTitle>
                <p className="text-white/60 text-sm">
                  We use these to personalise your AI assessment and save your report for follow-up.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Full Name *" v={contact.fullName} set={(v) => setContact({ ...contact, fullName: v })} />
                  <Field label="Work Email *" type="email" v={contact.email} set={(v) => setContact({ ...contact, email: v })} />
                  <Field label="Phone" v={contact.phone} set={(v) => setContact({ ...contact, phone: v })} />
                  <Field label="Company *" v={contact.company} set={(v) => setContact({ ...contact, company: v })} />
                  <Field label="Job Title" v={contact.jobTitle} set={(v) => setContact({ ...contact, jobTitle: v })} />
                  <Field label="Team Size" v={contact.companySize} set={(v) => setContact({ ...contact, companySize: v })} placeholder="e.g. 25 reps" />
                  <Field label="Industry" v={contact.industry} set={(v) => setContact({ ...contact, industry: v })} placeholder="FMCG, Beverages, Pharma…" />
                  <Field label="Location" v={contact.location} set={(v) => setContact({ ...contact, location: v })} placeholder="City / Country" />
                </div>
                <div>
                  <Label className="text-white/80 text-sm">Anything we should know? (optional)</Label>
                  <Textarea
                    value={contact.notes}
                    onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                    placeholder="Current pain points, current tools, timeline…"
                    className="bg-white/5 border-white/20 text-white mt-1"
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={proceed}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  >
                    Start ROI Analysis
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-white/60 text-sm">
                  Signed in as <span className="text-white">{contact.fullName}</span> ·{" "}
                  {contact.company}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep("contact")}
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10"
                >
                  Edit details
                </Button>
              </div>

              <ROITracker value={metrics} onChange={setMetrics} />

              <Card className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-amber-500/30">
                <CardContent className="pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-6 h-6 text-amber-400 mt-1" />
                    <div>
                      <p className="text-white font-semibold">Get your AI-powered assessment</p>
                      <p className="text-white/60 text-sm">
                        We'll save this analysis, score your ROI achievement and download a branded PDF
                        with specific recommendations.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleGenerate}
                    disabled={busy}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
                  >
                    {busy ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating…
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Generate AI Assessment & PDF
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </section>

      <WebsiteFooter />
    </div>
  );
}

function Field({
  label,
  v,
  set,
  type = "text",
  placeholder,
}: {
  label: string;
  v: string;
  set: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <Label className="text-white/80 text-sm">{label}</Label>
      <Input
        type={type}
        value={v}
        onChange={(e) => set(e.target.value)}
        placeholder={placeholder}
        className="bg-white/5 border-white/20 text-white mt-1"
      />
    </div>
  );
}