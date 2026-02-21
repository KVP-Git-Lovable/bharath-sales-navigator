import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Lightbulb, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Props {
  projectId: string;
}

const statusColors: Record<string, string> = {
  submitted: "bg-blue-100 text-blue-800",
  under_review: "bg-yellow-100 text-yellow-800",
  approved: "bg-green-100 text-green-800",
  implemented: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};

export function IdeasPanel({ projectId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  const { data: ideas = [], isLoading } = useQuery({
    queryKey: ["pm_ideas", projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_ideas")
        .select("*, profiles:submitted_by(full_name)")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createIdea = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("pm_ideas").insert({
        project_id: projectId,
        title,
        description,
        priority,
        submitted_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm_ideas", projectId] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setPriority("medium");
      toast.success("Idea submitted");
    },
    onError: () => toast.error("Failed to submit idea"),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("pm_ideas").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm_ideas", projectId] });
      toast.success("Status updated");
    },
  });

  const deleteIdea = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pm_ideas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm_ideas", projectId] });
      toast.success("Idea deleted");
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" /> Ideas
        </h2>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1"><Plus className="w-4 h-4" /> New Idea</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Submit an Idea</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <Input placeholder="Idea title" value={title} onChange={e => setTitle(e.target.value)} />
              <Textarea placeholder="Describe your idea..." value={description} onChange={e => setDescription(e.target.value)} />
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={() => createIdea.mutate()} disabled={!title.trim() || createIdea.isPending} className="w-full">
                Submit Idea
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : ideas.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No ideas yet. Be the first to share one!</div>
      ) : (
        <div className="space-y-3">
          {ideas.map((idea: any) => (
            <Card key={idea.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground">{idea.title}</h3>
                    {idea.description && <p className="text-sm text-muted-foreground mt-1">{idea.description}</p>}
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <span>{idea.profiles?.full_name || "Unknown"}</span>
                      <span>·</span>
                      <span>{format(new Date(idea.created_at), "MMM d, yyyy")}</span>
                      <Badge variant="outline" className="text-[10px]">{idea.priority}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={idea.status} onValueChange={(status) => updateStatus.mutate({ id: idea.id, status })}>
                      <SelectTrigger className="h-7 text-xs w-32">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] ${statusColors[idea.status] || ""}`}>
                          {idea.status.replace("_", " ")}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        {["submitted", "under_review", "approved", "implemented", "rejected"].map(s => (
                          <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteIdea.mutate(idea.id)}>
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
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
