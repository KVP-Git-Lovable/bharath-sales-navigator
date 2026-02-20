import { useState, useRef, useEffect } from "react";
import { Task, useCreateTask, useTaskCollaborators, useAddTaskCollaborator } from "@/hooks/useProjects";
import { StatusBadge, PriorityBadge, TypeBadge } from "./TaskStatusBadge";
import { Plus } from "lucide-react";

interface Props {
  task: Task;
  allTasks: Task[];
  projectId: string;
  onSelectTask: (task: Task) => void;
}

export function TaskSubtasks({ task, allTasks, projectId, onSelectTask }: Props) {
  const createTask = useCreateTask();
  const { data: collaborators = [] } = useTaskCollaborators(task.id);
  const addCollaborator = useAddTaskCollaborator();
  const [inlineTitle, setInlineTitle] = useState("");
  const [showInline, setShowInline] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const subtasks = allTasks.filter(t => t.parent_task_id === task.id);

  // Auto-add subtask owners as collaborators on the parent task
  useEffect(() => {
    if (!subtasks.length) return;
    const parentOwnerId = task.assignee_id;
    const collabUserIds = new Set(collaborators.map(c => c.user_id));

    subtasks.forEach(sub => {
      if (sub.assignee_id && sub.assignee_id !== parentOwnerId && !collabUserIds.has(sub.assignee_id)) {
        addCollaborator.mutate({ taskId: task.id, userId: sub.assignee_id });
        collabUserIds.add(sub.assignee_id); // prevent duplicate calls in same render
      }
    });
  }, [subtasks.map(s => s.assignee_id).join(','), collaborators.length]);

  const handleSubmit = async () => {
    if (!inlineTitle.trim()) {
      setShowInline(false);
      setInlineTitle("");
      return;
    }
    await createTask.mutateAsync({
      project_id: projectId,
      parent_task_id: task.id,
      title: inlineTitle.trim(),
      type: "task",
      status: "backlog",
      priority: "medium",
    });
    setInlineTitle("");
    // Keep inline visible for chaining
  };

  const startAdd = () => {
    setShowInline(true);
    setInlineTitle("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Sub-tasks</h3>
        <span className="text-xs text-muted-foreground">{subtasks.length}</span>
      </div>

      <div className="space-y-0 border rounded-lg overflow-hidden">
        {subtasks.map(sub => (
          <div
            key={sub.id}
            onClick={() => onSelectTask(sub)}
            className="flex items-center gap-2 px-3 py-2 border-b last:border-b-0 hover:bg-muted/30 cursor-pointer transition-colors"
          >
            <TypeBadge type={sub.type} />
            <span className="text-sm flex-1 truncate">{sub.title}</span>
            <StatusBadge status={sub.status} />
            <PriorityBadge priority={sub.priority} />
          </div>
        ))}

        {/* Inline add row */}
        {showInline ? (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/10 border-b last:border-b-0">
            <Plus className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              autoFocus
              value={inlineTitle}
              onChange={e => setInlineTitle(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") handleSubmit();
                if (e.key === "Escape") { setShowInline(false); setInlineTitle(""); }
              }}
              onBlur={() => handleSubmit()}
              placeholder="Type sub-task name, press Enter..."
              className="flex-1 text-sm bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/50"
            />
          </div>
        ) : (
          <button
            onClick={startAdd}
            className="w-full text-left text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 px-3 py-2 transition-colors hover:bg-muted/20"
          >
            <Plus className="w-3.5 h-3.5" /> Add sub-task...
          </button>
        )}
      </div>
    </div>
  );
}
