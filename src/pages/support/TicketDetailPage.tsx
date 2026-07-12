import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Trash2, Send, Paperclip, Save } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { TICKET_STATUSES, statusColors, impactColors, statusLabel } from "./TicketsPage";

export default function TicketDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminAccess();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [owner, setOwner] = useState({ owner_name: "", owner_phone: "", owner_email: "" });
  const [ownerDirty, setOwnerDirty] = useState(false);

  const { data: ticket, isLoading } = useQuery({
    queryKey: ["support_ticket", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_tickets").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  useEffect(() => {
    if (ticket) setOwner({
      owner_name: ticket.owner_name ?? "",
      owner_phone: ticket.owner_phone ?? "",
      owner_email: ticket.owner_email ?? "",
    });
  }, [ticket]);

  const { data: attachments = [] } = useQuery({
    queryKey: ["ticket_attachments", id],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_attachments").select("*").eq("ticket_id", id);
      return data ?? [];
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["ticket_comments", id],
    queryFn: async () => {
      const { data } = await supabase.from("support_ticket_comments").select("*").eq("ticket_id", id).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("support_ticket_comments").insert({
        ticket_id: id, user_id: user.id, body: comment,
        is_internal: false,
      });
      if (error) throw error;
    },
    onSuccess: () => { setComment(""); qc.invalidateQueries({ queryKey: ["ticket_comments", id] }); },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: string) => {
      const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_ticket", id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const saveOwner = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").update(owner as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_ticket", id] });
      qc.invalidateQueries({ queryKey: ["support_tickets"] });
      setOwnerDirty(false);
      toast.success("Owner details saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_tickets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ticket deleted"); navigate("/support/tickets"); },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  const openAttachment = async (path: string) => {
    const { data } = await supabase.storage.from("support-attachments").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  if (isLoading || !ticket) return <div className="text-sm text-muted-foreground">Loading...</div>;
  const canDelete = !!user && (hasAdminAccess || ticket.created_by === user.id);
  const canEditOwnerAndStatus = hasAdminAccess;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/support/tickets"><ArrowLeft className="h-4 w-4 mr-1" /> Back to tickets</Link>
        </Button>
        {canDelete && (
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this ticket?")) del.mutate(); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticket_number}</span>
            <Badge className={`text-[10px] capitalize ${statusColors[ticket.status] || ""}`}>{statusLabel(ticket.status)}</Badge>
            <Badge className={`text-[10px] capitalize ${impactColors[ticket.impact] || ""}`}>{ticket.impact}</Badge>
          </div>
          <h2 className="text-xl font-semibold">{ticket.subject}</h2>
          <div className="text-sm text-muted-foreground">
            {ticket.company_name && <>{ticket.company_name} · </>}
            <span className="capitalize">{ticket.category}</span> · {format(new Date(ticket.created_at), "MMM d, yyyy HH:mm")}
          </div>
          <p className="whitespace-pre-wrap text-sm border-t pt-3">{ticket.description}</p>
          {attachments.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium text-muted-foreground">Attachments</div>
              {attachments.map((a: any) => (
                <button key={a.id} onClick={() => openAttachment(a.file_path)} className="flex items-center gap-2 text-sm text-primary hover:underline">
                  <Paperclip className="h-3 w-3" /> {a.file_name}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium">QuickApp Team</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={ticket.status} onValueChange={(v) => updateStatus.mutate(v)} disabled={!canEditOwnerAndStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Owner name</label>
              <Input value={owner.owner_name} disabled={!canEditOwnerAndStatus}
                onChange={(e) => { setOwner({ ...owner, owner_name: e.target.value }); setOwnerDirty(true); }} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Owner phone</label>
              <Input value={owner.owner_phone} disabled={!canEditOwnerAndStatus}
                onChange={(e) => { setOwner({ ...owner, owner_phone: e.target.value }); setOwnerDirty(true); }} />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-muted-foreground">Owner email</label>
              <Input type="email" value={owner.owner_email} disabled={!canEditOwnerAndStatus}
                onChange={(e) => { setOwner({ ...owner, owner_email: e.target.value }); setOwnerDirty(true); }} />
            </div>
          </div>
          {canEditOwnerAndStatus && ownerDirty && (
            <Button size="sm" onClick={() => saveOwner.mutate()} disabled={saveOwner.isPending}>
              <Save className="h-3 w-3 mr-1" /> Save owner details
            </Button>
          )}
          {!canEditOwnerAndStatus && !ticket.owner_name && (
            <p className="text-xs text-muted-foreground">Waiting for the QuickApp team to assign an owner.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium">Conversation</h3>
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className={`text-sm rounded-md px-3 py-2 ${c.user_id === ticket.created_by ? "bg-muted/50" : "bg-primary/5 border border-primary/20"}`}>
              <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
                {c.user_id === ticket.created_by ? "You" : "QuickApp team"}
              </div>
              <div className="whitespace-pre-wrap">{c.body}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), "MMM d, HH:mm")}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <Textarea placeholder="Add a reply..." rows={2} value={comment} onChange={(e) => setComment(e.target.value)} />
            <Button size="icon" disabled={!comment.trim() || addComment.isPending} onClick={() => addComment.mutate()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}