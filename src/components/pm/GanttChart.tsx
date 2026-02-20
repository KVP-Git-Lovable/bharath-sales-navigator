import { useState, useRef, useCallback, useMemo } from "react";
import { Task, Project, Milestone, useUpdateTask } from "@/hooks/useProjects";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  tasks: Task[];
  project: Project;
  milestones: Milestone[];
  onTaskClick?: (task: Task) => void;
}

export function GanttChart({ tasks, project, milestones, onTaskClick }: Props) {
  const updateTask = useUpdateTask();
  // Show all tasks: those with dates get bars, those without get listed but no bar
  const tasksWithDates = tasks.filter(t => t.start_date && t.due_date);
  const tasksWithoutDates = tasks.filter(t => !t.start_date || !t.due_date);
  const allDisplayTasks = [...tasksWithDates, ...tasksWithoutDates];
  const [hoveredTask, setHoveredTask] = useState<string | null>(null);
  const [dragState, setDragState] = useState<{
    taskId: string;
    type: "move" | "resize-left" | "resize-right";
    startX: number;
    origStart: string;
    origEnd: string;
  } | null>(null);

  const { startDate, endDate, days } = useMemo(() => {
    const allDates: Date[] = [];
    if (project.start_date) allDates.push(parseISO(project.start_date));
    if (project.end_date) allDates.push(parseISO(project.end_date));
    tasksWithDates.forEach(t => {
      if (t.start_date) allDates.push(parseISO(t.start_date));
      if (t.due_date) allDates.push(parseISO(t.due_date));
    });
    milestones.forEach(m => { if (m.due_date) allDates.push(parseISO(m.due_date)); });

    if (allDates.length === 0) {
      const start = new Date();
      const end = addDays(start, 30);
      return { startDate: start, endDate: end, days: 30 };
    }
    const start = addDays(new Date(Math.min(...allDates.map(d => d.getTime()))), -2);
    const end = addDays(new Date(Math.max(...allDates.map(d => d.getTime()))), 2);
    const totalDays = Math.max(differenceInDays(end, start) + 1, 30);
    return { startDate: start, endDate: end, days: totalDays };
  }, [project, tasksWithDates, milestones]);

  const DAY_WIDTH = 28;
  const ROW_H = 36;
  const LEFT_W = 220;

  const dayArray = Array.from({ length: days }, (_, i) => addDays(startDate, i));

  const getBar = (start: string, end: string) => {
    const s = parseISO(start);
    const e = parseISO(end);
    const left = Math.max(0, differenceInDays(s, startDate)) * DAY_WIDTH;
    const width = Math.max(DAY_WIDTH, (differenceInDays(e, s) + 1) * DAY_WIDTH);
    return { left, width };
  };

  const statusColors: Record<string, string> = {
    backlog: "bg-muted", todo: "bg-blue-400", in_progress: "bg-amber-400",
    in_review: "bg-purple-400", done: "bg-green-500", cancelled: "bg-red-400", overdue: "bg-red-500",
  };

  const priorityBorder: Record<string, string> = {
    critical: "border-l-4 border-l-red-500",
    high: "border-l-4 border-l-orange-500",
    medium: "border-l-4 border-l-amber-400",
    low: "border-l-4 border-l-green-500",
  };

  // Drag handlers for moving/resizing bars
  const handleBarMouseDown = useCallback((e: React.MouseEvent, task: Task, type: "move" | "resize-left" | "resize-right") => {
    e.preventDefault();
    e.stopPropagation();
    setDragState({
      taskId: task.id,
      type,
      startX: e.clientX,
      origStart: task.start_date!,
      origEnd: task.due_date!,
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - e.clientX;
      const deltaDays = Math.round(deltaX / DAY_WIDTH);
      if (deltaDays === 0) return;

      const origS = parseISO(task.start_date!);
      const origE = parseISO(task.due_date!);

      let newStart: Date, newEnd: Date;
      if (type === "move") {
        newStart = addDays(origS, deltaDays);
        newEnd = addDays(origE, deltaDays);
      } else if (type === "resize-left") {
        newStart = addDays(origS, deltaDays);
        newEnd = origE;
        if (newStart >= newEnd) return;
      } else {
        newStart = origS;
        newEnd = addDays(origE, deltaDays);
        if (newEnd <= newStart) return;
      }

      // Update visually via dataset for performance, commit on mouseup
      const bar = document.querySelector(`[data-gantt-bar="${task.id}"]`) as HTMLElement;
      if (bar) {
        const { left, width } = getBar(format(newStart, "yyyy-MM-dd"), format(newEnd, "yyyy-MM-dd"));
        bar.style.left = `${left}px`;
        bar.style.width = `${Math.max(width, 20)}px`;
        bar.dataset.newStart = format(newStart, "yyyy-MM-dd");
        bar.dataset.newEnd = format(newEnd, "yyyy-MM-dd");
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      setDragState(null);

      const bar = document.querySelector(`[data-gantt-bar="${task.id}"]`) as HTMLElement;
      if (bar?.dataset.newStart && bar?.dataset.newEnd) {
        const newStart = bar.dataset.newStart;
        const newEnd = bar.dataset.newEnd;
        if (newStart !== task.start_date || newEnd !== task.due_date) {
          updateTask.mutate({ id: task.id, start_date: newStart, due_date: newEnd });
        }
        delete bar.dataset.newStart;
        delete bar.dataset.newEnd;
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, [DAY_WIDTH, updateTask]);

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="font-semibold text-foreground mb-1">No tasks</h3>
        <p className="text-muted-foreground text-sm">Add tasks to see the Gantt chart.</p>
      </div>
    );
  }

  return (
    <div className="border rounded-xl overflow-hidden bg-card">
      <div className="flex overflow-x-auto">
        {/* Left panel: task names */}
        <div className="flex-shrink-0" style={{ width: LEFT_W }}>
          <div className="h-10 border-b border-r bg-muted/40 flex items-center px-4">
            <span className="text-xs font-semibold text-muted-foreground">Task</span>
          </div>
          {allDisplayTasks.map(task => (
            <div
              key={task.id}
              className={cn(
                "border-b border-r flex items-center px-4 text-sm cursor-pointer transition-colors",
                hoveredTask === task.id ? "bg-primary/5" : "hover:bg-muted/30"
              )}
              style={{ height: ROW_H }}
              onMouseEnter={() => setHoveredTask(task.id)}
              onMouseLeave={() => setHoveredTask(null)}
              onClick={() => onTaskClick?.(task)}
            >
              <span className={cn("truncate font-medium text-xs", task.start_date && task.due_date ? "text-foreground" : "text-muted-foreground italic")}>{task.title}</span>
            </div>
          ))}
          {milestones.filter(m => m.due_date).map(m => (
            <div key={m.id} className="border-b border-r flex items-center px-4 gap-1.5" style={{ height: ROW_H }}>
              <Flag className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span className="truncate text-xs font-medium text-amber-600">{m.name}</span>
            </div>
          ))}
        </div>

        {/* Right panel: timeline */}
        <div className="flex-1 overflow-x-auto">
          {/* Header: months + days */}
          <div className="sticky top-0 z-10 bg-muted/40 border-b flex" style={{ height: 40 }}>
            {dayArray.map((day, i) => (
              <div
                key={i}
                className="flex-shrink-0 border-r flex items-center justify-center"
                style={{ width: DAY_WIDTH }}
              >
                <span className="text-xs text-muted-foreground" style={{ fontSize: 10 }}>
                  {day.getDate() === 1 ? format(day, "MMM") : day.getDate() % 5 === 0 ? day.getDate() : ""}
                </span>
              </div>
            ))}
          </div>

          {/* Task bars — show for all tasks, empty row for those without dates */}
          {allDisplayTasks.map(task => {
            if (!task.start_date || !task.due_date) {
              return (
                <div
                  key={task.id}
                  className={cn("border-b relative", hoveredTask === task.id && "bg-primary/5")}
                  style={{ height: ROW_H, minWidth: days * DAY_WIDTH }}
                  onMouseEnter={() => setHoveredTask(task.id)}
                  onMouseLeave={() => setHoveredTask(null)}
                >
                  {dayArray.map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 border-r border-muted/50" style={{ left: i * DAY_WIDTH }} />
                  ))}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground italic">No dates set</span>
                  </div>
                </div>
              );
            }
            const { left, width } = getBar(task.start_date!, task.due_date!);
            const isHovered = hoveredTask === task.id;
            return (
              <div
                key={task.id}
                className={cn("border-b relative", isHovered && "bg-primary/5")}
                style={{ height: ROW_H, minWidth: days * DAY_WIDTH }}
                onMouseEnter={() => setHoveredTask(task.id)}
                onMouseLeave={() => setHoveredTask(null)}
              >
                {/* Grid lines */}
                {dayArray.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-muted/50" style={{ left: i * DAY_WIDTH }} />
                ))}
                {/* Bar */}
                <div
                  data-gantt-bar={task.id}
                  className={cn(
                    "absolute top-2 bottom-2 rounded flex items-center px-2 text-white text-xs font-medium cursor-pointer transition-shadow",
                    statusColors[task.status],
                    priorityBorder[task.priority],
                    isHovered && "shadow-lg ring-2 ring-primary/50"
                  )}
                  style={{ left, width: Math.max(width, 20) }}
                  title={`${task.title}\n${task.start_date} → ${task.due_date}\nDrag to move, drag edges to resize`}
                  onClick={() => onTaskClick?.(task)}
                  onMouseDown={e => handleBarMouseDown(e, task, "move")}
                >
                  {/* Left resize handle */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-l"
                    onMouseDown={e => handleBarMouseDown(e, task, "resize-left")}
                  />
                  <span className="truncate select-none">{task.title}</span>
                  {/* Right resize handle */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-black/20 rounded-r"
                    onMouseDown={e => handleBarMouseDown(e, task, "resize-right")}
                  />
                </div>

                {/* Hover tooltip */}
                {isHovered && (
                  <div className="absolute z-20 bg-popover text-popover-foreground border rounded-lg shadow-lg p-3 text-xs pointer-events-none"
                    style={{ left: left + width + 8, top: 0 }}
                  >
                    <p className="font-semibold mb-1">{task.title}</p>
                    <p className="text-muted-foreground">{task.start_date} → {task.due_date}</p>
                    <p className="text-muted-foreground capitalize">Status: {task.status.replace(/_/g, " ")}</p>
                    <p className="text-muted-foreground capitalize">Priority: {task.priority}</p>
                    {task.assignee && <p className="text-muted-foreground">Assignee: {task.assignee.full_name}</p>}
                  </div>
                )}
              </div>
            );
          })}

          {/* Milestone markers */}
          {milestones.filter(m => m.due_date).map(m => {
            const left = differenceInDays(parseISO(m.due_date!), startDate) * DAY_WIDTH;
            return (
              <div
                key={m.id}
                className="border-b relative"
                style={{ height: ROW_H, minWidth: days * DAY_WIDTH }}
              >
                {dayArray.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-muted/50" style={{ left: i * DAY_WIDTH }} />
                ))}
                <div className="absolute top-1/2 -translate-y-1/2" style={{ left }}>
                  <div className="w-4 h-4 rotate-45 bg-amber-400 border-2 border-amber-600" title={m.name} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
