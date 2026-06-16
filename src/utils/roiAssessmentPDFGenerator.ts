import { METRIC_GROUPS, ROIMetricsValue } from "@/components/implementation/ROITracker";

export interface ROIAssessmentContact {
  fullName: string;
  email: string;
  phone?: string;
  company?: string;
  companySize?: string;
  industry?: string;
  location?: string;
}

export interface ROIAssessmentPayload {
  contact: ROIAssessmentContact;
  metrics: ROIMetricsValue;
  overallRoi: number;
  assessment: {
    summary: string;
    strengths: string[];
    gaps: string[];
    recommendations: string[];
    quickWins: string[];
  };
}

const fmt = (n: number | undefined | null) =>
  n == null || isNaN(n as number) ? "-" : Number(n).toLocaleString("en-IN");

export async function generateROIAssessmentPDF(p: ROIAssessmentPayload) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // Cover band
  doc.setFillColor(26, 31, 44);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("ROI Assessment Report", margin, 50);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(245, 158, 11);
  doc.text("Powered by QuickApp.ai", margin, 72);
  doc.setTextColor(220, 220, 220);
  doc.text(new Date().toLocaleString(), margin, 90);
  y = 130;

  doc.setTextColor(0, 0, 0);

  // Contact block
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Prepared for", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const c = p.contact;
  [
    `${c.fullName}${c.company ? `, ${c.company}` : ""}`,
    [c.email, c.phone].filter(Boolean).join(" · "),
    [c.industry, c.companySize ? `Team: ${c.companySize}` : null, c.location]
      .filter(Boolean)
      .join(" · "),
  ]
    .filter(Boolean)
    .forEach((line) => {
      doc.text(line as string, margin, y);
      y += 14;
    });

  y += 10;

  // Overall ROI box
  ensureSpace(70);
  doc.setFillColor(245, 158, 11);
  doc.roundedRect(margin, y, pageW - margin * 2, 56, 6, 6, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(`Overall ROI Achievement: ${p.overallRoi}%`, margin + 16, y + 36);
  y += 76;
  doc.setTextColor(0, 0, 0);

  // Assessment summary
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("AI Assessment Summary", margin, y);
  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const sumLines = doc.splitTextToSize(p.assessment.summary || "-", pageW - margin * 2);
  ensureSpace(sumLines.length * 12 + 4);
  doc.text(sumLines, margin, y);
  y += sumLines.length * 12 + 10;

  const section = (title: string, items: string[]) => {
    if (!items?.length) return;
    ensureSpace(24);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11);
    doc.text(title, margin, y);
    y += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    items.forEach((it) => {
      const lines = doc.splitTextToSize(`• ${it}`, pageW - margin * 2 - 10);
      ensureSpace(lines.length * 12 + 2);
      doc.text(lines, margin + 6, y);
      y += lines.length * 12 + 2;
    });
    y += 6;
  };

  section("Key Strengths", p.assessment.strengths);
  section("Gaps & Risks", p.assessment.gaps);
  section("Recommendations", p.assessment.recommendations);
  section("Quick Wins (Next 30 Days)", p.assessment.quickWins);

  // Metrics tables grouped
  doc.addPage();
  y = margin;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("Metric Detail", margin, y);
  y += 20;

  METRIC_GROUPS.forEach((group) => {
    ensureSpace(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(245, 158, 11);
    doc.text(group.title, margin, y);
    y += 14;
    doc.setTextColor(0, 0, 0);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const col = [margin, margin + 220, margin + 300, margin + 380, margin + 460];
    doc.text("Metric", col[0], y);
    doc.text("Baseline", col[1], y);
    doc.text("Target", col[2], y);
    doc.text("Actual", col[3], y);
    doc.text("Unit", col[4], y);
    y += 4;
    doc.setDrawColor(220, 220, 220);
    doc.line(margin, y, pageW - margin, y);
    y += 10;
    doc.setFont("helvetica", "normal");
    group.metrics.forEach((m) => {
      ensureSpace(14);
      const label = doc.splitTextToSize(m.label, 210);
      doc.text(label, col[0], y);
      doc.text(fmt(p.metrics.baseline?.[m.id]), col[1], y);
      doc.text(fmt(p.metrics.target?.[m.id]), col[2], y);
      doc.text(fmt(p.metrics.actual?.[m.id]), col[3], y);
      doc.text(m.unit, col[4], y);
      y += Math.max(12, label.length * 11);
    });
    y += 10;
  });

  // Footer
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(
      `Generated by QuickApp.ai ROI Tracker · Page ${i} of ${total}`,
      pageW / 2,
      pageH - 14,
      { align: "center" },
    );
  }

  const name = (c.company || c.fullName || "ROI").replace(/[^a-z0-9-]+/gi, "-");
  doc.save(`QuickApp-ROI-Assessment-${name}.pdf`);
}