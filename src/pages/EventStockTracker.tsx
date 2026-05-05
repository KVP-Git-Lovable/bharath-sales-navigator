import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Plus, Loader2, Trash2, Package, IndianRupee, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface EventInfo {
  id: string;
  event_name: string;
  activity_name: string | null;
  activity_date: string;
  from_date: string | null;
  to_date: string | null;
  total_days: number | null;
  activity_place: string | null;
}

interface DayRow {
  id: string;
  day_number: number;
  date: string;
}

interface Product {
  id: string;
  name: string;
  sku: string | null;
  rate: number | null;
}

interface StockItem {
  id: string;
  product_id: string;
  product_name: string;
  stock_taken: number;
  sold_qty: number;
  price: number;
}

function buildDays(ev: EventInfo): { day_number: number; date: string }[] {
  const start = ev.from_date || ev.activity_date;
  const end = ev.to_date || ev.activity_date;
  const days: { day_number: number; date: string }[] = [];
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  let i = 1;
  for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
    days.push({ day_number: i++, date: d.toISOString().slice(0, 10) });
  }
  return days;
}

const fmtDate = (iso: string) =>
  new Date(iso + "T00:00:00").toLocaleDateString([], { day: "2-digit", month: "short" });

export default function EventStockTracker() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventInfo | null>(null);
  const [days, setDays] = useState<DayRow[]>([]);
  const [activeDayId, setActiveDayId] = useState<string>("");
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [addOpen, setAddOpen] = useState(false);

  // Load event + ensure days exist
  useEffect(() => {
    (async () => {
      if (!id || !user?.id) return;
      setLoading(true);

      const { data: evData } = await supabase
        .from("activity_events")
        .select("id,event_name,activity_name,activity_date,from_date,to_date,total_days,activity_place")
        .eq("visit_id", id)
        .maybeSingle();

      if (!evData) {
        toast.error("Event not found");
        setLoading(false);
        return;
      }
      const ev = evData as EventInfo;
      setEvent(ev);

      // Get existing days
      const { data: existing } = await supabase
        .from("event_stock_days")
        .select("id,day_number,date")
        .eq("event_id", ev.id)
        .order("day_number");

      let dayRows: DayRow[] = (existing as DayRow[]) || [];
      const expected = buildDays(ev);
      const missing = expected.filter((d) => !dayRows.find((r) => r.day_number === d.day_number));
      if (missing.length) {
        const { data: created } = await supabase
          .from("event_stock_days")
          .insert(
            missing.map((m) => ({
              event_id: ev.id,
              user_id: user.id,
              day_number: m.day_number,
              date: m.date,
            }))
          )
          .select("id,day_number,date");
        if (created) dayRows = [...dayRows, ...(created as DayRow[])];
      }
      dayRows.sort((a, b) => a.day_number - b.day_number);
      setDays(dayRows);
      if (dayRows[0]) setActiveDayId(dayRows[0].id);
      setLoading(false);
    })();
  }, [id, user?.id]);

  // Load items for active day
  const loadItems = useCallback(async (dayId: string) => {
    if (!dayId) return;
    const { data } = await supabase
      .from("event_stock_items")
      .select("id,product_id,stock_taken,sold_qty,price,products(name)")
      .eq("event_stock_day_id", dayId)
      .order("created_at");
    const mapped: StockItem[] = (data || []).map((r: any) => ({
      id: r.id,
      product_id: r.product_id,
      product_name: r.products?.name || "Product",
      stock_taken: Number(r.stock_taken) || 0,
      sold_qty: Number(r.sold_qty) || 0,
      price: Number(r.price) || 0,
    }));
    setItems(mapped);
  }, []);

  useEffect(() => {
    if (activeDayId) loadItems(activeDayId);
  }, [activeDayId, loadItems]);

  // Load products list once
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("id,name,sku,rate")
        .eq("is_active", true)
        .order("name")
        .limit(500);
      setProducts((data as Product[]) || []);
    })();
  }, []);

  // KPIs
  const kpis = useMemo(() => {
    const taken = items.reduce((s, i) => s + i.stock_taken, 0);
    const sold = items.reduce((s, i) => s + i.sold_qty, 0);
    const remaining = taken - sold;
    const value = items.reduce((s, i) => s + i.sold_qty * i.price, 0);
    return { taken, sold, remaining, value };
  }, [items]);

  const updateField = async (
    itemId: string,
    field: "stock_taken" | "sold_qty",
    raw: string
  ) => {
    const num = Math.max(0, Number(raw) || 0);
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const next = { ...it, [field]: num };
        if (field === "sold_qty" && num > next.stock_taken) {
          toast.error("Sold cannot exceed Stock Taken");
          return it;
        }
        return next;
      })
    );
    const updated = items.find((i) => i.id === itemId);
    if (!updated) return;
    let value = num;
    if (field === "sold_qty" && num > updated.stock_taken) return;
    await supabase
      .from("event_stock_items")
      .update({ [field]: value })
      .eq("id", itemId);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("event_stock_items").delete().eq("id", itemId);
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success("Removed");
  };

  if (loading || !event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const dateRangeLabel = (() => {
    if (event.from_date && event.to_date) {
      return `${fmtDate(event.from_date)} – ${fmtDate(event.to_date)}`;
    }
    return fmtDate(event.activity_date);
  })();

  return (
    <div className="min-h-screen bg-background p-3 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" className="p-2" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl sm:text-2xl font-bold">Event Stock Tracking</h1>
          <p className="text-sm text-muted-foreground">Track stock flow for this event</p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="gap-1">
          <Plus className="h-4 w-4" />
          Add Stock
        </Button>
      </div>

      {/* Event Info */}
      <Card className="rounded-2xl">
        <CardContent className="p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="font-semibold text-base">
            {event.event_name || event.activity_name || "Event"}
          </div>
          <div className="text-sm text-muted-foreground flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {dateRangeLabel}
          </div>
          {event.activity_place && (
            <div className="text-sm text-muted-foreground flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {event.activity_place}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Day Tabs */}
      {days.length > 1 && (
        <Tabs value={activeDayId} onValueChange={setActiveDayId}>
          <TabsList className="flex flex-wrap h-auto">
            {days.map((d) => (
              <TabsTrigger key={d.id} value={d.id} className="text-xs">
                Day {d.day_number} ({fmtDate(d.date)})
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label="Total Stock Taken" value={kpis.taken.toString()} accent="bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" icon={<Package className="h-4 w-4" />} />
        <KpiCard label="Total Sold" value={kpis.sold.toString()} accent="bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" icon={<Package className="h-4 w-4" />} />
        <KpiCard label="Remaining" value={kpis.remaining.toString()} accent="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300" icon={<Package className="h-4 w-4" />} />
        <KpiCard label="Sold Value" value={`₹${kpis.value.toLocaleString("en-IN")}`} accent="bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" icon={<IndianRupee className="h-4 w-4" />} />
      </div>

      {/* Table */}
      <Card className="rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr className="text-left">
                <th className="px-3 py-2 w-10">#</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2 w-32">Stock Taken</th>
                <th className="px-3 py-2 w-28">Sold</th>
                <th className="px-3 py-2 w-28">Remaining</th>
                <th className="px-3 py-2 w-12"></th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-10 text-center text-muted-foreground">
                    No stock entries yet. Click "+ Add Stock" to add a product.
                  </td>
                </tr>
              ) : (
                items.map((it, idx) => {
                  const remaining = it.stock_taken - it.sold_qty;
                  return (
                    <tr key={it.id} className="border-t">
                      <td className="px-3 py-2 text-muted-foreground">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{it.product_name}</td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          value={it.stock_taken}
                          onChange={(e) => updateField(it.id, "stock_taken", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <Input
                          type="number"
                          min={0}
                          max={it.stock_taken}
                          value={it.sold_qty}
                          onChange={(e) => updateField(it.id, "sold_qty", e.target.value)}
                          className="h-9"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-1 rounded-md font-medium",
                            remaining >= 0
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                              : "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"
                          )}
                        >
                          {remaining}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <Button variant="ghost" size="sm" className="p-2" onClick={() => removeItem(it.id)}>
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-muted/40 font-semibold">
                <tr className="border-t">
                  <td className="px-3 py-2" colSpan={2}>
                    Totals
                  </td>
                  <td className="px-3 py-2">{kpis.taken}</td>
                  <td className="px-3 py-2">{kpis.sold}</td>
                  <td className="px-3 py-2 text-emerald-700 dark:text-emerald-300">{kpis.remaining}</td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </Card>

      {/* Footer */}
      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => toast.info("All-days summary coming soon")}>
          View All Days Summary
        </Button>
      </div>

      {/* Add Stock Dialog */}
      <AddStockDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        products={products}
        existingProductIds={items.map((i) => i.product_id)}
        onAdd={async ({ productId, qty }) => {
          if (!activeDayId) return;
          const product = products.find((p) => p.id === productId);
          if (!product) return;
          const { data, error } = await supabase
            .from("event_stock_items")
            .insert({
              event_stock_day_id: activeDayId,
              product_id: productId,
              stock_taken: qty,
              sold_qty: 0,
              price: Number(product.rate) || 0,
            })
            .select("id")
            .single();
          if (error) {
            toast.error(error.message);
            return;
          }
          setItems((prev) => [
            ...prev,
            {
              id: data.id,
              product_id: productId,
              product_name: product.name,
              stock_taken: qty,
              sold_qty: 0,
              price: Number(product.rate) || 0,
            },
          ]);
          toast.success("Stock added");
          setAddOpen(false);
        }}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: string;
  accent: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <div className={cn("inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium", accent)}>
          {icon}
          <span>{label}</span>
        </div>
        <div className="text-2xl font-bold mt-2">{value}</div>
      </CardContent>
    </Card>
  );
}

function AddStockDialog({
  open,
  onOpenChange,
  products,
  existingProductIds,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  products: Product[];
  existingProductIds: string[];
  onAdd: (v: { productId: string; qty: number }) => Promise<void>;
}) {
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [search, setSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setProductId("");
      setQty("");
      setSearch("");
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products
      .filter((p) => !existingProductIds.includes(p.id))
      .filter((p) =>
        !q ? true : p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
      )
      .slice(0, 50);
  }, [products, search, existingProductIds]);

  const selected = products.find((p) => p.id === productId);

  const submit = async () => {
    const n = Number(qty);
    if (!productId) return toast.error("Select a product");
    if (!n || n <= 0) return toast.error("Enter a valid quantity");
    setSaving(true);
    await onAdd({ productId, qty: n });
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Stock</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Product</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start mt-1 h-11">
                  {selected ? selected.name : "Select product..."}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <div className="p-2 border-b">
                  <Input
                    autoFocus
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filtered.length === 0 ? (
                    <div className="p-3 text-sm text-muted-foreground">No products</div>
                  ) : (
                    filtered.map((p) => (
                      <button
                        key={p.id}
                        className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                        onClick={() => {
                          setProductId(p.id);
                          setPickerOpen(false);
                        }}
                      >
                        <div className="font-medium">{p.name}</div>
                        {p.sku && (
                          <div className="text-xs text-muted-foreground">{p.sku}</div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label>Quantity (Stock Taken)</Label>
            <Input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
            Add
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}