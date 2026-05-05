import { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Save,
  Lock,
  ArrowLeft,
  Search,
  FileText,
  Pencil,
  Loader2,
  User,
  Phone,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useOfflineOrderEntry } from "@/hooks/useOfflineOrderEntry";
import { submitOrderWithOfflineSupport } from "@/utils/offlineOrderUtils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------- types ----------
interface CounterCustomer {
  id: string;
  name: string;
  phone?: string | null;
}

// ===================================================================
// MOBILE CUSTOMER CARD — accordion-style, bottom-sheet pickers
// ===================================================================
function MobileCustomerCard({
  index,
  row,
  products,
  customers,
  submitting,
  onToggleExpand,
  onPickCustomer,
  onCreateRetailer,
  onAddItemRow,
  onUpdateItem,
  onRemoveItem,
  onSave,
  onSubmit,
  onEdit,
  onDelete,
}: {
  index: number;
  row: CounterRow;
  products: any[];
  customers: CounterCustomer[];
  submitting?: boolean;
  onToggleExpand: () => void;
  onPickCustomer: (r: CounterCustomer) => void;
  onCreateRetailer: (r: CounterCustomer) => void;
  onAddItemRow: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<CounterLineItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const locked = row.status === "saved" || row.status === "submitted";
  const total = rowAmount(row);

  return (
    <Card className="rounded-2xl shadow-sm border overflow-hidden">
      {/* COLLAPSED HEADER — tappable */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full flex items-center gap-3 px-3 py-3 text-left active:bg-muted/40 transition-colors"
      >
        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center shrink-0">
          {index}
        </div>
        <div className="min-w-0 flex-1">
          {row.customer ? (
            <>
              <div className="text-sm font-semibold truncate">{row.customer.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {row.phoneOverride || row.customer.phone || "—"}
              </div>
            </>
          ) : (
            <>
              <div className="text-sm font-medium text-primary">Select Customer</div>
              <div className="text-xs text-muted-foreground">Tap to choose or create</div>
            </>
          )}
        </div>
        <div className="flex flex-col items-end gap-0.5 shrink-0">
          <div className="text-[11px] text-muted-foreground">
            {row.items.length} item{row.items.length !== 1 ? "s" : ""}
          </div>
          <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
            ₹{total.toFixed(2)}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            row.expanded && "rotate-180"
          )}
        />
      </button>

      {/* EXPANDED BODY */}
      {row.expanded && (
        <div className="px-3 pb-3 pt-1 border-t bg-muted/10 space-y-3">
          {/* Customer selector tile if not yet picked, or change link */}
          {!row.customer ? (
            <Button
              variant="outline"
              className="w-full rounded-xl h-10 justify-start"
              onClick={() => setPickerOpen(true)}
              disabled={locked}
            >
              <User className="h-4 w-4 mr-2" /> Select Customer
            </Button>
          ) : (
            <div className="flex items-center justify-between rounded-xl bg-background border px-3 py-2">
              <div className="min-w-0">
                <div className="text-xs text-muted-foreground">Customer</div>
                <div className="text-sm font-medium truncate">{row.customer.name}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {row.phoneOverride || row.customer.phone || "—"}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-primary"
                onClick={() => setPickerOpen(true)}
                disabled={locked}
              >
                Change
              </Button>
            </div>
          )}

          {/* Products */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1">
              Products ({row.items.length})
            </div>

            {row.items.length === 0 ? (
              <div className="rounded-xl bg-background border border-dashed py-6 text-center text-xs text-muted-foreground">
                No products yet
              </div>
            ) : (
              row.items.map((item) => (
                <div
                  key={item.uid}
                  className="rounded-xl bg-background border p-3 space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <InlineProductSelect
                        value={item}
                        products={products}
                        disabled={locked}
                        onPick={(p) =>
                          onUpdateItem(item.uid, {
                            product_id: p.id,
                            product_name: p.name,
                            category: p.category?.name || null,
                            sku: p.sku || null,
                            unit: p.unit || "Unit",
                            rate: Number(p.rate) || 0,
                          })
                        }
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive shrink-0"
                      disabled={locked || row.items.length === 1}
                      onClick={() => onRemoveItem(item.uid)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={item.quantity}
                        disabled={locked}
                        onChange={(e) =>
                          onUpdateItem(item.uid, { quantity: Number(e.target.value) || 0 })
                        }
                        className="h-8 text-sm px-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Unit</label>
                      <Select
                        value={item.unit}
                        disabled={locked}
                        onValueChange={(v) => onUpdateItem(item.uid, { unit: v })}
                      >
                        <SelectTrigger className="h-8 text-sm px-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from(new Set([item.unit, ...UOM_OPTIONS])).map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Price</label>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
                        inputMode="decimal"
                        value={item.rate}
                        disabled={locked}
                        onChange={(e) =>
                          onUpdateItem(item.uid, { rate: Number(e.target.value) || 0 })
                        }
                        className="h-8 text-sm px-2"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground">Amount</label>
                      <div className="h-8 flex items-center text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        ₹{(item.product_id ? itemAmount(item) : 0).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <Button
            variant="outline"
            onClick={onAddItemRow}
            disabled={locked}
            className="w-full rounded-xl h-10 border-dashed text-primary"
          >
            <Plus className="h-4 w-4 mr-1" /> Add Row
          </Button>

          <Button
            variant="ghost"
            onClick={onDelete}
            disabled={row.status === "submitted"}
            className="w-full rounded-xl h-10 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-1" /> Delete Row
          </Button>

          {/* Save / Submit actions */}
          {row.status === "submitted" ? (
            <Badge className="w-full justify-center bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15 h-10 rounded-xl">
              Submitted
            </Badge>
          ) : row.status === "saved" ? (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onEdit} className="flex-1 rounded-xl h-10">
                <Pencil className="h-4 w-4 mr-1" /> Edit
              </Button>
              <Button onClick={onSubmit} disabled={submitting} className="flex-1 rounded-xl h-10">
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Submit
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={onSave} className="flex-1 rounded-xl h-10">
                <Save className="h-4 w-4 mr-1" /> Save
              </Button>
              <Button onClick={onSubmit} disabled={submitting} className="flex-1 rounded-xl h-10">
                {submitting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Submit
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Customer picker bottom sheet */}
      <CustomerPickerDrawer
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        customers={customers}
        onPick={(c) => {
          onPickCustomer(c);
          setPickerOpen(false);
        }}
        onCreated={(c) => {
          onCreateRetailer(c);
          onPickCustomer(c);
          setPickerOpen(false);
        }}
      />
    </Card>
  );
}

// ===================================================================
// CUSTOMER PICKER — bottom sheet with search + inline create
// ===================================================================
function CustomerPickerDrawer({
  open,
  onOpenChange,
  customers,
  onPick,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customers: CounterCustomer[];
  onPick: (r: CounterCustomer) => void;
  onCreated: (r: CounterCustomer) => void;
}) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setMode("search");
      setNewName("");
      setNewPhone("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 100);
    return customers
      .filter(
        (r) =>
          r.name?.toLowerCase().includes(q) || r.phone?.toLowerCase().includes(q)
      )
      .slice(0, 100);
  }, [customers, search]);

  const handleCreate = async () => {
    const name = newName.trim();
    const ph = newPhone.trim();
    if (!name) return toast.error("Customer name is required");
    if (!ph) return toast.error("Phone number is required");
    const dup = customers.find((r) => (r.phone || "").trim() === ph);
    if (dup) {
      toast.error("Customer already exists. Selecting it instead.");
      onPick(dup);
      return;
    }
    if (!user) return toast.error("You must be signed in");
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("counter_customers")
        .insert({ name, phone: ph, user_id: user.id })
        .select("id,name,phone")
        .single();
      if (error) throw error;
      onCreated({ id: data.id, name: data.name, phone: data.phone });
      toast.success("Customer created");
    } catch (e: any) {
      toast.error(e?.message || "Could not create customer");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-left">
          <DrawerTitle>
            {mode === "search" ? "Select Customer" : "New Customer"}
          </DrawerTitle>
        </DrawerHeader>

        {mode === "search" ? (
          <div className="px-4 pb-2 flex flex-col min-h-0">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-10 pl-8 rounded-xl"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto rounded-xl border divide-y max-h-[45vh]">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">
                  No customers found
                </div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onPick(r)}
                    className="w-full text-left px-3 py-3 hover:bg-muted/50 active:bg-muted"
                  >
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone || "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
            <Button
              variant="outline"
              className="w-full mt-3 rounded-xl h-11 text-primary border-dashed"
              onClick={() => {
                setNewName(search);
                setMode("create");
              }}
            >
              <Plus className="h-4 w-4 mr-1" /> Create New Customer
            </Button>
          </div>
        ) : (
          <div className="px-4 pb-2 space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="Customer name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone *</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-10 rounded-xl"
                placeholder="10-digit number"
                inputMode="tel"
              />
            </div>
          </div>
        )}

        <DrawerFooter className="pt-2">
          {mode === "create" ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl h-11"
                onClick={() => setMode("search")}
                disabled={saving}
              >
                Back
              </Button>
              <Button
                className="flex-1 rounded-xl h-11"
                onClick={handleCreate}
                disabled={saving}
              >
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                Done
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full rounded-xl h-11"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          )}
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

interface CounterLineItem {
  uid: string; // local row id
  product_id: string;
  product_name: string;
  category?: string | null;
  sku?: string | null;
  unit: string;
  quantity: number;
  rate: number;
  discount: number;
  tax_rate: number;
}

type RowStatus = "draft" | "saved" | "submitted";

interface CounterRow {
  uid: string;
  customer: CounterCustomer | null;
  phoneOverride?: string;
  items: CounterLineItem[];
  status: RowStatus;
  expanded: boolean;
}

const DRAFT_KEY = "counter_sales_draft_v1";
const UOM_OPTIONS = ["Pcs", "Box", "Bag", "Kg", "Ltr", "Pkt", "Carton", "Dozen"];
const TAX_OPTIONS = [0, 5, 12, 18, 28];

const newItem = (): CounterLineItem => ({
  uid: crypto.randomUUID(),
  product_id: "",
  product_name: "",
  category: null,
  sku: null,
  unit: "Unit",
  quantity: 1,
  rate: 0,
  discount: 0,
  tax_rate: 5,
});

const newRow = (): CounterRow => ({
  uid: crypto.randomUUID(),
  customer: null,
  items: [newItem()],
  status: "draft",
  expanded: true,
});

const itemTaxable = (i: CounterLineItem) =>
  Math.max(0, (Number(i.quantity) || 0) * (Number(i.rate) || 0) - (Number(i.discount) || 0));
const itemTax = (i: CounterLineItem) =>
  itemTaxable(i) * ((Number(i.tax_rate) || 0) / 100);
const itemAmount = (i: CounterLineItem) => itemTaxable(i) + itemTax(i);

const rowAmount = (r: CounterRow) =>
  r.items.reduce((s, i) => s + (i.product_id ? itemAmount(i) : 0), 0);

const rowItemCount = (r: CounterRow) => r.items.filter((i) => i.product_id).length;

// ---------- main page ----------
export default function CounterSales() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { products, fetchProducts } = useOfflineOrderEntry();

  const [tab, setTab] = useState<"orders" | "summary">("orders");
  const [rows, setRows] = useState<CounterRow[]>([newRow()]);
  const [customers, setCustomers] = useState<CounterCustomer[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submittingRows, setSubmittingRows] = useState<Set<string>>(new Set());

  // inline create-new customer state shared with customers list
  const addRetailerLocal = (r: CounterCustomer) =>
    setCustomers((rs) => (rs.some((x) => x.id === r.id) ? rs : [r, ...rs]));

  // ---- load products + customers ----
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    (async () => {
      if (!user || !navigator.onLine) return;
      const { data } = await supabase
        .from("counter_customers")
        .select("id,name,phone")
        .eq("user_id", user.id)
        .order("name");
      if (data?.length) {
        setCustomers(data as CounterCustomer[]);
      }
    })();
  }, [user]);

  // ---- restore draft ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CounterRow[];
        if (Array.isArray(parsed) && parsed.length) setRows(parsed);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- row helpers ----
  const updateRow = (uid: string, patch: Partial<CounterRow>) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, ...patch } : r)));

  const updateItem = (rowUid: string, itemUid: string, patch: Partial<CounterLineItem>) =>
    setRows((rs) =>
      rs.map((r) =>
        r.uid !== rowUid
          ? r
          : { ...r, items: r.items.map((i) => (i.uid === itemUid ? { ...i, ...patch } : i)) }
      )
    );

  const removeItem = (rowUid: string, itemUid: string) =>
    setRows((rs) =>
      rs.map((r) =>
        r.uid !== rowUid ? r : { ...r, items: r.items.filter((i) => i.uid !== itemUid) }
      )
    );

  const addItemRow = (rowUid: string) =>
    setRows((rs) =>
      rs.map((r) => (r.uid !== rowUid ? r : { ...r, items: [...r.items, newItem()] }))
    );

  const addRow = () => setRows((rs) => [...rs, newRow()]);
  const deleteRow = (uid: string) =>
    setRows((rs) => (rs.length === 1 ? [newRow()] : rs.filter((r) => r.uid !== uid)));

  const toggleExpand = (uid: string) =>
    setRows((rs) => rs.map((r) => (r.uid === uid ? { ...r, expanded: !r.expanded } : r)));

  // ---- save / submit ----
  const validateRow = (r: CounterRow): string | null => {
    if (!r.customer) return "Select a customer";
    const filled = r.items.filter((i) => i.product_id);
    if (filled.length === 0) return "Add at least one product";
    if (filled.some((i) => !i.quantity || i.quantity <= 0)) return "Quantity must be > 0";
    return null;
  };

  const saveRow = (uid: string) => {
    const row = rows.find((r) => r.uid === uid);
    if (!row) return;
    const err = validateRow(row);
    if (err) {
      toast.error(err);
      return;
    }
    updateRow(uid, { status: "saved", expanded: false });
    toast.success("Order saved as draft");
  };

  const editRow = (uid: string) => updateRow(uid, { status: "draft", expanded: true });

  const submitSingleRow = async (uid: string) => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    const row = rows.find((r) => r.uid === uid);
    if (!row) return;
    const err = validateRow(row);
    if (err) {
      toast.error(err);
      return;
    }
    setSubmittingRows((s) => new Set(s).add(uid));
    const filledItems = row.items.filter((i) => i.product_id);
    const subtotal = filledItems.reduce((s, i) => s + itemAmount(i), 0);
    const total = Math.round(subtotal);
    const orderData = {
      user_id: user.id,
      retailer_id: null as any,
      counter_customer_id: row.customer!.id,
      retailer_name: row.customer!.name,
      order_date: new Date().toISOString().slice(0, 10),
      subtotal,
      discount_amount: 0,
      total_amount: total,
      status: "confirmed",
      payment_method: "cash",
      is_credit_order: false,
      idempotency_key: `counter_${user.id}_${row.uid}_${Date.now()}`,
    };
    const items = filledItems.map((i) => ({
      product_id: i.product_id,
      product_name: i.product_name,
      category: i.category || null,
      rate: i.rate,
      original_rate: i.rate,
      discount_amount: Number(i.discount) || 0,
      unit: i.unit,
      quantity: i.quantity,
      total: itemAmount(i),
      hsn_code: null,
      sgst_amount: 0,
      cgst_amount: 0,
    }));
    try {
      const res = await submitOrderWithOfflineSupport(orderData, items, {
        connectivityStatus: navigator.onLine ? "online" : "offline",
      });
      if (res?.success) {
        updateRow(uid, { status: "submitted", expanded: false });
        toast.success("Order submitted successfully");
      } else {
        toast.error("Submission failed");
      }
    } catch (e: any) {
      toast.error(`Failed: ${e?.message || "unknown"}`);
    } finally {
      setSubmittingRows((s) => {
        const n = new Set(s);
        n.delete(uid);
        return n;
      });
    }
  };

  const saveDraft = () => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(rows));
      toast.success("Draft saved on this device");
    } catch (e: any) {
      toast.error("Could not save draft");
    }
  };

  const clearDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
  };

  const submittableRows = useMemo(
    () => rows.filter((r) => r.status !== "submitted" && r.customer && r.items.some((i) => i.product_id)),
    [rows]
  );

  const submitAll = async () => {
    if (!user) {
      toast.error("You must be signed in");
      return;
    }
    if (submittableRows.length === 0) {
      toast.error("Nothing to submit");
      return;
    }
    // validate all
    for (const r of submittableRows) {
      const err = validateRow(r);
      if (err) {
        toast.error(`Customer "${r.customer?.name || "?"}": ${err}`);
        return;
      }
    }
    setSubmitting(true);
    let successCount = 0;
    const updated = [...rows];
    for (const r of submittableRows) {
      const filledItems = r.items.filter((i) => i.product_id);
      const subtotal = filledItems.reduce((s, i) => s + itemAmount(i), 0);
      const total = Math.round(subtotal);
      const orderData = {
        user_id: user.id,
        retailer_id: null as any,
        counter_customer_id: r.customer!.id,
        retailer_name: r.customer!.name,
        order_date: new Date().toISOString().slice(0, 10),
        subtotal,
        discount_amount: 0,
        total_amount: total,
        status: "confirmed",
        payment_method: "cash",
        is_credit_order: false,
        idempotency_key: `counter_${user.id}_${r.uid}_${Date.now()}`,
      };
      const items = filledItems.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        category: i.category || null,
        rate: i.rate,
        original_rate: i.rate,
        discount_amount: Number(i.discount) || 0,
        unit: i.unit,
        quantity: i.quantity,
        total: itemAmount(i),
        hsn_code: null,
        sgst_amount: 0,
        cgst_amount: 0,
      }));
      try {
        const res = await submitOrderWithOfflineSupport(orderData, items, {
          connectivityStatus: navigator.onLine ? "online" : "offline",
        });
        if (res?.success) {
          successCount++;
          const idx = updated.findIndex((x) => x.uid === r.uid);
          if (idx >= 0) updated[idx] = { ...updated[idx], status: "submitted", expanded: false };
        }
      } catch (e: any) {
        toast.error(`Failed: ${r.customer?.name} — ${e?.message || "unknown"}`);
      }
    }
    setRows(updated);
    setSubmitting(false);
    if (successCount > 0) {
      toast.success(`Submitted ${successCount} order${successCount > 1 ? "s" : ""}`);
      clearDraft();
      setTab("summary");
    }
  };

  // ---- totals ----
  const totals = useMemo(() => {
    const customers = rows.filter((r) => r.customer).length;
    const items = rows.reduce((s, r) => s + rowItemCount(r), 0);
    const grand = rows.reduce((s, r) => s + rowAmount(r), 0);
    return { customers, items, grand };
  }, [rows]);

  return (
    <Layout>
      <div className="container mx-auto px-4 lg:px-6 py-4 max-w-[1400px] pb-28">
        {/* header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-2 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg md:text-2xl font-semibold truncate">Counter Sales – Orders</h1>
              <p className="text-xs md:text-sm text-muted-foreground truncate">
                Add orders for multiple customers
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <Button variant="outline" onClick={saveDraft}>
              Save Draft
            </Button>
            <Button onClick={submitAll} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Submit All
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="summary">
              Summary
              {rows.some((r) => r.status === "saved" || r.status === "submitted") && (
                <Badge variant="secondary" className="ml-2">
                  {rows.filter((r) => r.status === "saved" || r.status === "submitted").length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ===== ORDERS TAB ===== */}
          <TabsContent value="orders" className="mt-4">
            {/* DESKTOP grid view */}
            <Card className="hidden md:block overflow-hidden rounded-2xl border">
              {/* table header */}
              <div className="grid grid-cols-[40px_1.6fr_1fr_1fr_220px] items-center gap-3 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
                <div></div>
                <div>Customer</div>
                <div>Products</div>
                <div>Total Amount</div>
                <div className="text-right">Actions</div>
              </div>

              {rows.map((row) => (
                <OrderRow
                  key={row.uid}
                  row={row}
                  products={products}
                  customers={customers}
                  submitting={submittingRows.has(row.uid)}
                  onToggleExpand={() => toggleExpand(row.uid)}
                  onPickCustomer={(ret) => updateRow(row.uid, { customer: ret, phoneOverride: ret.phone || undefined })}
                  onCreateRetailer={addRetailerLocal}
                  onPhoneChange={(p) => updateRow(row.uid, { phoneOverride: p })}
                  onAddItemRow={() => addItemRow(row.uid)}
                  onUpdateItem={(itemUid, patch) => updateItem(row.uid, itemUid, patch)}
                  onRemoveItem={(itemUid) => removeItem(row.uid, itemUid)}
                  onSave={() => saveRow(row.uid)}
                  onSubmit={() => submitSingleRow(row.uid)}
                  onEdit={() => editRow(row.uid)}
                  onDelete={() => deleteRow(row.uid)}
                />
              ))}

              <div className="flex items-center justify-between px-4 py-3 bg-muted/20 border-t">
                <Button variant="outline" size="sm" onClick={addRow}>
                  <Plus className="h-4 w-4 mr-1" /> Add Row
                </Button>
                <div className="text-xs text-muted-foreground">
                  {rows.length} customer row{rows.length !== 1 ? "s" : ""}
                </div>
              </div>
            </Card>

            {/* MOBILE card view */}
            <div className="md:hidden space-y-3">
              {rows.map((row, idx) => (
                <MobileCustomerCard
                  key={row.uid}
                  index={idx + 1}
                  row={row}
                  products={products}
                  customers={customers}
                  submitting={submittingRows.has(row.uid)}
                  onToggleExpand={() => toggleExpand(row.uid)}
                  onPickCustomer={(ret) =>
                    updateRow(row.uid, { customer: ret, phoneOverride: ret.phone || undefined })
                  }
                  onCreateRetailer={addRetailerLocal}
                  onAddItemRow={() => addItemRow(row.uid)}
                  onUpdateItem={(itemUid, patch) => updateItem(row.uid, itemUid, patch)}
                  onRemoveItem={(itemUid) => removeItem(row.uid, itemUid)}
                  onSave={() => saveRow(row.uid)}
                  onSubmit={() => submitSingleRow(row.uid)}
                  onEdit={() => editRow(row.uid)}
                  onDelete={() => deleteRow(row.uid)}
                />
              ))}
              <Button
                variant="outline"
                onClick={addRow}
                className="w-full rounded-2xl border-dashed h-11 text-primary"
              >
                <Plus className="h-4 w-4 mr-1" /> Add Row
              </Button>
            </div>

            <div className="hidden md:flex justify-end mt-3">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="h-4 w-4 mr-1" /> Add Row
              </Button>
            </div>
          </TabsContent>

          {/* ===== SUMMARY TAB ===== */}
          <TabsContent value="summary" className="mt-4">
            <SummaryView
              rows={rows.filter((r) => r.status === "submitted")}
              onDelete={deleteRow}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* sticky bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="container mx-auto max-w-[1400px] px-3 lg:px-6 py-2 md:py-3">
          {/* totals row */}
          <div className="grid grid-cols-3 gap-2 md:hidden mb-2">
            <div className="rounded-xl bg-muted/40 px-2 py-1.5 text-center">
              <div className="text-[10px] text-muted-foreground">Customers</div>
              <div className="text-sm font-semibold">{totals.customers}</div>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-1.5 text-center">
              <div className="text-[10px] text-muted-foreground">Items</div>
              <div className="text-sm font-semibold">{totals.items}</div>
            </div>
            <div className="rounded-xl bg-muted/40 px-2 py-1.5 text-center">
              <div className="text-[10px] text-muted-foreground">Grand Total</div>
              <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{totals.grand.toFixed(2)}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 md:gap-4 flex-wrap">
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div>
                <span className="text-muted-foreground">Customers: </span>
                <span className="font-semibold">{totals.customers}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Items: </span>
                <span className="font-semibold">{totals.items}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Grand Total: </span>
                <span className="font-semibold">₹{totals.grand.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="outline"
                onClick={saveDraft}
                className="flex-1 md:flex-initial rounded-xl h-10"
              >
                <Save className="h-4 w-4 mr-1 md:hidden" />
                Save Draft
              </Button>
              <Button
                onClick={submitAll}
                disabled={submitting}
                className="flex-1 md:flex-initial rounded-xl h-10"
              >
                {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Submit All
              </Button>
            </div>
          </div>
        </div>
      </div>

    </Layout>
  );
}

// ===================================================================
// ORDER ROW — full-width expansion, no nested cards, flat grid
// ===================================================================
function OrderRow({
  row,
  products,
  customers,
  submitting,
  onToggleExpand,
  onPickCustomer,
  onCreateRetailer,
  onPhoneChange,
  onAddItemRow,
  onUpdateItem,
  onRemoveItem,
  onSave,
  onSubmit,
  onEdit,
  onDelete,
}: {
  row: CounterRow;
  products: any[];
  customers: CounterCustomer[];
  submitting?: boolean;
  onToggleExpand: () => void;
  onPickCustomer: (r: CounterCustomer) => void;
  onCreateRetailer: (r: CounterCustomer) => void;
  onPhoneChange: (p: string) => void;
  onAddItemRow: () => void;
  onUpdateItem: (itemUid: string, patch: Partial<CounterLineItem>) => void;
  onRemoveItem: (itemUid: string) => void;
  onSave: () => void;
  onSubmit: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const locked = row.status === "saved" || row.status === "submitted";
  const subtotal = row.items.reduce(
    (s, i) => s + (i.product_id ? (Number(i.quantity) || 0) * (Number(i.rate) || 0) : 0),
    0
  );
  const discountTotal = row.items.reduce(
    (s, i) => s + (i.product_id ? Number(i.discount) || 0 : 0),
    0
  );
  const taxableTotal = row.items.reduce(
    (s, i) => s + (i.product_id ? itemTaxable(i) : 0),
    0
  );
  const taxTotal = row.items.reduce((s, i) => s + (i.product_id ? itemTax(i) : 0), 0);
  const total = taxableTotal + taxTotal;

  return (
    <div className={cn("border-b last:border-b-0", locked && "bg-muted/10")}>
      {/* main row */}
      <div className="grid grid-cols-[40px_1.6fr_1fr_1fr_220px] items-center gap-3 px-4 py-3">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleExpand}>
          {row.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>

        <div className="min-w-0">
          <InlineCustomerSelect
            value={row.customer}
            phone={row.phoneOverride}
            disabled={locked}
            customers={customers}
            onPick={onPickCustomer}
            onCreated={(r) => {
              onCreateRetailer(r);
              onPickCustomer(r);
            }}
          />
        </div>

        <div className="text-sm">
          {rowItemCount(row)} item{rowItemCount(row) !== 1 ? "s" : ""}
        </div>

        <div className="text-sm font-semibold">₹{total.toFixed(2)}</div>

        <div className="flex items-center justify-end gap-2">
          {row.status === "submitted" ? (
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
              Submitted
            </Badge>
          ) : row.status === "saved" ? (
            <>
              <Badge variant="secondary">
                <Lock className="h-3 w-3 mr-1" /> Saved
              </Badge>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Submit
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={onSave}>
                <Save className="h-3.5 w-3.5 mr-1" /> Save
              </Button>
              <Button size="sm" onClick={onSubmit} disabled={submitting}>
                {submitting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Submit
              </Button>
            </>
          )}
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={onDelete}
            disabled={row.status === "submitted"}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* expanded — FULL WIDTH, flat */}
      {row.expanded && (
        <div className="bg-muted/20 border-t px-4 py-3">
          {/* products sub-table — header */}
          <div className="grid grid-cols-[2fr_90px_70px_100px_100px_40px] items-center gap-2 px-2 py-2 text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
            <div>Product</div>
            <div>Unit</div>
            <div>Qty</div>
            <div>Price (₹)</div>
            <div>Discount (₹)</div>
            <div></div>
          </div>

          {row.items.map((item, idx) => (
            <div
              key={item.uid}
              className="grid grid-cols-[2fr_90px_70px_100px_100px_40px] items-start gap-2 px-2 py-1.5 border-t border-border/50"
            >
              <InlineProductSelect
                value={item}
                products={products}
                disabled={locked}
                onPick={(p) =>
                  onUpdateItem(item.uid, {
                    product_id: p.id,
                    product_name: p.name,
                    category: p.category?.name || null,
                    sku: p.sku || null,
                    unit: p.unit || "Unit",
                    rate: Number(p.rate) || 0,
                  })
                }
                onEnter={() => {
                  if (idx === row.items.length - 1) onAddItemRow();
                }}
              />
              <Select
                value={item.unit}
                disabled={locked}
                onValueChange={(v) => onUpdateItem(item.uid, { unit: v })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set([item.unit, ...UOM_OPTIONS])).map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                value={item.quantity}
                disabled={locked}
                onChange={(e) =>
                  onUpdateItem(item.uid, { quantity: Number(e.target.value) || 0 })
                }
                className="h-9"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.rate}
                disabled={locked}
                onChange={(e) => onUpdateItem(item.uid, { rate: Number(e.target.value) || 0 })}
                className="h-9"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={item.discount}
                disabled={locked}
                onChange={(e) =>
                  onUpdateItem(item.uid, { discount: Number(e.target.value) || 0 })
                }
                className="h-9"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                disabled={locked || row.items.length === 1}
                onClick={() => onRemoveItem(item.uid)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}

          {/* Add row + totals */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-3 mt-3">
            <Button
              variant="outline"
              onClick={onAddItemRow}
              disabled={locked}
              className="border-dashed h-10 text-muted-foreground"
            >
              <Plus className="h-4 w-4 mr-1" /> Add Row
            </Button>
            <div className="rounded-xl border bg-background px-3 py-2 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-destructive">- ₹{discountTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Taxable Amount</span>
                <span>₹{taxableTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Tax (incl. GST)</span>
                <span>₹{taxTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-1 mt-1 font-semibold">
                <span>Total Amount</span>
                <span className="text-emerald-600 dark:text-emerald-400">
                  ₹{total.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ===================================================================
// SUMMARY VIEW
// ===================================================================
function SummaryView({
  rows,
  onEdit,
  onDelete,
}: {
  rows: CounterRow[];
  onEdit: (uid: string) => void;
  onDelete: (uid: string) => void;
}) {
  const navigate = useNavigate();
  if (rows.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground rounded-2xl">
        No saved or submitted orders yet. Save a row from the Orders tab to see it here.
      </Card>
    );
  }
  return (
    <Card className="overflow-hidden rounded-2xl">
      <div className="grid grid-cols-[1.6fr_1fr_1fr_140px_240px] items-center gap-3 px-4 py-3 bg-muted/40 text-xs font-medium text-muted-foreground uppercase tracking-wide border-b">
        <div>Customer</div>
        <div>Items</div>
        <div>Total</div>
        <div>Status</div>
        <div className="text-right">Actions</div>
      </div>
      {rows.map((r) => (
        <div
          key={r.uid}
          className="grid grid-cols-[1.6fr_1fr_1fr_140px_240px] items-center gap-3 px-4 py-3 border-b last:border-b-0"
        >
          <div className="min-w-0">
            <div className="font-medium truncate">{r.customer?.name || "—"}</div>
            <div className="text-xs text-muted-foreground truncate">
              {r.phoneOverride || r.customer?.phone || "—"}
            </div>
          </div>
          <div className="text-sm">{rowItemCount(r)}</div>
          <div className="text-sm font-semibold">₹{rowAmount(r).toFixed(2)}</div>
          <div>
            {r.status === "submitted" ? (
              <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
                Submitted
              </Badge>
            ) : (
              <Badge variant="secondary">Saved</Badge>
            )}
          </div>
          <div className="flex items-center justify-end gap-2">
            {r.status === "submitted" && (
              <Button size="sm" variant="outline" onClick={() => navigate("/invoices")}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Invoice
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => onEdit(r.uid)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(r.uid)}
              disabled={r.status === "submitted"}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}
    </Card>
  );
}

// ===================================================================
// PRODUCT PICKER DIALOG
// ===================================================================
function ProductPickerDialog({
  open,
  onClose,
  products,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  products: any[];
  onAdd: (p: any, qty: number, unit: string, price: number) => void;
}) {
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<any | null>(null);
  const [qty, setQty] = useState(1);
  const [unit, setUnit] = useState("Pcs");
  const [price, setPrice] = useState(0);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setPicked(null);
      setQty(1);
      setPrice(0);
    }
  }, [open]);

  useEffect(() => {
    if (picked) {
      setUnit(picked.unit || "Pcs");
      setPrice(Number(picked.rate) || 0);
    }
  }, [picked]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products.slice(0, 50);
    return products
      .filter(
        (p) =>
          p.name?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.category?.name?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [products, search]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Product</DialogTitle>
        </DialogHeader>

        {!picked ? (
          <>
            <Input
              placeholder="Search by name, SKU, or category…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <div className="max-h-80 overflow-y-auto border rounded-lg divide-y">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-muted-foreground text-center">No products</div>
              ) : (
                filtered.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPicked(p)}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {p.category?.name || "—"} · {p.unit || "Pcs"}
                      </div>
                    </div>
                    <div className="text-sm font-semibold">₹{Number(p.rate || 0).toFixed(2)}</div>
                  </button>
                ))
              )}
            </div>
          </>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border p-3 bg-muted/30">
              <div className="font-medium">{picked.name}</div>
              <div className="text-xs text-muted-foreground">
                {picked.category?.name || "—"}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-muted-foreground">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value) || 0)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Unit</label>
                <Select value={unit} onValueChange={setUnit}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from(new Set([unit, ...UOM_OPTIONS])).map((u) => (
                      <SelectItem key={u} value={u}>
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Price (₹)</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                />
              </div>
            </div>
            <div className="text-right text-sm">
              Amount: <span className="font-semibold">₹{(qty * price).toFixed(2)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {picked && (
            <>
              <Button variant="ghost" onClick={() => setPicked(null)}>
                Back
              </Button>
              <Button
                onClick={() => {
                  if (!qty || qty <= 0) {
                    toast.error("Quantity must be > 0");
                    return;
                  }
                  onAdd(picked, qty, unit, price);
                }}
              >
                Add to order
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ===================================================================
// INLINE CUSTOMER SELECT — searchable dropdown + inline create
// ===================================================================
function InlineCustomerSelect({
  value,
  phone,
  disabled,
  customers,
  onPick,
  onCreated,
}: {
  value: CounterCustomer | null;
  phone?: string;
  disabled?: boolean;
  customers: CounterCustomer[];
  onPick: (r: CounterCustomer) => void;
  onCreated: (r: CounterCustomer) => void;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [mode, setMode] = useState<"search" | "create">("search");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setMode("search");
      setNewName("");
      setNewPhone("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);
    return customers
      .filter(
        (r) =>
          r.name?.toLowerCase().includes(q) ||
          r.phone?.toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [customers, search]);

  const handleCreate = async () => {
    const name = newName.trim();
    const ph = newPhone.trim();
    if (!name) return toast.error("Customer name is required");
    if (!ph) return toast.error("Phone number is required");
    // duplicate check (local)
    const dup = customers.find((r) => (r.phone || "").trim() === ph);
    if (dup) {
      toast.error("Customer already exists. Selecting it instead.");
      onPick(dup);
      setOpen(false);
      return;
    }
    if (!user) return toast.error("You must be signed in");
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("counter_customers")
        .insert({
          name,
          phone: ph,
          user_id: user.id,
        })
        .select("id,name,phone")
        .single();
      if (error) throw error;
      const created: CounterCustomer = {
        id: data.id,
        name: data.name,
        phone: data.phone,
      };
      onCreated(created);
      toast.success("Customer created");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message || "Could not create customer");
    } finally {
      setSaving(false);
    }
  };

  // trigger
  const trigger = value ? (
    <button
      type="button"
      disabled={disabled}
      className="text-left w-full disabled:cursor-not-allowed"
    >
      <div className="font-medium truncate">{value.name}</div>
      <div className="text-xs text-muted-foreground truncate">
        {phone || value.phone || "—"}
      </div>
    </button>
  ) : (
    <Button variant="outline" size="sm" disabled={disabled} className="w-full justify-start">
      <Search className="h-3.5 w-3.5 mr-1" /> Select customer
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        {mode === "search" ? (
          <div className="p-2">
            <div className="relative mb-2">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 pl-8"
                autoFocus
              />
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
              {filtered.length === 0 ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  No customers
                </div>
              ) : (
                filtered.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      onPick(r);
                      setOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-muted/50"
                  >
                    <div className="text-sm font-medium truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.phone || "—"}
                    </div>
                  </button>
                ))
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start mt-2 text-primary"
              onClick={() => {
                setNewName(search);
                setMode("create");
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Create New Customer
            </Button>
          </div>
        ) : (
          <div className="p-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              New Customer
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Name *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="h-9"
                placeholder="Customer name"
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Phone *</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                className="h-9"
                placeholder="10-digit number"
                inputMode="tel"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMode("search")}
                disabled={saving}
              >
                Back
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
                Done
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ===================================================================
// INLINE PRODUCT SELECT — searchable dropdown with name, SKU, price
// ===================================================================
function InlineProductSelect({
  value,
  products,
  disabled,
  onPick,
  onEnter,
}: {
  value: CounterLineItem;
  products: any[];
  disabled?: boolean;
  onPick: (p: any) => void;
  onEnter?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = !q
      ? products
      : products.filter(
          (p) =>
            p.name?.toLowerCase().includes(q) ||
            p.sku?.toLowerCase().includes(q) ||
            p.category?.name?.toLowerCase().includes(q)
        );
    return list.slice(0, 50);
  }, [products, search]);

  return (
    <Popover open={open} onOpenChange={(v) => !disabled && setOpen(v)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-9 w-full rounded-md border border-input bg-background px-3 text-left text-sm",
            "flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60",
            !value.product_id && "text-muted-foreground"
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <span className="truncate">
            {value.product_id
              ? value.product_name
              : "Search product by name, SKU or scan…"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px] p-0" align="start">
        <div className="p-2">
          <div className="relative mb-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered[0]) {
                  onPick(filtered[0]);
                  setOpen(false);
                  onEnter?.();
                }
              }}
              className="h-9 pl-8"
              autoFocus
            />
          </div>
          <div className="max-h-64 overflow-y-auto rounded-md border divide-y">
            {filtered.length === 0 ? (
              <div className="p-4 text-xs text-muted-foreground text-center">
                No products
              </div>
            ) : (
              filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    onPick(p);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      {p.sku ? `SKU: ${p.sku}` : p.category?.name || "—"}
                    </div>
                  </div>
                  <div className="text-sm font-semibold shrink-0">
                    ₹{Number(p.rate || 0).toFixed(2)}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}