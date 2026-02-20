import { useState, useMemo, useCallback } from "react";
import { Task, useTimeLogs } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Clock, TrendingUp } from "lucide-react";
import { format, startOfWeek, addDays, addWeeks, subWeeks, isToday } from "date-fns";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface Props {
  tasks: Task[];
  projectId: string;
}

interface CellKey {
  taskId: string;
  date: string;
}

export function TimesheetView({ tasks, projectId }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data: timeLogs = [] } = useTimeLogs(projectId);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [editingCell, setEditingCell] = useState<CellKey | null>(null);
  const [editValue, setEditValue] = useState("");
  const [saving, setSaving] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Only show tasks that are assigned to current user or not yet done
  const timesheetTasks = useMemo(() => {
    return tasks.filter(t => !t.parent_task_id && t.status !== "done");
  }, [tasks]);

  // Build a map: taskId-date → hours
  const logMap = useMemo(() => {
    const map: Record<string, number> = {};
    timeLogs.forEach((log: any) => {
      const key = `${log.task_id}-${log.date}`;
      map[key] = (map[key] || 0) + Number(log.hours);
    });
    return map;
  }, [timeLogs]);

  // Build a map: taskId → total logged (all time)
  const totalLoggedByTask = useMemo(() => {
    const map: Record<string, number> = {};
    timeLogs.forEach((log: any) => {
      map[log.task_id] = (map[log.task_id] || 0) + Number(log.hours);
    });
    return map;
  }, [timeLogs]);

  // Week totals per task
  const weekTotalByTask = useMemo(() => {
    const map: Record<string, number> = {};
    timesheetTasks.forEach(t => {
      let total = 0;
      weekDays.forEach(day => {
        const key = `${t.id}-${format(day, "yyyy-MM-dd")}`;
        total += logMap[key] || 0;
      });
      map[t.id] = total;
    });
    return map;
  }, [timesheetTasks, weekDays, logMap]);

  // Day totals
  const dayTotals = useMemo(() => {
    return weekDays.map(day => {
      let total = 0;
      timesheetTasks.forEach(t => {
        const key = `${t.id}-${format(day, "yyyy-MM-dd")}`;
        total += logMap[key] || 0;
      });
      return total;
    });
  }, [weekDays, timesheetTasks, logMap]);

  const grandTotal = dayTotals.reduce((s, v) => s + v, 0);

  const handleCellClick = (taskId: string, date: string) => {
    const key = `${taskId}-${date}`;
    const existing = logMap[key] || 0;
    setEditingCell({ taskId, date });
    setEditValue(existing > 0 ? String(existing) : "");
  };

  const handleSave = useCallback(async () => {
    if (!editingCell || !user) return;
    const hours = parseFloat(editValue);
    if (isNaN(hours) || hours < 0) {
      setEditingCell(null);
      setEditValue("");
      return;
    }

    setSaving(true);
    try {
      // Delete existing logs for this task+date+user, then insert if > 0
      await supabase
        .from("pm_time_logs")
        .delete()
        .eq("task_id", editingCell.taskId)
        .eq("date", editingCell.date)
        .eq("user_id", user.id)
        .eq("project_id", projectId);

      if (hours > 0) {
        const { error } = await supabase
          .from("pm_time_logs")
          .insert({
            task_id: editingCell.taskId,
            project_id: projectId,
            user_id: user.id,
            date: editingCell.date,
            hours,
          });
        if (error) throw error;
      }

      queryClient.invalidateQueries({ queryKey: ["pm_time_logs", projectId] });
      queryClient.invalidateQueries({ queryKey: ["pm_tasks", projectId] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
      setEditingCell(null);
      setEditValue("");
    }
  }, [editingCell, editValue, user, projectId, queryClient]);

  const getVarianceColor = (estimated: number, logged: number) => {
    if (!estimated) return "text-muted-foreground";
    const ratio = logged / estimated;
    if (ratio > 1.1) return "text-destructive";
    if (ratio > 0.9) return "text-amber-600";
    return "text-green-600";
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Weekly Timesheet</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            This Week
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => subWeeks(d, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(d => addWeeks(d, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium text-foreground">
            {format(weekDays[0], "MMM d")} – {format(weekDays[6], "MMM d, yyyy")}
          </span>
        </div>
      </div>

      {/* Timesheet Grid */}
      <div className="border rounded-xl overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2.5 font-medium text-muted-foreground w-[280px] min-w-[280px] sticky left-0 bg-muted/30 z-10">
                  Task
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-muted-foreground w-16 min-w-[64px]">
                  Est.
                </th>
                {weekDays.map((day, i) => (
                  <th
                    key={i}
                    className={cn(
                      "text-center px-1 py-2.5 font-medium w-[72px] min-w-[72px]",
                      isToday(day) ? "text-primary" : "text-muted-foreground",
                      (i === 5 || i === 6) && "bg-muted/20"
                    )}
                  >
                    <div className="text-[10px] uppercase">{format(day, "EEE")}</div>
                    <div className={cn("text-xs", isToday(day) && "bg-primary text-primary-foreground rounded-full w-6 h-6 flex items-center justify-center mx-auto")}>
                      {format(day, "d")}
                    </div>
                  </th>
                ))}
                <th className="text-center px-2 py-2.5 font-medium text-muted-foreground w-16 min-w-[64px]">
                  Week
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-muted-foreground w-16 min-w-[64px]">
                  Total
                </th>
                <th className="text-center px-2 py-2.5 font-medium text-muted-foreground w-20 min-w-[80px]">
                  <TrendingUp className="w-3.5 h-3.5 inline mr-1" />
                  Var.
                </th>
              </tr>
            </thead>
            <tbody>
              {timesheetTasks.length === 0 && (
                <tr>
                  <td colSpan={12} className="text-center py-8 text-muted-foreground">
                    No tasks to log time against. Create tasks first.
                  </td>
                </tr>
              )}
              {timesheetTasks.map((task) => {
                const estimated = task.estimated_hours || 0;
                const totalLogged = totalLoggedByTask[task.id] || 0;
                const weekTotal = weekTotalByTask[task.id] || 0;
                const variance = estimated > 0 ? totalLogged - estimated : 0;

                return (
                  <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                    {/* Task name */}
                    <td className="px-3 py-2 sticky left-0 bg-card z-10">
                      <div className="flex items-center gap-2 max-w-[260px]">
                        <div
                          className={cn(
                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                            task.status === "in_progress" ? "bg-amber-500" :
                            task.status === "todo" ? "bg-muted-foreground" :
                            "bg-green-500"
                          )}
                        />
                        <span className="truncate text-foreground" title={task.title}>
                          {task.title}
                        </span>
                      </div>
                    </td>

                    {/* Estimated */}
                    <td className="text-center px-2 py-2 text-muted-foreground text-xs tabular-nums">
                      {estimated > 0 ? `${estimated}h` : "–"}
                    </td>

                    {/* Day cells */}
                    {weekDays.map((day, i) => {
                      const dateStr = format(day, "yyyy-MM-dd");
                      const key = `${task.id}-${dateStr}`;
                      const hours = logMap[key] || 0;
                      const isEditing = editingCell?.taskId === task.id && editingCell?.date === dateStr;

                      return (
                        <td
                          key={i}
                          className={cn(
                            "text-center px-0.5 py-1",
                            (i === 5 || i === 6) && "bg-muted/20"
                          )}
                        >
                          {isEditing ? (
                            <input
                              autoFocus
                              type="number"
                              step="0.25"
                              min="0"
                              max="24"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === "Enter") handleSave();
                                if (e.key === "Escape") { setEditingCell(null); setEditValue(""); }
                              }}
                              onBlur={handleSave}
                              disabled={saving}
                              className="w-14 h-7 text-center text-xs rounded border bg-background outline-none focus:ring-1 focus:ring-primary mx-auto tabular-nums"
                            />
                          ) : (
                            <button
                              onClick={() => handleCellClick(task.id, dateStr)}
                              className={cn(
                                "w-14 h-7 rounded text-xs tabular-nums mx-auto flex items-center justify-center transition-colors",
                                hours > 0
                                  ? "bg-primary/10 text-primary font-medium hover:bg-primary/20"
                                  : "hover:bg-muted text-muted-foreground/50 hover:text-muted-foreground"
                              )}
                            >
                              {hours > 0 ? hours : "–"}
                            </button>
                          )}
                        </td>
                      );
                    })}

                    {/* Week total */}
                    <td className="text-center px-2 py-2 text-xs font-semibold tabular-nums text-foreground">
                      {weekTotal > 0 ? `${weekTotal}h` : "–"}
                    </td>

                    {/* All-time total */}
                    <td className="text-center px-2 py-2 text-xs tabular-nums text-foreground">
                      {totalLogged > 0 ? `${totalLogged}h` : "–"}
                    </td>

                    {/* Variance */}
                    <td className={cn("text-center px-2 py-2 text-xs font-medium tabular-nums", getVarianceColor(estimated, totalLogged))}>
                      {estimated > 0 ? (
                        variance > 0 ? `+${variance}h` : `${variance}h`
                      ) : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Footer totals */}
            <tfoot>
              <tr className="border-t bg-muted/30 font-semibold text-xs">
                <td className="px-3 py-2.5 sticky left-0 bg-muted/30 z-10 text-foreground">
                  Daily Total
                </td>
                <td className="text-center px-2 py-2.5 text-muted-foreground">
                  {timesheetTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)}h
                </td>
                {dayTotals.map((total, i) => (
                  <td
                    key={i}
                    className={cn(
                      "text-center px-1 py-2.5 tabular-nums",
                      (i === 5 || i === 6) && "bg-muted/20",
                      total > 0 ? "text-foreground" : "text-muted-foreground/50"
                    )}
                  >
                    {total > 0 ? `${total}h` : "–"}
                  </td>
                ))}
                <td className="text-center px-2 py-2.5 tabular-nums text-primary">
                  {grandTotal > 0 ? `${grandTotal}h` : "–"}
                </td>
                <td className="text-center px-2 py-2.5 tabular-nums text-foreground">
                  {Object.values(totalLoggedByTask).reduce((s, v) => s + v, 0) > 0
                    ? `${Object.values(totalLoggedByTask).reduce((s, v) => s + v, 0)}h`
                    : "–"}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="border rounded-lg p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-medium">This Week</div>
          <div className="text-lg font-bold text-foreground tabular-nums">{grandTotal}h</div>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-medium">Estimated (Open Tasks)</div>
          <div className="text-lg font-bold text-foreground tabular-nums">
            {timesheetTasks.reduce((s, t) => s + (t.estimated_hours || 0), 0)}h
          </div>
        </div>
        <div className="border rounded-lg p-3 bg-card">
          <div className="text-[10px] uppercase text-muted-foreground font-medium">Total Logged</div>
          <div className="text-lg font-bold text-foreground tabular-nums">
            {Object.values(totalLoggedByTask).reduce((s, v) => s + v, 0)}h
          </div>
        </div>
      </div>
    </div>
  );
}
