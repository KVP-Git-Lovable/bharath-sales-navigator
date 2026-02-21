import { usePMAI } from "@/hooks/usePMAI";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";

interface Props {
  projectId: string;
  taskTitle: string;
  sectionName?: string;
  projectName?: string;
  onGenerated: (description: string) => void;
}

export function AIDescriptionWriter({ projectId, taskTitle, sectionName, projectName, onGenerated }: Props) {
  const { invoke, loading } = usePMAI({
    onSuccess: (data) => {
      if (data?.description) onGenerated(data.description);
    },
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => invoke("write_description", projectId, { taskTitle, sectionName, projectName })}
      disabled={loading || !taskTitle.trim()}
      className="gap-1 text-xs h-6 px-2"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-amber-500" />}
      {loading ? "Writing..." : "AI Write"}
    </Button>
  );
}
