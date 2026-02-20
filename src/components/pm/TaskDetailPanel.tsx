import { useState } from "react";
import { Task, useUpdateTask, useDeleteTask } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { TaskSubtasks } from "./TaskSubtasks";
import { TaskAttachments } from "./TaskAttachments";
import { TaskDependencies } from "./TaskDependencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Check, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Props {
  task: Task;
  onClose: () => void;
  projectId: string;
  allTasks?: Task[];
  onSelectTask?: (task: Task) => void;
}

export function TaskDetailPanel({ task, onClose, projectId, allTasks = [], onSelectTask }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours?.toString() || "");

  const handleSave = (field: string, value: any) => {
    updateTask.mutate({ id: task.id, [field]: value || null });
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id, projectId });
    onClose();
  };

  const handleMarkComplete = () => {
    const newStatus = task.status === "done" ? "todo" : "done";
    setStatus(newStatus);
    updateTask.mutate({ id: task.id, status: newStatus });
  };

  const handleSelectTask = (t: Task) => {
    onSelectTask?.(t);
  };

  return (
    <div className="h-full flex flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Button
          variant={task.status === "done" ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={handleMarkComplete}
        >
          <Check className="w-3.5 h-3.5" />
          {task.status === "done" ? "Completed" : "Mark complete"}
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={handleDelete}>
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title !== task.title) handleSave("title", title); }}
          className="text-lg font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground"
          placeholder="Task title"
        />

        {/* Meta fields */}
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Assignee</span>
            <div className="flex items-center gap-2">
              {task.assignee ? (
                <>
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                    {task.assignee.full_name?.charAt(0) ?? "?"}
                  </div>
                  <span className="text-sm">{task.assignee.full_name}</span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Unassigned</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Due date</span>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Input
                type="date"
                value={dueDate}
                onChange={e => {
                  setDueDate(e.target.value);
                  handleSave("due_date", e.target.value);
                }}
                className="h-8 w-40 text-sm"
              />
              {dueDate && (
                <button onClick={() => { setDueDate(""); handleSave("due_date", null); }} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Status</span>
            <Select value={status} onValueChange={v => { setStatus(v as any); handleSave("status", v); }}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="backlog">Backlog</SelectItem>
                <SelectItem value="todo">To Do</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Priority</span>
            <Select value={priority} onValueChange={v => { setPriority(v as any); handleSave("priority", v); }}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Type</span>
            <Select value={task.type} onValueChange={v => handleSave("type", v)}>
              <SelectTrigger className="h-8 w-40 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="task">✅ Task</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="idea">💡 Idea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Est. Hours</span>
            <Input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              onBlur={() => handleSave("estimated_hours", estimatedHours ? parseFloat(estimatedHours) : null)}
              className="h-8 w-24 text-sm"
              placeholder="0"
            />
          </div>

          {task.story_points !== undefined && task.story_points !== null && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Points</span>
              <span className="text-sm">{task.story_points} pts</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Description</h3>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => { if (description !== (task.description || "")) handleSave("description", description); }}
            placeholder="What is this task about?"
            className="min-h-[120px] text-sm"
          />
        </div>

        {/* Sub-tasks */}
        <TaskSubtasks
          task={task}
          allTasks={allTasks}
          projectId={projectId}
          onSelectTask={handleSelectTask}
        />

        {/* Attachments */}
        <TaskAttachments taskId={task.id} />

        {/* Dependencies */}
        <TaskDependencies
          task={task}
          allTasks={allTasks}
          onSelectTask={handleSelectTask}
        />

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Tags</h3>
            <div className="flex flex-wrap gap-1">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs px-2 py-0.5 bg-secondary text-secondary-foreground rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Created info */}
        <div className="text-xs text-muted-foreground pt-2 border-t space-y-1">
          <p>Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
          {task.updated_at && <p>Updated {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>}
        </div>
      </div>
    </div>
  );
}
