import { useState, useRef, useEffect } from "react";
import { Task, Sprint, Milestone, Section, useUpdateTask, useDeleteTask, useCreateTask, useCreateSection, useDeleteSection, useTaskDependencies, useTaskAttachments } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Plus, Search, MoreVertical, Trash2, ChevronRight, ChevronDown, Paperclip, GitBranch, Calendar } from "lucide-react";
import { format, isToday, isYesterday, startOfWeek, endOfWeek, addWeeks, startOfMonth, endOfMonth, isBefore, startOfDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  sprints: Sprint[];
  milestones: Milestone[];
  projectId: string;
  sections: Section[];
  onTaskClick?: (task: Task) => void;
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

function isTaskOverdue(task: Task): boolean {
  if (!task.due_date) return false;
  if (['done', 'backlog'].includes(task.status)) return false;
  return isBefore(new Date(task.due_date), startOfDay(new Date()));
}

// ── Inline Due Date Picker ──────────────────────────────
function InlineDueDatePicker({ task }: { task: Task }) {
  const updateTask = useUpdateTask();
  const [open, setOpen] = useState(false);
  const dateObj = task.due_date ? new Date(task.due_date + "T00:00:00") : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className={cn(
            "text-xs whitespace-nowrap hover:text-primary transition-colors",
            isTaskOverdue(task) ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"
          )}
        >
          {task.due_date ? format(new Date(task.due_date), "MMM d") : "—"}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" onClick={e => e.stopPropagation()}>
        <CalendarComponent
          mode="single"
          selected={dateObj}
          onSelect={(d) => {
            if (d) {
              updateTask.mutate({ id: task.id, due_date: format(d, "yyyy-MM-dd") });
            }
            setOpen(false);
          }}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
        {task.due_date && (
          <div className="px-3 pb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTask.mutate({ id: task.id, due_date: null });
                setOpen(false);
              }}
              className="text-xs text-destructive hover:underline"
            >
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Dependency indicator ──────────────────────────────
function DependencyIndicator({ taskId, allTasks }: { taskId: string; allTasks: Task[] }) {
  const { data: deps = [] } = useTaskDependencies(taskId);
  if (deps.length === 0) return <span className="text-xs text-muted-foreground">—</span>;

  const firstDep = deps[0] as any;
  const firstTask = allTasks.find(t => t.id === firstDep.depends_on_task_id);
  const firstName = firstTask?.title || "Unknown";
  const truncated = firstName.length > 14 ? firstName.slice(0, 14) + "…" : firstName;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <GitBranch className="w-3 h-3 flex-shrink-0" />
      <span className="truncate max-w-[100px]">{truncated}</span>
      {deps.length > 1 && (
        <span className="text-[10px] font-medium text-primary">+({deps.length - 1})</span>
      )}
    </div>
  );
}

// ── Attachment indicator ──────────────────────────────
function AttachmentIndicator({ taskId }: { taskId: string }) {
  const { data: attachments = [] } = useTaskAttachments(taskId);
  if (attachments.length === 0) return null;
  return (
    <div className="flex items-center gap-0.5 text-muted-foreground" title={`${attachments.length} attachment(s)`}>
      <Paperclip className="w-3 h-3" />
      {attachments.length > 1 && <span className="text-[10px]">{attachments.length}</span>}
    </div>
  );
}

export function BacklogView({ tasks, sprints, milestones, projectId, sections, onTaskClick }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const createTask = useCreateTask();
  const createSection = useCreateSection();
  const deleteSection = useDeleteSection();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dueDateFilter, setDueDateFilter] = useState<DueDateFilter>("all");
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  useEffect(() => {
    tasks.forEach(task => {
      if (isTaskOverdue(task) && task.status !== 'overdue') {
        updateTask.mutate({ id: task.id, status: 'overdue' });
      }
    });
  }, [tasks]);
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

  const [inlineAddTarget, setInlineAddTarget] = useState<{ sectionId: string | null; parentTaskId: string | null } | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [showAddSection, setShowAddSection] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const sectionInputRef = useRef<HTMLInputElement>(null);

  const rootTasks = tasks.filter(t => !t.parent_task_id);
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);

  const filterTask = (t: Task) => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    const matchDue = matchesDueDateFilter(t.due_date, dueDateFilter);
    return matchSearch && matchType && matchStatus && matchDue;
  };

  const sectionGroups: { id: string; name: string; tasks: Task[] }[] = [];
  sections.forEach(s => {
    sectionGroups.push({ id: s.id, name: s.name, tasks: rootTasks.filter(t => t.section_id === s.id && filterTask(t)) });
  });
  const unsectioned = rootTasks.filter(t => !t.section_id && filterTask(t));
  if (unsectioned.length > 0 || sections.length === 0) {
    sectionGroups.unshift({ id: "__unsectioned", name: "No section", tasks: unsectioned });
  }

  const toggleSection = (id: string) => {
    setCollapsedSections(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleTaskExpand = (id: string) => {
    setExpandedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleInlineSubmit = async () => {
    if (!inlineTitle.trim()) { setInlineAddTarget(null); setInlineTitle(""); return; }
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: inlineAddTarget?.parentTaskId || undefined,
      section_id: inlineAddTarget?.sectionId === "__unsectioned" ? undefined : (inlineAddTarget?.sectionId || undefined),
      title: inlineTitle.trim(),
      type: "task",
      status: "backlog",
      priority: "medium",
    });
    setInlineTitle("");
  };

  const startInlineAdd = (sectionId: string | null, parentTaskId: string | null = null) => {
    setInlineAddTarget({ sectionId, parentTaskId });
    setInlineTitle("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const handleAddSection = async () => {
    if (!newSectionName.trim()) { setShowAddSection(false); return; }
    await createSection.mutateAsync({ project_id: projectId, name: newSectionName.trim(), position: sections.length });
    setNewSectionName("");
    setShowAddSection(false);
  };

  const TaskRow = ({ task, depth = 0, sectionId }: { task: Task; depth?: number; sectionId: string }) => {
    const subtasks = getSubtasks(task.id);
    const isExpanded = expandedTasks.has(task.id);
    const isInlineTarget = inlineAddTarget?.parentTaskId === task.id;
    return (
      <>
        <tr
          className="border-b hover:bg-muted/30 transition-colors group cursor-pointer"
          onClick={() => onTaskClick?.(task)}
        >
          {/* Name */}
          <td className="py-2 px-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {subtasks.length > 0 ? (
                <button onClick={e => { e.stopPropagation(); toggleTaskExpand(task.id); }} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : <span className="w-3.5" />}
              <span className={cn("text-sm font-medium truncate", isTaskOverdue(task) ? "text-red-600 dark:text-red-400" : "text-foreground")}>{task.title}</span>
              <AttachmentIndicator taskId={task.id} />
            </div>
          </td>
          {/* Due date - clickable */}
          <td className="py-2 px-3">
            <InlineDueDatePicker task={task} />
          </td>
          {/* Status */}
          <td className="py-2 px-3 whitespace-nowrap">
            <select
              value={task.status}
              onClick={e => e.stopPropagation()}
              onChange={e => updateTask.mutate({ id: task.id, status: e.target.value as any })}
              className="text-xs bg-transparent border-none outline-none cursor-pointer"
            >
              {["backlog","todo","in_progress","in_review","done","cancelled","overdue"].map(s => (
                <option key={s} value={s}>{s.replace(/_/g,' ')}</option>
              ))}
            </select>
          </td>
          {/* Owner */}
          <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap">
            {task.assignee ? (
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-[10px] font-medium">
                  {task.assignee.full_name?.charAt(0) ?? "?"}
                </div>
                <span className="truncate max-w-[100px]">{task.assignee.full_name}</span>
              </div>
            ) : "—"}
          </td>
          {/* Est. Hours */}
          <td className="py-2 px-3 text-xs text-muted-foreground whitespace-nowrap text-center">
            {task.estimated_hours ? `${task.estimated_hours}h` : "—"}
          </td>
          {/* Dependencies */}
          <td className="py-2 px-3 whitespace-nowrap">
            <DependencyIndicator taskId={task.id} allTasks={tasks} />
          </td>
          {/* Priority */}
          <td className="py-2 px-3"><PriorityBadge priority={task.priority} /></td>
          {/* Actions */}
          <td className="py-2 px-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100" onClick={e => e.stopPropagation()}>
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => startInlineAdd(sectionId, task.id)}>
                  <Plus className="w-3.5 h-3.5 mr-2" /> Add subtask
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate({ id: task.id, projectId })}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {isExpanded && subtasks.map(sub => <TaskRow key={sub.id} task={sub} depth={depth + 1} sectionId={sectionId} />)}
        {isExpanded && isInlineTarget && (
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
                    if (e.key === "Escape") { setInlineAddTarget(null); setInlineTitle(""); }
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
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
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
            <SelectItem value="overdue">Overdue</SelectItem>
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

      {/* Section-based list */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="text-left py-2.5 px-4 text-xs font-semibold text-muted-foreground">Name</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground w-24">Due date</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground w-28">Status</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground">Owner</th>
              <th className="text-center py-2.5 px-3 text-xs font-semibold text-muted-foreground w-16">Hours</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground w-36">Depends on</th>
              <th className="text-left py-2.5 px-3 text-xs font-semibold text-muted-foreground w-20">Priority</th>
              <th className="py-2.5 px-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {sectionGroups.map(group => {
              const isCollapsed = collapsedSections.has(group.id);
              const isInlineForSection = inlineAddTarget?.sectionId === group.id && !inlineAddTarget?.parentTaskId;
              return (
                <SectionGroup
                  key={group.id}
                  group={group}
                  isCollapsed={isCollapsed}
                  onToggle={() => toggleSection(group.id)}
                  onDeleteSection={group.id !== "__unsectioned" ? () => deleteSection.mutate({ id: group.id, projectId }) : undefined}
                  isInlineAdd={isInlineForSection}
                  inlineTitle={inlineTitle}
                  inputRef={inputRef}
                  onInlineTitleChange={setInlineTitle}
                  onInlineSubmit={handleInlineSubmit}
                  onCancelInline={() => { setInlineAddTarget(null); setInlineTitle(""); }}
                  onStartInlineAdd={() => startInlineAdd(group.id)}
                  TaskRowComponent={TaskRow}
                  sectionId={group.id}
                  expandedTasks={expandedTasks}
                  inlineAddTarget={inlineAddTarget}
                />
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add section */}
      <div className="px-1">
        {showAddSection ? (
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-muted-foreground" />
            <input
              ref={sectionInputRef}
              autoFocus
              value={newSectionName}
              onChange={e => setNewSectionName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleAddSection();
                if (e.key === "Escape") { setShowAddSection(false); setNewSectionName(""); }
              }}
              onBlur={handleAddSection}
              placeholder="New section name..."
              className="flex-1 text-sm font-semibold bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        ) : (
          <button
            onClick={() => { setShowAddSection(true); setTimeout(() => sectionInputRef.current?.focus(), 50); }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add section
          </button>
        )}
      </div>
    </div>
  );
}

// ── Section group row ──────────────────────────────────────────────
function SectionGroup({ group, isCollapsed, onToggle, onDeleteSection, isInlineAdd, inlineTitle, inputRef, onInlineTitleChange, onInlineSubmit, onCancelInline, onStartInlineAdd, TaskRowComponent, sectionId }: {
  group: { id: string; name: string; tasks: Task[] };
  isCollapsed: boolean;
  onToggle: () => void;
  onDeleteSection?: () => void;
  isInlineAdd: boolean;
  inlineTitle: string;
  inputRef: React.RefObject<HTMLInputElement>;
  onInlineTitleChange: (v: string) => void;
  onInlineSubmit: () => void;
  onCancelInline: () => void;
  onStartInlineAdd: () => void;
  TaskRowComponent: any;
  sectionId: string;
  expandedTasks: Set<string>;
  inlineAddTarget: any;
}) {
  return (
    <>
      {/* Section header */}
      <tr className="bg-muted/20 border-b">
        <td colSpan={8} className="py-2 px-4">
          <div className="flex items-center gap-2">
            <button onClick={onToggle} className="text-muted-foreground hover:text-foreground">
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <span className="text-sm font-bold text-foreground">{group.name}</span>
            <span className="text-xs text-muted-foreground">({group.tasks.length})</span>
            {onDeleteSection && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem className="text-destructive" onClick={onDeleteSection}>
                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete section
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </td>
      </tr>

      {/* Tasks in section */}
      {!isCollapsed && group.tasks.map(task => (
        <TaskRowComponent key={task.id} task={task} sectionId={sectionId} />
      ))}

      {/* Inline add row */}
      {!isCollapsed && (
        <tr className="border-b hover:bg-muted/10 transition-colors">
          <td colSpan={8} className="py-1.5 px-4">
            {isInlineAdd ? (
              <div className="flex items-center gap-2 pl-6">
                <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  autoFocus
                  value={inlineTitle}
                  onChange={e => onInlineTitleChange(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") onInlineSubmit();
                    if (e.key === "Escape") onCancelInline();
                  }}
                  onBlur={onInlineSubmit}
                  placeholder="Type task name and press Enter..."
                  className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
                />
              </div>
            ) : (
              <button
                onClick={onStartInlineAdd}
                className="w-full text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 pl-6 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add task...
              </button>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
