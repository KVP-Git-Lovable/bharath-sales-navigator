import { useState } from "react";
import { Trash2, ArrowRightLeft, AlertTriangle, Store } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AvailableBeat {
  id: string;
  name: string;
  retailer_count?: number;
}

interface BeatDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beatName: string | null;
  affectedRetailerCount: number;
  availableBeats: AvailableBeat[];
  onConfirm: (deleteOption: "delete" | "transfer", targetBeatId?: string) => void;
  isLoading?: boolean;
}

export const BeatDeleteDialog = ({
  open,
  onOpenChange,
  beatName,
  affectedRetailerCount,
  availableBeats,
  onConfirm,
  isLoading = false,
}: BeatDeleteDialogProps) => {
  const [deleteOption, setDeleteOption] = useState<"delete" | "transfer">("delete");
  const [targetBeatId, setTargetBeatId] = useState<string>("");

  const canConfirm =
    deleteOption === "delete" || (deleteOption === "transfer" && targetBeatId !== "");

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm(deleteOption, deleteOption === "transfer" ? targetBeatId : undefined);
  };

  const handleOpenChange = (value: boolean) => {
    if (!value) {
      // Reset state on close
      setDeleteOption("delete");
      setTargetBeatId("");
    }
    onOpenChange(value);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[90vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 size={18} />
            Delete Beat
          </DialogTitle>
          <DialogDescription>
            Delete "<span className="font-medium text-foreground">{beatName}</span>"?
          </DialogDescription>
        </DialogHeader>

        {affectedRetailerCount > 0 ? (
          <div className="space-y-4">
            {/* Info banner */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              <AlertTriangle size={16} className="mt-0.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-300">
                <strong>{affectedRetailerCount}</strong> retailer{affectedRetailerCount !== 1 ? "s are" : " is"} assigned to this beat.
              </p>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                What would you like to do with the retailers?
              </p>
              <RadioGroup
                value={deleteOption}
                onValueChange={(v) => setDeleteOption(v as "delete" | "transfer")}
                className="space-y-3"
              >
                {/* Option 1: Delete all */}
                <label
                  htmlFor="opt-delete"
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    deleteOption === "delete"
                      ? "border-destructive/50 bg-destructive/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="delete" id="opt-delete" className="mt-0.5" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Trash2 size={14} className="text-destructive" />
                      <span className="text-sm font-medium">Delete all retailers</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Permanently remove all {affectedRetailerCount} retailer{affectedRetailerCount !== 1 ? "s" : ""} assigned to this beat. They will be moved to the recycle bin.
                    </p>
                  </div>
                </label>

                {/* Option 2: Transfer */}
                <label
                  htmlFor="opt-transfer"
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    deleteOption === "transfer"
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value="transfer" id="opt-transfer" className="mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <ArrowRightLeft size={14} className="text-primary" />
                      <span className="text-sm font-medium">Transfer to another beat</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Move all retailers to a different beat before deletion.
                    </p>

                    {deleteOption === "transfer" && (
                      <Select value={targetBeatId} onValueChange={setTargetBeatId}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select destination beat" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBeats.map((beat) => (
                            <SelectItem key={beat.id} value={beat.id}>
                              <div className="flex items-center gap-2">
                                <Store size={12} className="text-muted-foreground" />
                                <span>{beat.name}</span>
                                {beat.retailer_count !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    ({beat.retailer_count})
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                          {availableBeats.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">
                              No other beats available
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </label>
              </RadioGroup>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No retailers are assigned to this beat. The beat will be moved to the recycle bin.
          </p>
        )}

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isLoading}
            className="flex-1 sm:flex-none"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isLoading || !canConfirm}
            className="flex-1 sm:flex-none"
          >
            {isLoading ? "Deleting..." : "Confirm Delete"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
