import { Task, Project, Milestone } from "@/hooks/useProjects";
import { useMemo } from "react";
import { format, differenceInDays, parseISO, addDays } from "date-fns";
import { Flag } from "lucide-react";

interface Props {
  tasks: Task[];
  project: Project;
  milestones: Milestone[];
}

export function GanttChart({ tasks, project, milestones }: Props) {
  const tasksWithDates = tasks.filter(t => t.start_date && t.due_date);

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
    const start = new Date(Math.min(...allDates.map(d => d.getTime())));
    const end = new Date(Math.max(...allDates.map(d => d.getTime())));
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
    in_review: "bg-purple-400", done: "bg-green-500", cancelled: "bg-red-400",
  };

  const priorityBorder: Record<string, string> = {
    critical: "border-l-4 border-l-red-500",
    high: "border-l-4 border-l-orange-500",
    medium: "border-l-4 border-l-amber-400",
    low: "border-l-4 border-l-green-500",
  };

  if (tasksWithDates.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-4xl mb-3">📊</div>
        <h3 className="font-semibold text-foreground mb-1">No timeline data</h3>
        <p className="text-muted-foreground text-sm">Add start and due dates to tasks to see the Gantt chart.</p>
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
          {tasksWithDates.map(task => (
            <div
              key={task.id}
              className="border-b border-r flex items-center px-4 text-sm text-foreground"
              style={{ height: ROW_H }}
            >
              <span className="truncate font-medium text-xs">{task.title}</span>
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

          {/* Task bars */}
          {tasksWithDates.map(task => {
            const { left, width } = getBar(task.start_date!, task.due_date!);
            return (
              <div
                key={task.id}
                className="border-b relative"
                style={{ height: ROW_H, minWidth: days * DAY_WIDTH }}
              >
                {/* Grid lines */}
                {dayArray.map((_, i) => (
                  <div key={i} className="absolute top-0 bottom-0 border-r border-muted/50" style={{ left: i * DAY_WIDTH }} />
                ))}
                {/* Bar */}
                <div
                  className={`absolute top-2 bottom-2 rounded flex items-center px-2 text-white text-xs font-medium ${statusColors[task.status]} ${priorityBorder[task.priority]}`}
                  style={{ left, width: Math.max(width, 20) }}
                  title={`${task.title}: ${task.start_date} → ${task.due_date}`}
                >
                  <span className="truncate">{task.title}</span>
                </div>
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
