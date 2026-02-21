import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Clock, BarChart3 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

interface Props {
  taskId: string;
  projectId: string;
}

export function TaskTimesheetSection({ taskId, projectId }: Props) {
  const { data: timeLogs = [], isLoading } = useQuery({
    queryKey: ["pm_time_logs_task", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_time_logs")
        .select("*, user:profiles!pm_time_logs_user_id_fkey(full_name)")
        .eq("task_id", taskId)
        .order("date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Chart data: aggregate hours by person
  const chartData = useMemo(() => {
    const map: Record<string, { name: string; hours: number }> = {};
    timeLogs.forEach((log: any) => {
      const name = log.user?.full_name || "Unknown";
      if (!map[name]) map[name] = { name, hours: 0 };
      map[name].hours += Number(log.hours);
    });
    return Object.values(map).sort((a, b) => b.hours - a.hours);
  }, [timeLogs]);

  const totalHours = chartData.reduce((s, d) => s + d.hours, 0);
  const maxHours = Math.max(...chartData.map(d => d.hours), 1);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Timesheet</h3>
        <div className="h-20 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (timeLogs.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" /> Timesheet
        </h3>
        <p className="text-xs text-muted-foreground italic">No time entries recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" /> Timesheet ({totalHours.toFixed(1)}h total)
      </h3>

      {/* Simple horizontal bar chart by person */}
      {chartData.length > 0 && (
        <div className="space-y-1.5 bg-muted/20 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
            <BarChart3 className="w-3 h-3" /> Effort by Person
          </div>
          {chartData.map((d) => (
            <div key={d.name} className="flex items-center gap-2">
              <span className="text-xs text-foreground w-24 truncate flex-shrink-0" title={d.name}>
                {d.name}
              </span>
              <div className="flex-1 h-4 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary/70 rounded-full transition-all"
                  style={{ width: `${(d.hours / maxHours) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums w-10 text-right">
                {d.hours.toFixed(1)}h
              </span>
            </div>
          ))}
        </div>
      )}

      {/* List view */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-[10px] uppercase h-8 px-3">Person</TableHead>
              <TableHead className="text-[10px] uppercase h-8 px-3">Date</TableHead>
              <TableHead className="text-[10px] uppercase h-8 px-3 text-center">Hours</TableHead>
              <TableHead className="text-[10px] uppercase h-8 px-3">Description</TableHead>
              <TableHead className="text-[10px] uppercase h-8 px-3">Allocation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeLogs.map((log: any) => (
              <TableRow key={log.id}>
                <TableCell className="py-1.5 px-3 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-primary text-[9px] font-semibold flex-shrink-0">
                      {log.user?.full_name?.charAt(0) ?? "?"}
                    </div>
                    <span className="truncate max-w-[100px]">{log.user?.full_name || "Unknown"}</span>
                  </div>
                </TableCell>
                <TableCell className="py-1.5 px-3 text-xs text-muted-foreground tabular-nums">
                  {format(new Date(log.date + "T00:00:00"), "MMM d, yyyy")}
                </TableCell>
                <TableCell className="py-1.5 px-3 text-xs text-center font-medium tabular-nums">
                  {log.hours}h
                </TableCell>
                <TableCell className="py-1.5 px-3 text-xs text-muted-foreground max-w-[150px] truncate">
                  {log.description || "—"}
                </TableCell>
                <TableCell className="py-1.5 px-3">
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded-full font-medium",
                    log.allocation === "non-billable"
                      ? "bg-muted text-muted-foreground"
                      : "bg-green-500/10 text-green-700 dark:text-green-400"
                  )}>
                    {log.allocation === "non-billable" ? "Non-Billable" : "Billable"}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
