import { supabase } from "@/integrations/supabase/client";

/**
 * Send invoice notification via WhatsApp (Twilio Sandbox template).
 * Hardcoded recipient: +919741435887
 */
export async function autoSendInvoiceWhatsApp({
  invoiceNumber,
}: {
  invoiceNumber: string;
}): Promise<void> {
  try {
    console.log("📤 Sending invoice WhatsApp for", invoiceNumber);

    const { error } = await supabase.functions.invoke("send-invoice-whatsapp", {
      body: { invoiceNumber },
    });

    if (error) throw error;
    console.log("✅ Invoice WhatsApp sent");
  } catch (err) {
    console.error("⚠️ WhatsApp send failed:", err);
    throw err;
  }
}
