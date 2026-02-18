import { useState } from "react";
import { Task, Sprint, Milestone } from "@/hooks/useProjects";
import { useUpdateTask, useDeleteTask } from "@/hooks/useProjects";
import { CreateTaskModal } from "./CreateTaskModal";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Search, MoreVertical, Trash2, ChevronRight, ChevronDown, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  sprints: Sprint[];
  milestones: Milestone[];
  projectId: string;
}

export function BacklogView({ tasks, sprints, milestones, projectId }: Props) {
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);

  const rootTasks = tasks.filter(t => !t.parent_task_id);
  const getSubtasks = (parentId: string) => tasks.filter(t => t.parent_task_id === parentId);

  const filtered = rootTasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || t.type === typeFilter;
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchType && matchStatus;
  });

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const TaskRow = ({ task, depth = 0 }: { task: Task; depth?: number }) => {
    const subtasks = getSubtasks(task.id);
    const isExpanded = expanded.has(task.id);
    return (
      <>
        <tr className="border-b hover:bg-muted/30 transition-colors group">
          <td className="py-2.5 px-4">
            <div className="flex items-center gap-2" style={{ paddingLeft: `${depth * 20}px` }}>
              {subtasks.length > 0 ? (
                <button onClick={() => toggleExpand(task.id)} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                </button>
              ) : <span className="w-3.5" />}
              <TypeBadge type={task.type} />
              <span className="text-sm text-foreground font-medium">{task.title}</span>
              {task.tags?.slice(0, 2).map(tag => (
                <span key={tag} className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded hidden sm:inline">{tag}</span>
              ))}
            </div>
          </td>
          <td className="py-2.5 px-3 whitespace-nowrap">
            <select
              value={task.status}
              onChange={e => updateTask.mutate({ id: task.id, status: e.target.value as any })}
              className="text-xs bg-transparent border-none outline-none cursor-pointer"
            >
              {["backlog","todo","in_progress","in_review","done","cancelled"].map(s => (
                <option key={s} value={s}>{s.replace('_',' ')}</option>
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
                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
                  <MoreVertical className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="text-destructive" onClick={() => deleteTask.mutate({ id: task.id, projectId })}>
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </td>
        </tr>
        {isExpanded && subtasks.map(sub => <TaskRow key={sub.id} task={sub} depth={depth + 1} />)}
      </>
    );
  };

  return (
    <div className="space-y-4">
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
            <SelectItem value="epic">Epic</SelectItem>
            <SelectItem value="story">Story</SelectItem>
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
        <Button size="sm" onClick={() => setShowCreate(true)} className="gap-1.5 ml-auto">
          <Plus className="w-4 h-4" /> Add Task
        </Button>
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
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-muted-foreground text-sm">
                  No tasks found. <button onClick={() => setShowCreate(true)} className="text-primary underline">Add one</button>.
                </td>
              </tr>
            ) : (
              filtered.map(task => <TaskRow key={task.id} task={task} />)
            )}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <CreateTaskModal
          open={showCreate}
          onClose={() => setShowCreate(false)}
          projectId={projectId}
          sprints={sprints}
          milestones={milestones}
          defaultStatus="backlog"
        />
      )}
    </div>
  );
}
