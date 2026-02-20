import { useState, useEffect, useRef } from "react";
import { Task, useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { TaskSubtasks } from "./TaskSubtasks";
import { TaskAttachments } from "./TaskAttachments";
import { TaskDependencies } from "./TaskDependencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Check, Calendar, Trash2, Search, Maximize2, Paperclip, Link2, Copy, MoreHorizontal, ThumbsUp, Plus, GitBranch, Move } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Reusable User Picker Field ──────────────────────────────
function UserPickerField({ label, currentUser, onSave }: {
  label: string;
  currentUser?: { full_name: string; profile_picture_url?: string } | null;
  onSave: (userId: string | null) => void;
}) {
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
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">{label}</span>
      <div className="relative" ref={searchRef}>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="flex items-center gap-2 text-sm hover:bg-muted/50 px-2 py-1.5 rounded-md transition-colors"
        >
          {currentUser ? (
            <>
              <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center text-primary text-xs font-semibold">
                {currentUser.full_name?.charAt(0) ?? "?"}
              </div>
              <span className="text-foreground">{currentUser.full_name}</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">Unassigned</span>
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
            {currentUser && (
              <button
                onClick={() => { onSave(null); setShowSearch(false); setQuery(""); }}
                className="w-full text-left text-xs text-destructive px-2 py-1.5 rounded hover:bg-muted transition-colors mb-1"
              >
                Remove
              </button>
            )}
            {results.map(u => (
              <button
                key={u.id}
                onClick={() => { onSave(u.id); setShowSearch(false); setQuery(""); }}
                className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[10px] font-semibold">
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

// ── Date Picker Field ──────────────────────────────
function DatePickerField({ label, value, onChange, onClear }: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const dateObj = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background text-sm transition-colors hover:bg-accent hover:text-accent-foreground flex-1 text-left",
              !value && "text-muted-foreground"
            )}
          >
            <Calendar className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            {value ? format(dateObj!, "MMM d, yyyy") : "Pick a date"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" side="bottom">
          <CalendarComponent
            mode="single"
            selected={dateObj}
            onSelect={(d) => {
              if (d) {
                const formatted = format(d, "yyyy-MM-dd");
                onChange(formatted);
              }
              setOpen(false);
            }}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {value && (
        <button onClick={onClear} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
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
  const createTask = useCreateTask();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description || "");
  const [startDate, setStartDate] = useState(task.start_date || "");
  const [dueDate, setDueDate] = useState(task.due_date || "");
  const [status, setStatus] = useState(task.status);
  const [priority, setPriority] = useState(task.priority);
  const [estimatedHours, setEstimatedHours] = useState(task.estimated_hours?.toString() || "");
  
  const panelRef = useRef<HTMLDivElement>(null);

  // Sync state when task changes
  useEffect(() => {
    setTitle(task.title);
    setDescription(task.description || "");
    setStartDate(task.start_date || "");
    setDueDate(task.due_date || "");
    setStatus(task.status);
    setPriority(task.priority);
    setEstimatedHours(task.estimated_hours?.toString() || "");
  }, [task.id]);

  // Escape key to close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

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

  const handleDuplicate = async () => {
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: task.parent_task_id || undefined,
      title: `${task.title} (copy)`,
      description: task.description || undefined,
      type: task.type,
      status: "todo",
      priority: task.priority,
      section_id: task.section_id || undefined,
      start_date: task.start_date || undefined,
      due_date: task.due_date || undefined,
      estimated_hours: task.estimated_hours || undefined,
      story_points: task.story_points || undefined,
      tags: task.tags || undefined,
    });
    toast.success("Task duplicated");
  };

  const handleAddSubtask = () => {
    const subtasksEl = document.getElementById("task-subtasks-section");
    subtasksEl?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSelectTask = (t: Task) => {
    onSelectTask?.(t);
  };

  const scrollToAttachments = () => {
    const el = document.getElementById("task-attachments-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToDependencies = () => {
    const el = document.getElementById("task-dependencies-section");
    el?.scrollIntoView({ behavior: "smooth" });
  };


  return (
    <div ref={panelRef} className="h-full flex flex-col bg-card">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-muted/20 flex-shrink-0">
        <Button
          variant={task.status === "done" ? "secondary" : "outline"}
          size="sm"
          className="gap-1.5 h-8 rounded-md font-medium text-xs"
          onClick={handleMarkComplete}
        >
          <Check className="w-3.5 h-3.5" />
          {task.status === "done" ? "Completed" : "Mark complete"}
        </Button>

        <div className="flex items-center gap-0.5 flex-shrink-0">
          <TooltipProvider delayDuration={300}>
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => toast.info("👍 Liked!")}>
                <ThumbsUp className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Like</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={scrollToAttachments}>
                <Paperclip className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Attachments</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={handleAddSubtask}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Add sub-task</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={scrollToDependencies}>
                <GitBranch className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Add dependency</TooltipContent></Tooltip>

            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onExpand}>
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Full view</TooltipContent></Tooltip>

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
                <DropdownMenuItem>
                  <Move className="w-3.5 h-3.5 mr-2" /> Move task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={handleDelete}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="w-px h-4 bg-border mx-1" />
            <Tooltip><TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </TooltipTrigger><TooltipContent side="bottom" className="text-xs">Close</TooltipContent></Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* Title */}
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          onBlur={() => { if (title !== task.title) handleSave("title", title); }}
          className="text-lg font-semibold w-full bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground leading-snug"
          placeholder="Task title"
        />

        {/* Meta fields — clean vertical stack */}
        <div className="space-y-3 bg-muted/20 rounded-lg p-4 border border-border/50">
          <UserPickerField label="Owner" currentUser={task.assignee} onSave={(userId) => handleSave("assignee_id", userId)} />
          <UserPickerField label="Collaborator" currentUser={task.collaborator} onSave={(userId) => handleSave("collaborator_id", userId)} />

          <div className="h-px bg-border/50" />

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">Status</span>
            <Select value={status} onValueChange={v => { setStatus(v as any); handleSave("status", v); }}>
              <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
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
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">Priority</span>
            <Select value={priority} onValueChange={v => { setPriority(v as any); handleSave("priority", v); }}>
              <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="critical">🔴 Critical</SelectItem>
                <SelectItem value="high">🟠 High</SelectItem>
                <SelectItem value="medium">🟡 Medium</SelectItem>
                <SelectItem value="low">🟢 Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">Type</span>
            <Select value={task.type} onValueChange={v => handleSave("type", v)}>
              <SelectTrigger className="h-9 flex-1 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="task">✅ Task</SelectItem>
                <SelectItem value="bug">🐛 Bug</SelectItem>
                <SelectItem value="idea">💡 Idea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-px bg-border/50" />

          <DatePickerField
            label="Start date"
            value={startDate}
            onChange={(v) => { setStartDate(v); handleSave("start_date", v); }}
            onClear={() => { setStartDate(""); handleSave("start_date", null); }}
          />

          <DatePickerField
            label="Due date"
            value={dueDate}
            onChange={(v) => { setDueDate(v); handleSave("due_date", v); }}
            onClear={() => { setDueDate(""); handleSave("due_date", null); }}
          />

          <div className="h-px bg-border/50" />

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">Est. Hours</span>
            <Input
              type="number"
              value={estimatedHours}
              onChange={e => setEstimatedHours(e.target.value)}
              onBlur={() => handleSave("estimated_hours", estimatedHours ? parseFloat(estimatedHours) : null)}
              className="h-9 flex-1 text-sm"
              placeholder="0"
            />
          </div>

          {task.story_points !== undefined && task.story_points !== null && (
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider w-24 flex-shrink-0">Points</span>
              <span className="text-sm">{task.story_points} pts</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</h3>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            onBlur={() => { if (description !== (task.description || "")) handleSave("description", description); }}
            placeholder="What is this task about?"
            className="min-h-[100px] text-sm resize-none"
          />
        </div>

        {/* Sub-tasks */}
        <div id="task-subtasks-section">
          <TaskSubtasks
            task={task}
            allTasks={allTasks}
            projectId={projectId}
            onSelectTask={handleSelectTask}
          />
        </div>

        {/* Dependencies */}
        <div id="task-dependencies-section">
          <TaskDependencies
            task={task}
            allTasks={allTasks}
            onSelectTask={handleSelectTask}
          />
        </div>

        {/* Attachments */}
        <div id="task-attachments-section">
          <TaskAttachments taskId={task.id} />
        </div>

        {/* Tags */}
        {task.tags && task.tags.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tags</h3>
            <div className="flex flex-wrap gap-1.5">
              {task.tags.map(tag => (
                <span key={tag} className="text-xs px-2.5 py-1 bg-secondary text-secondary-foreground rounded-full">{tag}</span>
              ))}
            </div>
          </div>
        )}

        {/* Created info */}
        <div className="text-xs text-muted-foreground pt-3 border-t space-y-0.5">
          <p>Created {format(new Date(task.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
          {task.updated_at && <p>Updated {format(new Date(task.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>}
        </div>
      </div>
    </div>
  );
}
