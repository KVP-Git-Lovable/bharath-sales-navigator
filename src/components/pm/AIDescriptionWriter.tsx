import { useState } from "react";
import { usePMAI } from "@/hooks/usePMAI";
import { useCreateTask } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SuggestedSubtask {
  title: string;
  priority: string;
  estimated_hours: number;
  selected: boolean;
}

interface Props {
  projectId: string;
  taskTitle: string;
  taskId?: string;
  existingDescription?: string;
  sectionName?: string;
  projectName?: string;
  onGenerated: (description: string) => void;
  onSubtasksCreated?: () => void;
}

export function AIDescriptionWriter({
  projectId,
  taskTitle,
  taskId,
  existingDescription,
  sectionName,
  projectName,
  onGenerated,
  onSubtasksCreated,
}: Props) {
  const [subtasks, setSubtasks] = useState<SuggestedSubtask[]>([]);
  const [creating, setCreating] = useState(false);
  const createTask = useCreateTask();

  const { invoke, loading } = usePMAI({
    onSuccess: (data) => {
      if (data?.description) onGenerated(data.description);
      if (data?.suggested_subtasks?.length) {
        setSubtasks(data.suggested_subtasks.map((s: any) => ({ ...s, selected: true })));
      }
    },
  });

  const handleInvoke = () => {
    setSubtasks([]);
    invoke("write_description", projectId, {
      taskTitle,
      sectionName,
      projectName,
      existingDescription: existingDescription?.trim() || undefined,
    });
  };

  const toggleSubtask = (idx: number) => {
    setSubtasks((prev) => prev.map((s, i) => (i === idx ? { ...s, selected: !s.selected } : s)));
  };

  const approveSubtasks = async () => {
    if (!taskId) {
      toast.info("Save the task first to create sub-tasks");
      return;
    }
    const selected = subtasks.filter((s) => s.selected);
    if (!selected.length) {
      toast.info("Select at least one sub-task");
      return;
    }
    setCreating(true);
    try {
      for (const st of selected) {
        await createTask.mutateAsync({
          project_id: projectId,
          parent_task_id: taskId,
          title: st.title,
          priority: st.priority as any,
          estimated_hours: st.estimated_hours,
          status: "todo",
          type: "task",
        });
      }
      toast.success(`${selected.length} sub-tasks created`);
      setSubtasks([]);
      onSubtasksCreated?.();
    } catch {
      toast.error("Failed to create some sub-tasks");
    } finally {
      setCreating(false);
    }
  };

  const buttonLabel = existingDescription?.trim() ? "AI Elaborate" : "AI Write";

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={handleInvoke}
        disabled={loading || !taskTitle.trim()}
        className="gap-1 text-xs h-6 px-2"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
        {loading ? "Writing..." : buttonLabel}
      </Button>

      {subtasks.length > 0 && (
        <div className="border border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-800 rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Suggested Sub-tasks
            </span>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => setSubtasks([])}>
              <X className="w-3 h-3" />
            </Button>
          </div>
          <div className="space-y-1">
            {subtasks.map((st, i) => (
              <label
                key={i}
                className={cn(
                  "flex items-start gap-2 p-2 rounded-md border cursor-pointer transition-colors text-sm",
                  st.selected
                    ? "bg-background border-green-300 dark:border-green-700"
                    : "bg-muted/30 border-transparent opacity-60"
                )}
              >
                <input
                  type="checkbox"
                  checked={st.selected}
                  onChange={() => toggleSubtask(i)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground">{st.title}</span>
                  <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                    <span className="capitalize">{st.priority}</span>
                    <span>{st.estimated_hours}h</span>
                  </div>
                </div>
              </label>
            ))}
          </div>
          <Button
            size="sm"
            onClick={approveSubtasks}
            disabled={creating || !subtasks.some((s) => s.selected)}
            className="gap-1 text-xs w-full"
          >
            <Check className="w-3 h-3" />
            {creating
              ? "Creating..."
              : `Approve & Create ${subtasks.filter((s) => s.selected).length} Sub-tasks`}
          </Button>
        </div>
      )}
    </div>
  );
}
