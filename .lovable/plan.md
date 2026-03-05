

## Invoice System — Offline Compatibility Analysis

### Current State: Invoice Generation Already Works Offline

The `fetchAndGenerateInvoice()` function (lines 822-1184 of `invoiceGenerator.ts`) already has comprehensive offline support:

1. **Order data**: Falls back to IndexedDB `STORES.ORDERS` if DB query returns null (lines 962-978)
2. **Company data**: Falls back to `STORES.SYNC_METADATA` cache (lines 998-1011)
3. **Retailer data**: Falls back to `STORES.RETAILERS` cache (lines 1028-1031)
4. **Beat name**: Falls back to `STORES.BEAT_PLANS` cache (lines 1050-1053)
5. **Salesman name**: Falls back to `STORES.SYNC_METADATA` profile cache (lines 1070-1073)
6. **HSN enrichment**: Skipped when offline — `navigator.onLine` check at line 1087

### The One Issue: Invoice Number for Offline Orders

When an order is placed offline, the `invoice_number` column is assigned server-side by the `set_order_invoice_number` trigger on INSERT. Since the order hasn't been inserted into Supabase yet, the offline cached order has **no invoice_number**.

The fallback at line 1142 handles this:
```typescript
const displayInvoiceNumber = order.invoice_number || `INV-${order.id.substring(0, 8).toUpperCase()}`;
```

So offline invoices get a **temporary** number like `INV-A3F2B1C4` instead of the proper `INV2026-XXX`. This is expected and acceptable — the real invoice number is assigned on sync.

### Potential Duplicate Invoice Risk

The unique constraint on `orders.invoice_number` was **dropped** in migration `20260212` to prevent order creation failures. This means duplicates are technically possible if the sequence gets out of sync, but this is a deliberate trade-off for reliability.

### What's Already Working
- Offline order → invoice PDF generation ✅
- Offline order → WhatsApp/SMS queued via `SEND_INVOICE_SMS` sync queue ✅
- Multi-device orders → unique UUIDs prevent data loss ✅
- Invoice from cached data when DB unreachable ✅

### No Code Changes Needed

The invoicing system is already fully compatible with offline order placement. The only behavioral difference is the temporary invoice number format (`INV-XXXXXXXX` vs `INV2026-XXX`), which auto-corrects once the order syncs to the database.

**Summary**: You can safely place orders offline and generate invoices immediately. The invoice will use cached local data for all fields. The invoice number will be a temporary ID until sync completes, at which point the server assigns the real sequential number.

