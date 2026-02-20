import { useState } from "react";
import { Sprint, Task } from "@/hooks/useProjects";
import { useCreateSprint } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Layers, Plus, Play, CheckCircle2, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

interface Props { projectId: string; sprints: Sprint[]; tasks: Task[]; }

const sprintStatusColor: Record<string, string> = {
  planning: "bg-blue-100 text-blue-700",
  active: "bg-green-100 text-green-700",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-red-100 text-red-700",
};

export function SprintsPanel({ projectId, sprints, tasks }: Props) {
  const createSprint = useCreateSprint();
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", goal: "", start_date: "", end_date: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createSprint.mutateAsync({
      project_id: projectId,
      name: form.name,
      goal: form.goal || undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
      status: "planning",
    });
    setForm({ name: "", goal: "", start_date: "", end_date: "" });
    setShowCreate(false);
  };

  // Auto-map tasks to sprints by due_date falling within sprint date range
  const getSprintTasks = (sprint: Sprint) => {
    if (!sprint.start_date || !sprint.end_date) return [];
    return tasks.filter(t => {
      if (!t.due_date) return false;
      return t.due_date >= sprint.start_date! && t.due_date <= sprint.end_date!;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" /> Sprints
        </h2>
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5">
          <Plus className="w-4 h-4" /> New Sprint
        </Button>
      </div>

      {sprints.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-xl">
          <Layers className="w-10 h-10 text-primary/40 mx-auto mb-2" />
          <p className="font-medium text-foreground">No sprints yet</p>
          <p className="text-sm text-muted-foreground">Create sprints to organize your work into time-boxed iterations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sprints.map(sprint => {
            const sprintTasks = getSprintTasks(sprint);
            const done = sprintTasks.filter(t => t.status === "done").length;
            const progress = sprintTasks.length > 0 ? Math.round((done / sprintTasks.length) * 100) : 0;
            const totalPoints = sprintTasks.reduce((sum, t) => sum + (t.story_points ?? 0), 0);
            const donePoints = sprintTasks.filter(t => t.status === "done").reduce((sum, t) => sum + (t.story_points ?? 0), 0);
            return (
              <div key={sprint.id} className="border rounded-xl overflow-hidden bg-card">
                <div className="flex items-center justify-between px-4 py-3 bg-muted/30 border-b">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground">{sprint.name}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", sprintStatusColor[sprint.status])}>
                      {sprint.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {sprint.start_date && sprint.end_date && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {format(parseISO(sprint.start_date), "MMM d")} – {format(parseISO(sprint.end_date), "MMM d")}
                      </span>
                    )}
                    {totalPoints > 0 && <span>{donePoints}/{totalPoints} pts</span>}
                  </div>
                </div>
                {sprint.goal && <p className="text-sm text-muted-foreground px-4 py-2 border-b italic">Goal: {sprint.goal}</p>}
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{done}/{sprintTasks.length} tasks completed</span>
                    <span className="font-medium text-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                  {sprintTasks.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {sprintTasks.slice(0, 5).map(t => (
                        <span key={t.id} className={cn(
                          "text-xs px-2 py-1 rounded",
                          t.status === "done" ? "bg-green-100 text-green-700 line-through opacity-60" : "bg-muted text-muted-foreground"
                        )}>
                          {t.title}
                        </span>
                      ))}
                      {sprintTasks.length > 5 && <span className="text-xs text-muted-foreground">+{sprintTasks.length - 5} more</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Sprint</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Sprint Name *</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required placeholder="e.g. Sprint 1" /></div>
            <div><Label>Sprint Goal</Label><Textarea value={form.goal} onChange={e => setForm(f => ({ ...f, goal: e.target.value }))} rows={2} placeholder="What will we achieve this sprint?" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Start Date</Label><Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button type="submit" disabled={createSprint.isPending}>Create Sprint</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
