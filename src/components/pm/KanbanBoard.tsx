import { useState } from "react";
import { Task, TaskStatus, Sprint, Milestone } from "@/hooks/useProjects";
import { useUpdateTask, useDeleteTask } from "@/hooks/useProjects";
import { CreateTaskModal } from "./CreateTaskModal";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreVertical, Trash2, GripVertical, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const COLUMNS: { status: TaskStatus; label: string; headerColor: string }[] = [
  { status: "backlog",     label: "Backlog",      headerColor: "bg-muted" },
  { status: "todo",        label: "To Do",        headerColor: "bg-blue-50 dark:bg-blue-950/30" },
  { status: "in_progress", label: "In Progress",  headerColor: "bg-amber-50 dark:bg-amber-950/30" },
  { status: "in_review",  label: "In Review",    headerColor: "bg-purple-50 dark:bg-purple-950/30" },
  { status: "done",        label: "Done",         headerColor: "bg-green-50 dark:bg-green-950/30" },
];

interface Props {
  tasks: Task[];
  onUpdateTask: (id: string, status: TaskStatus) => void;
  onAddTask: (status: TaskStatus) => void;
  projectId: string;
  sprints: Sprint[];
  milestones: Milestone[];
}

export function KanbanBoard({ tasks, onUpdateTask, projectId, sprints, milestones }: Props) {
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<TaskStatus | null>(null);
  const [createFor, setCreateFor] = useState<TaskStatus | null>(null);

  const handleDragStart = (taskId: string) => setDragging(taskId);
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };
  const handleDragOver = (e: React.DragEvent, status: TaskStatus) => { e.preventDefault(); setDragOver(status); };
  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (dragging) onUpdateTask(dragging, status);
    setDragging(null);
    setDragOver(null);
  };

  return (
    <div className="flex gap-3 p-4 h-full overflow-x-auto">
      {COLUMNS.map(col => {
        const colTasks = tasks.filter(t => t.status === col.status);
        return (
          <div
            key={col.status}
            className={cn("flex-shrink-0 w-72 flex flex-col rounded-xl border", dragOver === col.status ? "ring-2 ring-primary" : "")}
            onDragOver={e => handleDragOver(e, col.status)}
            onDrop={e => handleDrop(e, col.status)}
          >
            {/* Column Header */}
            <div className={cn("flex items-center justify-between px-3 py-2.5 rounded-t-xl border-b", col.headerColor)}>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">{col.label}</span>
                <Badge variant="secondary" className="text-xs h-5 min-w-5 px-1.5">{colTasks.length}</Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setCreateFor(col.status)}
              >
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>

            {/* Tasks */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px]">
              {colTasks.map(task => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={() => handleDragStart(task.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "bg-card border rounded-lg p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all group",
                    dragging === task.id ? "opacity-40 scale-95" : ""
                  )}
                >
                  <div className="flex items-start justify-between gap-1 mb-2">
                    <div className="flex items-center gap-1 flex-wrap">
                      <TypeBadge type={task.type} />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 flex-shrink-0">
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {COLUMNS.filter(c => c.status !== task.status).map(c => (
                          <DropdownMenuItem key={c.status} onClick={() => onUpdateTask(task.id, c.status)}>
                            Move to {c.label}
                          </DropdownMenuItem>
                        ))}
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => deleteTask.mutate({ id: task.id, projectId: task.project_id })}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <p className="text-sm font-medium text-foreground leading-tight mb-2">{task.title}</p>

                  <div className="flex items-center gap-2 flex-wrap">
                    <PriorityBadge priority={task.priority} />
                    {task.due_date && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(task.due_date), "MMM d")}
                      </span>
                    )}
                    {task.estimated_hours && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {task.estimated_hours}h
                      </span>
                    )}
                  </div>

                  {task.assignee && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-medium">
                        {task.assignee.full_name?.charAt(0) ?? "?"}
                      </div>
                      <span className="text-xs text-muted-foreground truncate">{task.assignee.full_name}</span>
                    </div>
                  )}

                  {task.tags && task.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-xs px-1.5 py-0.5 bg-secondary text-secondary-foreground rounded">{tag}</span>
                      ))}
                      {task.tags.length > 2 && <span className="text-xs text-muted-foreground">+{task.tags.length - 2}</span>}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Add task footer */}
            <div className="p-2 border-t">
              <button
                onClick={() => setCreateFor(col.status)}
                className="w-full text-left text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add task
              </button>
            </div>
          </div>
        );
      })}

      {createFor !== null && (
        <CreateTaskModal
          open={true}
          onClose={() => setCreateFor(null)}
          projectId={projectId}
          sprints={sprints}
          milestones={milestones}
          defaultStatus={createFor}
        />
      )}
    </div>
  );
}
