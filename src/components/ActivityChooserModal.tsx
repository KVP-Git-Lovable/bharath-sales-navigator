import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Store, CalendarDays, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ActivityChooserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when the user picks "Event" — parent should open the existing AddActivityModal. */
  onPickEvent: () => void;
}

/**
 * Selection screen shown when the user clicks "Activity".
 * Two options: Counter (bulk billing grid) and Event (existing flow).
 */
export const ActivityChooserModal = ({ open, onOpenChange, onPickEvent }: ActivityChooserModalProps) => {
  const navigate = useNavigate();

  const handleCounter = () => {
    onOpenChange(false);
    navigate("/counter-sales");
  };

  const handleEvent = () => {
    onOpenChange(false);
    // Defer slightly so the close animation doesn't fight the next dialog opening
    setTimeout(() => onPickEvent(), 60);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Activity</DialogTitle>
          <DialogDescription>Choose what you want to record.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <Card
            role="button"
            tabIndex={0}
            onClick={handleCounter}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleCounter()}
            className="group cursor-pointer p-5 rounded-2xl border-2 hover:border-primary hover:shadow-md transition-all bg-gradient-to-br from-background to-muted/30"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Store className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Counter</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Walk-in counter sales — bill multiple customers fast.
                </p>
              </div>
            </div>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={handleEvent}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleEvent()}
            className="group cursor-pointer p-5 rounded-2xl border-2 hover:border-primary hover:shadow-md transition-all bg-gradient-to-br from-background to-muted/30"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <CalendarDays className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Event</h3>
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Log a celebration, meeting, demo or promotion.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
};