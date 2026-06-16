import { supabase } from "@/integrations/supabase/client";

export type LeadType = "contact_request" | "demo_request" | "roi_callback_request";

export interface UtmCapture {
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  referrer: string | null;
}

export function captureUtm(): UtmCapture {
  if (typeof window === "undefined") {
    return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null };
  }
  try {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get("utm_source"),
      utm_medium: params.get("utm_medium"),
      utm_campaign: params.get("utm_campaign"),
      referrer: document.referrer || null,
    };
  } catch {
    return { utm_source: null, utm_medium: null, utm_campaign: null, referrer: null };
  }
}

export interface WebsiteLeadInput {
  lead_type: LeadType;
  lead_sub_type?: string | null;
  source_page?: string | null;
  form_origin?: string | null;
  full_name: string;
  email: string;
  phone?: string | null;
  company?: string | null;
  job_title?: string | null;
  team_size?: string | null;
  industry?: string | null;
  location?: string | null;
  message?: string | null;
  metadata?: Record<string, unknown>;
}

export async function insertWebsiteLead(input: WebsiteLeadInput) {
  const utm = captureUtm();
  const payload = {
    ...input,
    metadata: input.metadata ?? {},
    ...utm,
  };
  const { data, error } = await supabase
    .from("website_leads")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[websiteLeads] insert failed", error);
  }
  return { data, error };
}

export interface RoiEntryInput {
  full_name?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  company_size?: string | null;
  industry?: string | null;
  location?: string | null;
  submission_data: Record<string, unknown>;
  calculated_results?: Record<string, unknown>;
  roi_summary?: Record<string, unknown>;
}

export async function insertRoiEntry(input: RoiEntryInput) {
  const utm = captureUtm();
  const payload = {
    ...input,
    calculated_results: input.calculated_results ?? {},
    roi_summary: input.roi_summary ?? {},
    source_page: "/roi-calculator",
    ...utm,
  };
  const { data, error } = await supabase
    .from("roi_calculator_entries")
    .insert(payload)
    .select("id")
    .single();
  if (error) {
    console.error("[websiteLeads] ROI insert failed", error);
  }
  return { data, error };
}