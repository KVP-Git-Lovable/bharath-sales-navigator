import { useState, useEffect, useRef } from "react";
import { Task, useUpdateTask, useDeleteTask } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { TaskSubtasks } from "./TaskSubtasks";
import { TaskAttachments } from "./TaskAttachments";
import { TaskDependencies } from "./TaskDependencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Check, Calendar, Trash2, Search, Maximize2, Paperclip, Link2, Copy, MoreHorizontal, ThumbsUp } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── Task Owner Field with user lookup ──────────────────────────────
function TaskOwnerField({ task, onSave }: { task: Task; onSave: (userId: string | null) => void }) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string }[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const timeout = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .ilike("full_name", `%${query}%`)
        .limit(8);
      setResults(data || []);
    }, 250);
    return () => clearTimeout(timeout);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowSearch(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-muted-foreground w-24 flex-shrink-0">Task Owner</span>
      <div className="relative" ref={searchRef}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 text-sm hover:bg-muted px-2 py-1 rounded transition-colors"
        >
          {task.assignee ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                {task.assignee.full_name?.charAt(0) ?? "?"}
              </div>
              <span>{task.assignee.full_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Unassigned</span>
          )}
        </button>
        {showSearch && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-popover border rounded-lg shadow-lg z-50 p-2">
            <div className="flex items-center gap-2 border-b pb-2 mb-1">
              <Search className="w-3.5 h-3.5 text-muted-foreground" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search users..."
                className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
            {task.assignee && (
              <button
                onClick={() => { onSave(null); setShowSearch(false); setQuery(""); }}
                className="w-full text-left text-xs text-destructive px-2 py-1.5 rounded hover:bg-muted transition-colors mb-1"
              >
                Remove owner
              </button>
            )}
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => { onSave(u.id); setShowSearch(false); setQuery(""); }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-medium">
                  {u.full_name?.charAt(0) ?? "?"}
                </div>
                <span className="text-sm">{u.full_name}</span>
              </button>
            ))}
            {query && results.length === 0 && (
              <p className="text-xs text-muted-foreground px-2 py-1.5">No users found</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface Props {
  task: Task;
  onClose: () => void;
  projectId: string;
  allTasks?: Task[];
  onSelectTask?: (task: Task) => void;
  onExpand?: () => void;
}

export function TaskDetailPanel({ task, onClose, projectId, allTasks = [], onSelectTask, onExpand }: Props) {
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

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/projects/${projectId}?task=${task.id}`);
    toast.success("Task link copied");
  };

  const handleDuplicate = () => {
    // Duplicate by creating a new task with same fields
    const { id, created_at, updated_at, assignee, subtasks, ...rest } = task;
    updateTask; // just to reference
    toast.info("Duplicate not yet implemented");
  };

  const handleSelectTask = (t: Task) => {
    onSelectTask?.(t);
  };

  return (
    <div className="h-full flex flex-col bg-card">
      {/* Toolbar — Asana-style action bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/30">
        <Button
          variant={task.status === "done" ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 h-8 rounded-md font-medium text-xs shadow-sm"
          onClick={handleMarkComplete}
        >
          <Check className="w-3.5 h-3.5" />
          {task.status === "done" ? "Completed" : "Mark complete"}
        </Button>

        <div className="flex items-center gap-0.5">
          <TooltipProvider delayDuration={300}>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => toast.info("👍 Liked!")}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Like</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Attachments</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleCopyLink}>
                <Link2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Copy link</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onExpand}>
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Full screen</TooltipContent></Tooltip>

            {/* More menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={handleCopyLink}>
                  <Link2 className="w-3.5 h-3.5 mr-2" /> Copy task link
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDuplicate}>
                  <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Close / collapse panel */}
            <div className="w-px h-5 bg-border mx-1" />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Close</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title !== task.title) handleSave("title", title); }}
          className="text-xl font-bold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground leading-tight"
          placeholder="Task title"
        />

        {/* Meta fields */}
        <div className="space-y-3">
          <TaskOwnerField task={task} onSave={(userId) => handleSave("assignee_id", userId)} />

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
                <SelectItem value="overdue">Overdue</SelectItem>
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
