import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Trash2, Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function IdeaDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { hasAdminAccess } = useAdminAccess();
  const qc = useQueryClient();
  const [newComment, setNewComment] = useState("");

  const { data: idea, isLoading } = useQuery({
    queryKey: ["support_idea", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_ideas").select("*").eq("id", id).single();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["idea_comments", id],
    queryFn: async () => {
      const { data } = await supabase.from("support_idea_comments").select("*").eq("idea_id", id).order("created_at", { ascending: true });
      return data ?? [];
    },
  });

  const add = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const { error } = await supabase.from("support_idea_comments").insert({ idea_id: id, user_id: user.id, body: newComment });
      if (error) throw error;
    },
    onSuccess: () => { setNewComment(""); qc.invalidateQueries({ queryKey: ["idea_comments", id] }); },
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("support_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Idea deleted"); navigate("/support/ideas"); },
    onError: (e: any) => toast.error(e.message || "Delete failed"),
  });

  if (isLoading || !idea) return <div className="text-sm text-muted-foreground">Loading...</div>;
  const canDelete = !!user && (hasAdminAccess || idea.created_by === user.id);

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild><Link to="/support/ideas"><ArrowLeft className="h-4 w-4 mr-1" /> Back to ideas</Link></Button>
        {canDelete && (
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Delete this idea?")) del.mutate(); }}>
            <Trash2 className="h-4 w-4 mr-1" /> Delete
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-6 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="capitalize">{idea.status?.replace("_", " ")}</Badge>
            {idea.idea_type && <Badge className="bg-primary/10 text-primary border-0">{idea.idea_type}</Badge>}
            {idea.impact && <Badge className="bg-accent-gold/10 text-foreground border border-accent-gold/30">Impact: {idea.impact}</Badge>}
            {idea.category && <Badge variant="secondary">{idea.category}</Badge>}
          </div>
          <h1 className="text-2xl font-bold">{idea.title}</h1>
          <div className="text-xs text-muted-foreground">{format(new Date(idea.created_at), "MMM d, yyyy HH:mm")}</div>
          {idea.description && <p className="whitespace-pre-wrap text-sm border-t pt-3">{idea.description}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Comments</h3>
          {comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
          {comments.map((c: any) => (
            <div key={c.id} className="text-sm bg-muted/50 rounded-md px-3 py-2">
              <div className="whitespace-pre-wrap">{c.body}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), "MMM d, HH:mm")}</div>
            </div>
          ))}
          <div className="flex gap-2">
            <Input placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
            <Button size="icon" disabled={!newComment.trim() || add.isPending} onClick={() => add.mutate()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}