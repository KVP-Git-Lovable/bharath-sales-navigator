import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format, differenceInCalendarDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useActivityEvents } from '@/hooks/useActivityEvents';
import { toast } from 'sonner';

interface AddActivityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type DurationType = 'hour_based' | 'half_day' | 'full_day' | 'multiple_days';

const ACTIVITY_TYPES = ['Celebration', 'Event', 'Promotion', 'Demo', 'Other'];

export const AddActivityModal = ({ open, onOpenChange }: AddActivityModalProps) => {
  const { user } = useAuth();
  const { createActivity } = useActivityEvents();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [activityName, setActivityName] = useState('');
  const [durationType, setDurationType] = useState<DurationType>('full_day');
  const [activityDate, setActivityDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');
  const [halfDayType, setHalfDayType] = useState('first_half');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [activityType, setActivityType] = useState('Event');
  const [siteName, setSiteName] = useState('');
  const [remarks, setRemarks] = useState('');

  // Calculate total days for multiple days
  const totalDays = durationType === 'multiple_days' && fromDate && toDate
    ? Math.max(differenceInCalendarDays(toDate, fromDate) + 1, 1)
    : null;

  const resetForm = () => {
    setActivityName('');
    setDurationType('full_day');
    setActivityDate(new Date());
    setStartTime('09:00');
    setEndTime('11:00');
    setHalfDayType('first_half');
    setFromDate(new Date());
    setToDate(new Date());
    setActivityType('Event');
    setSiteName('');
    setRemarks('');
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Please log in first');
      return;
    }
    setIsSubmitting(true);
    try {
      const dateStr = format(activityDate, 'yyyy-MM-dd');
      
      // Build start/end timestamps for hour-based
      let startTimeISO: string | undefined;
      let endTimeISO: string | undefined;
      if (durationType === 'hour_based') {
        startTimeISO = new Date(`${dateStr}T${startTime}:00`).toISOString();
        endTimeISO = new Date(`${dateStr}T${endTime}:00`).toISOString();
      }

      const result = await createActivity({
        activity_name: activityName || undefined,
        activity_type: activityType,
        duration_type: durationType,
        activity_date: dateStr,
        start_time: startTimeISO,
        end_time: endTimeISO,
        half_day_type: durationType === 'half_day' ? halfDayType : undefined,
        from_date: durationType === 'multiple_days' ? format(fromDate, 'yyyy-MM-dd') : undefined,
        to_date: durationType === 'multiple_days' ? format(toDate, 'yyyy-MM-dd') : undefined,
        total_days: totalDays || undefined,
        retailer_name: siteName || undefined,
        remarks: remarks || undefined,
      });

      if (result) {
        toast.success('Activity created successfully!');
        resetForm();
        onOpenChange(false);
        // Trigger refresh so ActivityEventsTable picks up the new activity
        window.dispatchEvent(new Event('visitDataChanged'));
      } else {
        toast.error('Failed to create activity');
      }
    } catch (error) {
      console.error('Error creating activity:', error);
      toast.error('Failed to create activity');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <CalendarIcon className="h-5 w-5 text-primary" />
            Add Activity / Event
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Activity Name */}
          <div>
            <Label className="text-sm">Activity Name</Label>
            <Input
              value={activityName}
              onChange={(e) => setActivityName(e.target.value)}
              placeholder="e.g., Diwali Celebration, Product Launch"
              className="mt-1"
            />
          </div>

          {/* Duration Type Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Duration Type</Label>
            <RadioGroup
              value={durationType}
              onValueChange={(val) => setDurationType(val as DurationType)}
              className="grid grid-cols-2 gap-2"
            >
              {[
                { value: 'hour_based', label: 'Hour-based' },
                { value: 'half_day', label: 'Half Day' },
                { value: 'full_day', label: 'Full Day' },
                { value: 'multiple_days', label: 'Multiple Days' },
              ].map((opt) => (
                <div
                  key={opt.value}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
                    durationType === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  )}
                  onClick={() => setDurationType(opt.value as DurationType)}
                >
                  <RadioGroupItem value={opt.value} id={opt.value} />
                  <Label htmlFor={opt.value} className="cursor-pointer text-sm">
                    {opt.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Duration-specific fields */}
          {durationType === 'hour_based' && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Activity Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(activityDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={activityDate}
                      onSelect={(d) => d && setActivityDate(d)}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">Start Time</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label className="text-sm">End Time</Label>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {durationType === 'half_day' && (
            <div className="space-y-3">
              <div>
                <Label className="text-sm">Activity Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {format(activityDate, 'PPP')}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={activityDate}
                      onSelect={(d) => d && setActivityDate(d)}
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label className="text-sm">Half Day Type</Label>
                <Select value={halfDayType} onValueChange={setHalfDayType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first_half">First Half</SelectItem>
                    <SelectItem value="second_half">Second Half</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {durationType === 'full_day' && (
            <div>
              <Label className="text-sm">Activity Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(activityDate, 'PPP')}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={activityDate}
                    onSelect={(d) => d && setActivityDate(d)}
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {durationType === 'multiple_days' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-sm">From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(fromDate, 'PP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={fromDate}
                        onSelect={(d) => d && setFromDate(d)}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Label className="text-sm">To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal mt-1 text-xs">
                        <CalendarIcon className="mr-1 h-3 w-3" />
                        {format(toDate, 'PP')}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={toDate}
                        onSelect={(d) => d && setToDate(d)}
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              {totalDays && (
                <p className="text-sm text-muted-foreground text-center font-medium">
                  Total: {totalDays} day{totalDays > 1 ? 's' : ''}
                </p>
              )}
            </div>
          )}

          {/* Activity Type */}
          <div>
            <Label className="text-sm">Activity Type</Label>
            <Select value={activityType} onValueChange={setActivityType}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Site Name */}
          <div>
            <Label className="text-sm">Site</Label>
            <Input
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Enter site name..."
              className="mt-1"
            />
          </div>

          {/* Remarks */}
          <div>
            <Label className="text-sm">Remarks / Notes</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any notes about the activity..."
              className="mt-1"
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Activity'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
