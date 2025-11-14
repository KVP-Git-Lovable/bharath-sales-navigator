interface InvoicePreviewProps {
  company: any;
  retailer: any;
  cartItems: any[];
  orderId?: string;
  templateStyle: "template1" | "template2" | "template3" | "template4";
}
export default function InvoicePreview({
  company,
  retailer,
  cartItems,
  orderId = "INV001",
  templateStyle
}: InvoicePreviewProps) {
  // Unit conversion helper
  const normalizeUnit = (u?: string) => (u || "").toLowerCase().replace(/\./g, "").trim();
  
  const getDisplayRate = (item: any) => {
    const baseRate = Number(item.rate || item.price) || 0;
    const baseUnit = normalizeUnit(item.base_unit || item.unit);
    const targetUnit = normalizeUnit(item.unit);
    if (!baseUnit || !item.base_unit) return baseRate;

    // KG ↔ Gram conversions
    if (baseUnit === "kg" || baseUnit === "kilogram" || baseUnit === "kilograms") {
      if (["gram", "grams", "g", "gm"].includes(targetUnit)) return baseRate / 1000;
      if (targetUnit === "kg") return baseRate;
    } else if (["g", "gm", "gram", "grams"].includes(baseUnit)) {
      if (targetUnit === "kg") return baseRate * 1000;
      if (["g", "gm", "gram", "grams"].includes(targetUnit)) return baseRate;
    }
    return baseRate;
  };

  // Get display name - show only variant name if it's a variant, or base product name
  const getDisplayName = (item: any) => {
    const fullName = item.product_name || item.name || "";
    // Check if this is a variant (contains " - ")
    if (fullName.includes(" - ")) {
      const parts = fullName.split(" - ");
      const variantPart = parts[1];
      // If variant is "Base variant", show only the base product name
      if (variantPart.toLowerCase() === "base variant") {
        return parts[0];
      }
      // Otherwise show only the variant name
      return variantPart;
    }
    // If no variant, return the full name
    return fullName;
  };

  const subtotal = cartItems.reduce((sum, item) => {
    const displayRate = getDisplayRate(item);
    return sum + (item.quantity || 0) * displayRate;
  }, 0);
  const cgst = subtotal * 0.025;
  const sgst = subtotal * 0.025;
  const total = subtotal + cgst + sgst;
  const getStyleClasses = () => {
    switch (templateStyle) {
      case "template1":
        return {
          container: "border-2 border-blue-200 bg-gradient-to-br from-blue-50/30 to-white text-black",
          header: "bg-gradient-to-r from-blue-400 to-cyan-400 text-white",
          tableHeader: "bg-gradient-to-r from-blue-400 to-cyan-400 text-white",
          totalBox: "bg-gradient-to-r from-blue-400 to-cyan-400 text-white"
        };
      case "template2":
        return {
          container: "border-2 border-purple-200 bg-gradient-to-br from-purple-50/30 to-white text-black",
          header: "bg-gradient-to-r from-purple-400 to-pink-400 text-white",
          tableHeader: "bg-gradient-to-r from-purple-400 to-pink-400 text-white",
          totalBox: "bg-gradient-to-r from-purple-400 to-pink-400 text-white"
        };
      case "template3":
        return {
          container: "bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-gray-800 text-white",
          totalBox: "bg-gray-800 text-white"
        };
      case "template4":
        return {
          container: "bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-green-600 text-white",
          totalBox: "bg-green-600 text-white"
        };
      default:
        return {
          container: "border border-gray-300 bg-white text-black",
          header: "bg-gray-800 text-white",
          tableHeader: "bg-gray-600 text-white",
          totalBox: "bg-gray-600 text-white"
        };
    }
  };
  const styles = getStyleClasses();
  return <div className={`p-6 rounded-lg ${styles.container} max-w-4xl mx-auto text-sm`}>
      {/* Header */}
      <div className={`${styles.header} p-4 rounded-t-lg flex justify-between items-center mb-6`}>
        <div className="flex items-center gap-4">
          {company.logo_url && <img src={company.logo_url} alt="Company Logo" className="w-28 h-28 object-contain" />}
          <div>
            <h1 className="text-lg font-bold">{company.name || "COMPANY NAME"}</h1>
            <p className="text-xs opacity-90 max-w-md leading-tight">{company.address}</p>
            {company.contact_phone && <p className="text-xs">Tel: {company.contact_phone}</p>}
            {company.email && <p className="text-xs">Email: {company.email}</p>}
            {company.gstin && <p className="text-xs">GSTIN: {company.gstin}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">INVOICE</h2>
        </div>
      </div>

      {/* Bill To & Invoice Details */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <h3 className="font-bold text-xs mb-2">BILL TO</h3>
          <p className="text-blue-600 font-semibold">{retailer.name || "Customer Name"}</p>
          <p className="text-xs">{retailer.address}</p>
          {retailer.phone && <p className="text-xs">Phone: {retailer.phone}</p>}
          {retailer.gst_number && <p className="text-xs">GSTIN: {retailer.gst_number}</p>}
        </div>
        <div className="text-right">
          <div className="mb-2">
            <span className="font-bold text-xs">INVOICE #:</span>{" "}
            <span className="text-xs">{orderId.slice(0, 8).toUpperCase()}</span>
          </div>
          <div>
            <span className="font-bold text-xs">DATE:</span>{" "}
            <span className="text-xs">{new Date().toLocaleDateString("en-GB")}</span>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="mb-6">
        <table className="w-full border-collapse">
          <thead>
            <tr className={styles.tableHeader}>
              <th className="border border-gray-300 p-2 text-center text-xs">NO</th>
              <th className="border border-gray-300 p-2 text-left text-xs">PRODUCT</th>
              <th className="border border-gray-300 p-2 text-center text-xs">HSN/SAC</th>
              <th className="border border-gray-300 p-2 text-center text-xs">UNIT</th>
              <th className="border border-gray-300 p-2 text-center text-xs">QTY</th>
              <th className="border border-gray-300 p-2 text-right text-xs">PRICE</th>
              <th className="border border-gray-300 p-2 text-right text-xs">TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {cartItems.map((item, index) => {
              const displayRate = getDisplayRate(item);
              const itemTotal = (item.quantity || 0) * displayRate;
              return (
                <tr key={index} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="border border-gray-300 p-2 text-center text-xs">{index + 1}</td>
                  <td className="border border-gray-300 p-2 text-xs">{getDisplayName(item)}</td>
                  <td className="border border-gray-300 p-2 text-center text-xs">{item.hsn_code || "-"}</td>
                  <td className="border border-gray-300 p-2 text-center text-xs">{item.unit || "Piece"}</td>
                  <td className="border border-gray-300 p-2 text-center text-xs">{item.quantity}</td>
                  <td className="border border-gray-300 p-2 text-right text-xs">
                    ₹{displayRate.toFixed(2)}
                  </td>
                  <td className="border border-gray-300 p-2 text-right text-xs">
                    ₹{itemTotal.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Totals Section */}
      <div className="flex justify-end mb-8">
        <div className="w-64">
          <div className="flex justify-between mb-2">
            <span className="font-bold text-xs">SUB-TOTAL</span>
            <span className="text-xs">₹{subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="font-bold text-xs">SGST (2.5%)</span>
            <span className="text-xs">₹{sgst.toFixed(2)}</span>
          </div>
          <div className="flex justify-between mb-3">
            <span className="font-bold text-xs">CGST (2.5%)</span>
            <span className="text-xs">₹{cgst.toFixed(2)}</span>
          </div>
          <div className={`${styles.totalBox} p-2 rounded flex justify-between`}>
            <span className="font-bold text-sm">Total</span>
            <span className="font-bold text-sm">₹{total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bank Details and QR Code */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Bank Details */}
        <div>
          <h3 className="font-bold text-xs mb-2">BANK DETAILS</h3>
          <div className="text-xs space-y-1">
            {company.bank_name && <p>Bank: {company.bank_name}</p>}
            {company.account_holder_name && <p>Account Holder: {company.account_holder_name}</p>}
            {company.bank_account && <p>Account Number: {company.bank_account}</p>}
            {company.ifsc && <p>IFSC: {company.ifsc}</p>}
            {company.qr_upi && <p>UPI ID: {company.qr_upi}</p>}
          </div>
        </div>
        
        {/* QR Code for Payment */}
        {company.qr_code_url && (
          <div className="flex flex-col items-center justify-center border-2 border-primary/20 rounded-lg p-4 bg-primary/5">
            <p className="text-sm font-bold mb-3 text-primary">Scan QR for Payment</p>
            <img 
              src={company.qr_code_url} 
              alt="Payment QR Code" 
              className="w-32 h-32 object-contain border-2 border-primary rounded-lg shadow-md" 
            />
            {company.qr_upi && (
              <p className="text-xs text-muted-foreground mt-2">UPI: {company.qr_upi}</p>
            )}
          </div>
        )}
      </div>

      {/* Signature */}
      <div className="flex justify-end mb-6">
        <div className="text-right">
          <p className="text-xs font-bold mb-1">For {company.name || "Company"}</p>
          <div className="mt-8 pt-4 border-t border-gray-400">
            <p className="text-xs italic">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Terms */}
      {company.terms_conditions && company.terms_conditions.trim() && (
        <div className="mb-4">
          <h3 className="font-bold text-xs mb-2">TERMS AND CONDITIONS</h3>
          <p className="text-xs text-blue-600">
            {company.terms_conditions}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className={`${styles.header} p-3 rounded-b-lg text-center mt-6`}>
        <p className="text-xl font-bold mb-2">THANK YOU FOR YOUR BUSINESS</p>
        
      </div>
    </div>;
}