import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateTask, TaskStatus, TaskType, Priority, Sprint, Milestone } from "@/hooks/useProjects";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  sprints: Sprint[];
  milestones: Milestone[];
  parentTaskId?: string;
  defaultStatus?: TaskStatus;
}

export function CreateTaskModal({ open, onClose, projectId, sprints, milestones, parentTaskId, defaultStatus }: Props) {
  const createTask = useCreateTask();
  const [form, setForm] = useState({
    title: "",
    description: "",
    type: "task" as TaskType,
    status: (defaultStatus ?? "todo") as TaskStatus,
    priority: "medium" as Priority,
    sprint_id: "",
    milestone_id: "",
    start_date: "",
    due_date: "",
    estimated_hours: "",
    story_points: "",
    tagInput: "",
    tags: [] as string[],
  });

  const addTag = () => {
    const t = form.tagInput.trim();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t], tagInput: "" }));
    }
  };

  const removeTag = (tag: string) => setForm(f => ({ ...f, tags: f.tags.filter(t => t !== tag) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: parentTaskId ?? undefined,
      title: form.title,
      description: form.description || undefined,
      type: form.type,
      status: form.status,
      priority: form.priority,
      sprint_id: form.sprint_id || undefined,
      milestone_id: form.milestone_id || undefined,
      start_date: form.start_date || undefined,
      due_date: form.due_date || undefined,
      estimated_hours: form.estimated_hours ? parseFloat(form.estimated_hours) : undefined,
      story_points: form.story_points ? parseInt(form.story_points) : undefined,
      tags: form.tags.length ? form.tags : undefined,
    });
    setForm({ title: "", description: "", type: "task", status: defaultStatus ?? "todo", priority: "medium", sprint_id: "", milestone_id: "", start_date: "", due_date: "", estimated_hours: "", story_points: "", tagInput: "", tags: [] });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{parentTaskId ? "Add Subtask" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Title *</Label>
            <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Task title..." required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} placeholder="Details, acceptance criteria..." />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as TaskType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="epic">⚡ Epic</SelectItem>
                  <SelectItem value="story">📖 Story</SelectItem>
                  <SelectItem value="task">✅ Task</SelectItem>
                  <SelectItem value="bug">🐛 Bug</SelectItem>
                  <SelectItem value="idea">💡 Idea</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v as TaskStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="backlog">Backlog</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as Priority }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">🔴 Critical</SelectItem>
                  <SelectItem value="high">🟠 High</SelectItem>
                  <SelectItem value="medium">🟡 Medium</SelectItem>
                  <SelectItem value="low">🟢 Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {sprints.length > 0 && (
            <div>
              <Label>Sprint</Label>
              <Select value={form.sprint_id || "__none"} onValueChange={v => setForm(f => ({ ...f, sprint_id: v === "__none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="No sprint" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No sprint</SelectItem>
                  {sprints.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Est. Hours</Label>
              <Input type="number" placeholder="0" value={form.estimated_hours} onChange={e => setForm(f => ({ ...f, estimated_hours: e.target.value }))} />
            </div>
            <div>
              <Label>Story Points</Label>
              <Input type="number" placeholder="0" value={form.story_points} onChange={e => setForm(f => ({ ...f, story_points: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label>Tags</Label>
            <div className="flex gap-2 mt-1">
              <Input
                value={form.tagInput}
                onChange={e => setForm(f => ({ ...f, tagInput: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="Add tag, press Enter"
              />
              <Button type="button" variant="outline" onClick={addTag}>Add</Button>
            </div>
            {form.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)}><X className="w-3 h-3" /></button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={createTask.isPending}>
              {createTask.isPending ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
