import { useState, useMemo } from "react";
import { Task, useCreateTask } from "@/hooks/useProjects";
import { TypeBadge, PriorityBadge } from "./TaskStatusBadge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday, isSameDay } from "date-fns";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  projectId: string;
  onTaskClick?: (task: Task) => void;
}

export function CalendarView({ tasks, projectId, onTaskClick }: Props) {
  const createTask = useCreateTask();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [inlineDate, setInlineDate] = useState<string | null>(null);
  const [inlineTitle, setInlineTitle] = useState("");

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const tasksByDate = useMemo(() => {
    const map: Record<string, Task[]> = {};
    tasks.forEach(t => {
      if (t.due_date) {
        const key = t.due_date.slice(0, 10);
        if (!map[key]) map[key] = [];
        map[key].push(t);
      }
    });
    return map;
  }, [tasks]);

  const handleAddTask = async (dateStr: string) => {
    if (!inlineTitle.trim()) {
      setInlineDate(null);
      return;
    }
    await createTask.mutateAsync({
      project_id: projectId,
      title: inlineTitle.trim(),
      type: "task",
      status: "todo",
      priority: "medium",
      due_date: dateStr,
    });
    setInlineTitle("");
    setInlineDate(null);
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-semibold text-foreground">{format(currentDate, "MMMM yyyy")}</span>
        </div>
        <span className="text-xs text-muted-foreground">Weeks</span>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 border rounded-xl overflow-hidden bg-card">
        {/* Day Headers */}
        {days.map(day => (
          <div key={day.toISOString()} className="border-b border-r last:border-r-0 px-2 py-2 text-center">
            <div className="text-xs font-medium text-muted-foreground uppercase">{format(day, "EEE")}</div>
            <div className={cn(
              "text-sm font-semibold mt-0.5 w-7 h-7 mx-auto flex items-center justify-center rounded-full",
              isToday(day) && "bg-primary text-primary-foreground"
            )}>
              {format(day, "d")}
            </div>
          </div>
        ))}

        {/* Day Cells */}
        {days.map(day => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate[dateStr] || [];
          return (
            <div
              key={dateStr}
              className="border-r last:border-r-0 min-h-[180px] p-1.5 space-y-1"
            >
              {dayTasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => onTaskClick?.(task)}
                  className="w-full text-left p-1.5 rounded-md bg-secondary/50 hover:bg-secondary text-xs truncate transition-colors border"
                >
                  {task.title}
                </button>
              ))}

              {/* Inline add */}
              {inlineDate === dateStr ? (
                <input
                  autoFocus
                  value={inlineTitle}
                  onChange={e => setInlineTitle(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter") handleAddTask(dateStr);
                    if (e.key === "Escape") { setInlineDate(null); setInlineTitle(""); }
                  }}
                  onBlur={() => handleAddTask(dateStr)}
                  placeholder="Task name..."
                  className="w-full text-xs px-1.5 py-1 rounded border bg-background outline-none focus:ring-1 focus:ring-primary"
                />
              ) : (
                <button
                  onClick={() => { setInlineDate(dateStr); setInlineTitle(""); }}
                  className="w-full text-left text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-1 py-0.5 rounded hover:bg-muted transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add task
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
