import { useState, useRef } from "react";
import { Task, Sprint, Milestone, Section, useUpdateTask, useDeleteTask, useCreateTask } from "@/hooks/useProjects";
import { useSections } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { TaskDetailPanel } from "./TaskDetailPanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Trash2, ChevronRight, ChevronDown } from "lucide-react";
import { format, isToday, isYesterday, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  sprints: Sprint[];
  milestones: Milestone[];
  projectId: string;
}

type DueDateFilter = "all" | "today" | "yesterday" | "this_week" | "next_week" | "this_month";

function matchesDueDateFilter(dueDate: string | undefined, filter: DueDateFilter): boolean {
  if (filter === "all") return true;
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const now = new Date();
  switch (filter) {
    case "today": return isToday(d);
    case "yesterday": return isYesterday(d);
    case "this_week": return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 });
    case "next_week": {
      const nw = addWeeks(now, 1);
      return d >= startOfWeek(nw, { weekStartsOn: 1 }) && d <= endOfWeek(nw, { weekStartsOn: 1 });
    }
    case "this_month": return d >= startOfMonth(now) && d <= endOfMonth(now);
    default: return true;
  }
}

export function BacklogView({ tasks, sprints, milestones, projectId }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Inline add state
  const [inlineParentId, setInlineParentId] = useState<string | null>(null);
  const [inlineType, setInlineType] = useState<"task" | "subtask">("task");
  const [inlineTitle, setInlineTitle] = useState("");
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const rootTasks = tasks.filter(t => !t.parent_task_id);
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);

  const filtered = rootTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchDue = matchesDueDateFilter(t.due_date, dueDateFilter);
    return matchSearch && matchType && matchStatus && matchDue;
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const handleInlineSubmit = async () => {
    if (!inlineTitle.trim()) {
      setShowInlineAdd(false);
      setInlineTitle("");
      return;
    }
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: inlineParentId || undefined,
      title: inlineTitle.trim(),
      type: inlineType === "subtask" ? "task" : "task",
      status: "backlog",
      priority: "medium",
    });
    // After saving, show a new inline row
    setInlineTitle("");
    // Keep inline add visible for chaining
  };

  const startInlineAdd = (parentId: string | null = null, type: "task" | "subtask" = "task") => {
    setInlineParentId(parentId);
    setInlineType(type);
    setShowInlineAdd(true);
    setInlineTitle("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const TaskRow = ({ task, depth = 0 }: { task: Task; depth?: number }) => {
    const subtasks = getSubtasks(task.id);
    const isExpanded = expanded.has(task.id);
    const isSelected = selectedTask?.id === task.id;
    return (
      <>
        <tr
          className={cn(
            "border-b hover:bg-muted/30 transition-colors group cursor-pointer",
            isSelected && "bg-primary/5"
          )}
          onClick={() => setSelectedTask(task)}
        >
          <td className="py-2.5 px-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {subtasks.length > 0 ? (
                <button onClick={e => { e.stopPropagation(); toggleExpand(task.id); }} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : <span className="w-3.5" />}
              <TypeBadge type={task.type} />
              <span className="text-sm text-foreground font-medium">{task.title}</span>
            </div>
          </td>
          <td className="py-2.5 px-3 whitespace-nowrap">
            <select
              value={task.status}
              onClick={e => e.stopPropagation()}
              onChange={e => updateTask.mutate({ id: task.id, status: e.target.value as any })}
              className="text-xs bg-transparent border-none outline-none cursor-pointer"
            >
              {["backlog","todo","in_progress","in_review","done","cancelled"].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
              ))}
            </select>
          </td>
          <td className="py-2.5 px-3"><PriorityBadge priority={task.priority} /></td>
          <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
            {task.assignee?.full_name ?? "—"}
          </td>
          <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
            {task.due_date ? format(new Date(task.due_date), "MMM d") : "—"}
          </td>
          <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
            {task.estimated_hours ? `${task.estimated_hours}h` : "—"}
          </td>
          <td className="py-2.5 px-3 text-xs text-muted-foreground">
            {task.story_points ? `${task.story_points} pts` : "—"}
          </td>
          <td className="py-2.5 px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startInlineAdd(task.id, "subtask")}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add subtask
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate({ id: task.id, projectId })}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {isExpanded && subtasks.map(sub => <TaskRow key={sub.id} task={sub} depth={depth + 1} />)}
        {/* Inline subtask add row after this task's subtasks */}
        {isExpanded && showInlineAdd && inlineParentId === task.id && (
          <tr className="border-b bg-muted/10">
            <td colSpan={8} className="py-1.5 px-4">
              <div className="flex items-center gap-2" style={{ paddingLeft: `${(depth + 1) * 20}px` }}>
                <span className="w-3.5" />
                <span className="text-xs text-muted-foreground">↳ subtask</span>
                <input
                  ref={inputRef}
                  autoFocus
                  value={inlineTitle}
                  onChange={e => setInlineTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleInlineSubmit();
                    if (e.key === "Escape") { setShowInlineAdd(false); setInlineTitle(""); }
                  }}
                  onBlur={() => handleInlineSubmit()}
                  placeholder="Type subtask name and press Enter..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="flex gap-0 h-full">
      {/* Main table area */}
      <div className={cn("flex-1 space-y-4 transition-all", selectedTask ? "pr-0" : "")}>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search tasks..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="task">Task</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="idea">Idea</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="backlog">Backlog</SelectItem>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dueDateFilter} onValueChange={v => setDueDateFilter(v as DueDateFilter)}>
            <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Due Date" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This Week</SelectItem>
              <SelectItem value="next_week">Next Week</SelectItem>
              <SelectItem value="this_month">This Month</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="border rounded-xl overflow-hidden bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">Task</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Status</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Priority</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Assignee</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Due</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Est.</th>
                <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Points</th>
                <th className="py-2.5 px-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && !showInlineAdd ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                    No tasks found. Press Enter below to add one.
                  </td>
                </tr>
              ) : (
                filtered.map(task => <TaskRow key={task.id} task={task} />)
              )}

              {/* Inline add row at bottom for root tasks */}
              {(!showInlineAdd || inlineParentId === null) && (
                <tr className="border-b bg-muted/5 hover:bg-muted/20 transition-colors">
                  <td colSpan={8} className="py-2 px-4">
                    {showInlineAdd && inlineParentId === null ? (
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                        <input
                          ref={inputRef}
                          autoFocus
                          value={inlineTitle}
                          onChange={e => setInlineTitle(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleInlineSubmit();
                            if (e.key === "Escape") { setShowInlineAdd(false); setInlineTitle(""); }
                          }}
                          onBlur={() => handleInlineSubmit()}
                          placeholder="Type task name and press Enter..."
                          className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startInlineAdd(null, "task")}
                        className="w-full text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add task...
                      </button>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Task Detail Side Panel */}
      {selectedTask && (
        <div className="w-96 flex-shrink-0 border-l">
          <TaskDetailPanel
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            projectId={projectId}
            allTasks={tasks}
            onSelectTask={(t) => setSelectedTask(t)}
          />
        </div>
      )}
    </div>
  );
}
