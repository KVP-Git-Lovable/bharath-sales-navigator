import { supabase } from "@/integrations/supabase/client";

/**
 * Auto-send invoice via WhatsApp after PDF generation.
 * Uploads the PDF to storage and invokes the send-invoice-whatsapp edge function.
 * Hardcoded recipient for now: +917338319619
 */
export async function autoSendInvoiceWhatsApp({
  orderId,
  invoiceNumber,
  blob,
}: {
  orderId: string;
  invoiceNumber: string;
  blob: Blob;
}): Promise<void> {
  const HARDCODED_PHONE = "7338319619";

  try {
    const fileName = `invoice-${invoiceNumber}_${Date.now()}.pdf`;

    // Upload PDF to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("invoices")
      .upload(fileName, blob, { contentType: "application/pdf", upsert: true });

    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("invoices").getPublicUrl(uploadData.path);

    console.log("📤 Auto-sending invoice via WhatsApp to", HARDCODED_PHONE);

    const { error } = await supabase.functions.invoke("send-invoice-whatsapp", {
      body: {
        invoiceId: orderId,
        customerPhone: HARDCODED_PHONE,
        pdfUrl: publicUrl,
        invoiceNumber,
      },
    });

    if (error) throw error;
    console.log("✅ Invoice auto-sent via WhatsApp");
  } catch (err) {
    // Don't throw — auto-send failure shouldn't block the user
    console.error("⚠️ Auto-send WhatsApp failed (non-blocking):", err);
  }
}
