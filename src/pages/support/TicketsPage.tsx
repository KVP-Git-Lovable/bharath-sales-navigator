import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { LifeBuoy, Plus, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export const TICKET_STATUSES = [
  { value: "created", label: "Created" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "in_progress", label: "Work in progress" },
  { value: "closed", label: "Closed" },
  { value: "deferred", label: "Deferred" },
  { value: "cancelled", label: "Cancelled" },
];

export const statusColors: Record<string, string> = {
  created: "bg-blue-100 text-blue-800",
  acknowledged: "bg-indigo-100 text-indigo-800",
  in_progress: "bg-yellow-100 text-yellow-800",
  closed: "bg-emerald-100 text-emerald-800",
  deferred: "bg-orange-100 text-orange-800",
  cancelled: "bg-gray-200 text-gray-800",
  // legacy fallbacks
  open: "bg-blue-100 text-blue-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export const impactColors: Record<string, string> = {
  low: "bg-slate-100 text-slate-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  critical: "bg-red-100 text-red-800",
};

export const statusLabel = (v: string) =>
  TICKET_STATUSES.find((s) => s.value === v)?.label ?? (v || "").replace("_", " ");

export default function TicketsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    subject: "", description: "", company_name: "", category: "question", impact: "medium",
  });
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support_tickets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const submit = async () => {
    if (!user) return;
    if (!form.subject.trim() || !form.description.trim()) {
      toast.error("Subject and description are required"); return;
    }
    setSubmitting(true);
    try {
      const { data: ticket, error } = await supabase.from("support_tickets").insert({
        subject: form.subject, description: form.description,
        company_name: form.company_name || null, category: form.category, impact: form.impact,
        created_by: user.id, status: "created",
      }).select().single();
      if (error) throw error;

      for (const f of files) {
        const path = `${user.id}/${ticket.id}/${Date.now()}_${f.name}`;
        const up = await supabase.storage.from("support-attachments").upload(path, f);
        if (!up.error) {
          await supabase.from("support_ticket_attachments").insert({
            ticket_id: ticket.id, file_path: path, file_name: f.name,
            mime_type: f.type, size_bytes: f.size, uploaded_by: user.id,
          });
        }
      }
      toast.success(`Ticket ${ticket.ticket_number} created`);
      setOpen(false);
      setForm({ subject: "", description: "", company_name: "", category: "question", impact: "medium" });
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
    } catch (e: any) {
      toast.error(e.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><LifeBuoy className="h-6 w-6 text-primary" /> Tickets</h1>
          <p className="text-sm text-muted-foreground">Raise a ticket and track its progress. Attach screenshots and add details.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Raise ticket</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Raise a ticket</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
              <Textarea placeholder="Describe the issue or request in detail..." rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Input placeholder="Company name" value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
              <div className="grid grid-cols-2 gap-3">
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug</SelectItem>
                    <SelectItem value="feature">Feature request</SelectItem>
                    <SelectItem value="question">Question</SelectItem>
                    <SelectItem value="billing">Billing</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={form.impact} onValueChange={(v) => setForm({ ...form, impact: v })}>
                  <SelectTrigger><SelectValue placeholder="Impact" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm cursor-pointer border rounded-md px-3 py-2 hover:bg-muted">
                  <Paperclip className="h-4 w-4" /> Attach screenshots / files
                  <input type="file" multiple className="hidden" accept="image/*,application/pdf" onChange={(e) => setFiles(Array.from(e.target.files ?? []))} />
                </label>
                {files.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between text-xs bg-muted rounded px-2 py-1">
                        <span className="truncate">{f.name}</span>
                        <button onClick={() => setFiles(files.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <Button className="w-full" onClick={submit} disabled={submitting}>{submitting ? "Submitting..." : "Submit ticket"}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading tickets...</div>
      ) : tickets.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No tickets yet. Raise one to get help from our team.</CardContent></Card>
      ) : (
        <div className="space-y-2">
          {tickets.map((t: any) => (
            <Link key={t.id} to={`/support/tickets/${t.id}`}>
              <Card className="cursor-pointer hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                      <Badge className={`text-[10px] capitalize ${statusColors[t.status] || ""}`}>{statusLabel(t.status)}</Badge>
                      <Badge className={`text-[10px] capitalize ${impactColors[t.impact] || ""}`}>{t.impact}</Badge>
                    </div>
                    <h3 className="font-medium truncate">{t.subject}</h3>
                    <div className="text-xs text-muted-foreground mt-1">
                      {t.company_name && <span>{t.company_name} · </span>}
                      <span className="capitalize">{t.category}</span> · {format(new Date(t.created_at), "MMM d, yyyy")}
                    </div>
                    {t.owner_name && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Owner: <span className="text-foreground">{t.owner_name}</span>
                        {t.owner_phone && <> · {t.owner_phone}</>}
                        {t.owner_email && <> · {t.owner_email}</>}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}