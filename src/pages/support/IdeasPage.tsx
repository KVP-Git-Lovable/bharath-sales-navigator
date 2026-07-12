import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronUp, MessageCircle, Plus, Lightbulb, Send } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  planned: "bg-purple-100 text-purple-800",
  shipped: "bg-emerald-100 text-emerald-800",
  declined: "bg-red-100 text-red-800",
};

export default function IdeasPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["support_ideas"],
    queryFn: async () => {
      const [{ data: rows, error }, { data: votes }, { data: comments }] = await Promise.all([
        supabase.from("support_ideas").select("*").order("created_at", { ascending: false }),
        supabase.from("support_idea_votes").select("idea_id, user_id"),
        supabase.from("support_idea_comments").select("id, idea_id"),
      ]);
      if (error) throw error;
      const voteMap: Record<string, { count: number; mine: boolean }> = {};
      (votes ?? []).forEach((v: any) => {
        voteMap[v.idea_id] ||= { count: 0, mine: false };
        voteMap[v.idea_id].count++;
        if (v.user_id === user?.id) voteMap[v.idea_id].mine = true;
      });
      const commentMap: Record<string, number> = {};
      (comments ?? []).forEach((c: any) => (commentMap[c.idea_id] = (commentMap[c.idea_id] ?? 0) + 1));
      return (rows ?? []).map((r: any) => ({
        ...r,
        votes: voteMap[r.id]?.count ?? 0,
        voted: voteMap[r.id]?.mine ?? false,
        commentCount: commentMap[r.id] ?? 0,
      }));
    },
  });

  const createIdea = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("support_ideas").insert({
        title, description, category: category || null, created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["support_ideas"] });
      setOpen(false); setTitle(""); setDescription(""); setCategory("");
      toast.success("Idea submitted");
    },
    onError: (e: any) => toast.error(e.message || "Failed to submit"),
  });

  const toggleVote = useMutation({
    mutationFn: async ({ ideaId, voted }: { ideaId: string; voted: boolean }) => {
      if (!user) return;
      if (voted) {
        await supabase.from("support_idea_votes").delete().eq("idea_id", ideaId).eq("user_id", user.id);
      } else {
        await supabase.from("support_idea_votes").insert({ idea_id: ideaId, user_id: user.id });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["support_ideas"] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Lightbulb className="h-6 w-6 text-accent-gold" /> Ideas
          </h1>
          <p className="text-sm text-muted-foreground">Share what should be built next. Vote and comment on ideas from the community.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> New idea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit an idea</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Short title" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="What problem does it solve? How should it work?" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
              <Input placeholder="Category (optional)" value={category} onChange={(e) => setCategory(e.target.value)} />
              <Button className="w-full" disabled={!title.trim() || createIdea.isPending} onClick={() => createIdea.mutate()}>Submit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading ideas...</div>
      ) : ideas.length === 0 ? (
        <Card><CardContent className="p-10 text-center text-muted-foreground">No ideas yet. Be the first to share one!</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea: any) => (
            <Card key={idea.id}>
              <CardContent className="p-4">
                <div className="flex gap-4">
                  <button
                    onClick={() => toggleVote.mutate({ ideaId: idea.id, voted: idea.voted })}
                    className={`flex flex-col items-center rounded-lg border px-3 py-2 min-w-[64px] transition-colors ${idea.voted ? "bg-accent-gold/10 border-accent-gold text-accent-gold" : "hover:bg-muted"}`}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="text-sm font-semibold">{idea.votes}</span>
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold text-foreground">{idea.title}</h3>
                        {idea.description && <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{idea.description}</p>}
                      </div>
                      <Badge className={`text-[10px] capitalize ${statusColors[idea.status] || ""}`}>{idea.status.replace("_", " ")}</Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      {idea.category && <span className="px-2 py-0.5 rounded bg-muted">{idea.category}</span>}
                      <span>{format(new Date(idea.created_at), "MMM d, yyyy")}</span>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => setExpanded(expanded === idea.id ? null : idea.id)}
                      >
                        <MessageCircle className="h-3.5 w-3.5" />
                        {idea.commentCount} comments
                      </button>
                    </div>
                    {expanded === idea.id && (
                      <IdeaComments ideaId={idea.id} userId={user?.id} newComment={newComment} setNewComment={setNewComment} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function IdeaComments({ ideaId, userId, newComment, setNewComment }: any) {
  const qc = useQueryClient();
  const { data: comments = [] } = useQuery({
    queryKey: ["idea_comments", ideaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("support_idea_comments").select("*").eq("idea_id", ideaId).order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });
  const add = useMutation({
    mutationFn: async (body: string) => {
      if (!userId) return;
      const { error } = await supabase.from("support_idea_comments").insert({ idea_id: ideaId, user_id: userId, body });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["idea_comments", ideaId] });
      qc.invalidateQueries({ queryKey: ["support_ideas"] });
      setNewComment("");
    },
  });
  return (
    <div className="mt-4 border-t pt-3 space-y-2">
      {comments.map((c: any) => (
        <div key={c.id} className="text-sm bg-muted/50 rounded-md px-3 py-2">
          <div className="whitespace-pre-wrap">{c.body}</div>
          <div className="text-[10px] text-muted-foreground mt-1">{format(new Date(c.created_at), "MMM d, HH:mm")}</div>
        </div>
      ))}
      <div className="flex gap-2">
        <Input placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} />
        <Button size="icon" disabled={!newComment.trim()} onClick={() => add.mutate(newComment.trim())}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}