import { supabase } from "@/integrations/supabase/client";

/**
 * Send invoice notification via WhatsApp.
 */
export async function autoSendInvoiceWhatsApp({
  invoiceNumber,
  pdfUrl,
  customerPhone,
}: {
  invoiceNumber: string;
  pdfUrl?: string;
  customerPhone?: string | null;
}): Promise<void> {
  try {
    if (!customerPhone) {
      throw new Error("No WhatsApp number available for this retailer");
    }

    console.log("📤 Sending invoice WhatsApp for", invoiceNumber);

    const { error } = await supabase.functions.invoke("send-invoice-whatsapp", {
      body: { invoiceNumber, pdfUrl, customerPhone },
    });

    if (error) throw error;
    console.log("✅ Invoice WhatsApp sent");
  } catch (err) {
    console.error("⚠️ WhatsApp send failed:", err);
    throw err;
  }
}
