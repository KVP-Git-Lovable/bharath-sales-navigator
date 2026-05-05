import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, CalendarIcon, Save, Navigation, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Geolocation } from "@capacitor/geolocation";

const EVENT_TYPES = ["Sales Promotion", "Awareness Campaign", "Retail Activation", "Others"];

interface ProfileOption { id: string; full_name: string }

export default function EventCreate() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  // Basic
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState("Sales Promotion");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>(new Date());
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("20:00");

  // Location
  const [address, setAddress] = useState("");
  const [landmark, setLandmark] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [capturingGPS, setCapturingGPS] = useState(false);

  // Budget
  const [budget, setBudget] = useState("");
  const [salesTarget, setSalesTarget] = useState("");
  const [expectedFootfall, setExpectedFootfall] = useState("");

  // Team
  const [selectedReps, setSelectedReps] = useState<ProfileOption[]>([]);
  const [repPickerOpen, setRepPickerOpen] = useState(false);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-event-team"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id, full_name").order("full_name");
      return (data || []) as ProfileOption[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const availableReps = useMemo(
    () => profiles.filter((p) => !selectedReps.some((s) => s.id === p.id)),
    [profiles, selectedReps]
  );

  const captureLocation = async () => {
    setCapturingGPS(true);
    try {
      try {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
        setLatitude(pos.coords.latitude.toFixed(4));
        setLongitude(pos.coords.longitude.toFixed(4));
        toast.success("Location captured");
      } catch {
        if (!navigator.geolocation) throw new Error("no geo");
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (p) => {
              setLatitude(p.coords.latitude.toFixed(4));
              setLongitude(p.coords.longitude.toFixed(4));
              toast.success("Location captured");
              resolve();
            },
            () => reject(),
            { enableHighAccuracy: true, timeout: 10000 }
          );
        });
      }
    } catch {
      toast.error("Unable to capture location");
    } finally {
      setCapturingGPS(false);
    }
  };

  const addRep = (id: string) => {
    const p = profiles.find((x) => x.id === id);
    if (p) setSelectedReps((prev) => [...prev, p]);
    setRepPickerOpen(false);
  };
  const removeRep = (id: string) => setSelectedReps((prev) => prev.filter((p) => p.id !== id));

  const validate = (): string | null => {
    if (!eventName.trim()) return "Event Name is required";
    if (!startDate) return "Start Date is required";
    if (!endDate) return "End Date is required";
    if (endDate < startDate) return "End Date must be on or after Start Date";
    if (!address.trim()) return "Address is required";
    if (!budget || isNaN(Number(budget))) return "Budget is required and must be numeric";
    if (salesTarget && isNaN(Number(salesTarget))) return "Sales Target must be numeric";
    if (selectedReps.length === 0) return "At least one Sales Rep is required";
    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) return "Invalid time format";
    return null;
  };

  const handleSave = async () => {
    if (!user?.id) { toast.error("Please log in"); return; }
    const err = validate();
    if (err) { toast.error(err); return; }

    setSubmitting(true);
    try {
      const startDateStr = format(startDate!, "yyyy-MM-dd");
      const endDateStr = format(endDate!, "yyyy-MM-dd");
      const isMulti = startDateStr !== endDateStr;

      // 1) create visit
      const { data: visit, error: vErr } = await supabase
        .from("visits")
        .insert({
          user_id: user.id,
          planned_date: startDateStr,
          status: "planned",
          visit_type: "activity",
        } as any)
        .select("id")
        .single();
      if (vErr) throw vErr;

      // 2) create activity_event
      const startISO = new Date(`${startDateStr}T${startTime}:00`).toISOString();
      const endISO = new Date(`${endDateStr}T${endTime}:00`).toISOString();

      const { error: aErr } = await supabase.from("activity_events").insert({
        visit_id: visit.id,
        user_id: user.id,
        activity_type: "Event",
        activity_name: eventName,
        event_name: eventName,
        description: description || null,
        duration_type: isMulti ? "multiple_days" : "hour_based",
        activity_date: startDateStr,
        from_date: isMulti ? startDateStr : null,
        to_date: isMulti ? endDateStr : null,
        total_days: isMulti
          ? Math.max(1, Math.round((endDate!.getTime() - startDate!.getTime()) / 86400000) + 1)
          : 1,
        start_time: startISO,
        end_time: endISO,
        activity_place: address,
        landmark: landmark || null,
        start_latitude: latitude ? Number(latitude) : null,
        start_longitude: longitude ? Number(longitude) : null,
        budget: Number(budget),
        sales_target: salesTarget ? Number(salesTarget) : null,
        expected_footfall: expectedFootfall || null,
        sales_reps: selectedReps.map((r) => r.id),
        remarks: `${eventType}${description ? ` — ${description}` : ""}`,
      } as any);
      if (aErr) {
        await supabase.from("visits").delete().eq("id", visit.id);
        throw aErr;
      }

      toast.success("Event created successfully");
      window.dispatchEvent(new Event("visitDataChanged"));
      navigate("/visits/retailers");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight">Event Details</h1>
              <p className="text-xs text-muted-foreground">Add event information</p>
            </div>
          </div>
          <Button onClick={handleSave} disabled={submitting} className="rounded-full">
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {/* Basic Information */}
        <Card className="p-5 rounded-2xl">
          <h2 className="text-sm font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Event Name" required>
              <Input value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="e.g. Big Deal Mela" />
            </Field>
            <Field label="Event Type">
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="md:col-span-2">
              <Field label="Description">
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description of the event" rows={2} />
              </Field>
            </div>
            <Field label="Start Date" required>
              <DatePopover date={startDate} onChange={setStartDate} />
            </Field>
            <Field label="End Date" required>
              <DatePopover date={endDate} onChange={setEndDate} />
            </Field>
            <div className="md:col-span-2">
              <Field label="Time">
                <div className="flex items-center gap-2">
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="max-w-[160px]" />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="max-w-[160px]" />
                </div>
              </Field>
            </div>
          </div>
        </Card>

        {/* Location */}
        <Card className="p-5 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold">Location</h2>
            <Button type="button" variant="outline" size="sm" onClick={captureLocation} disabled={capturingGPS} className="rounded-full">
              {capturingGPS ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Navigation className="h-4 w-4 mr-1" />}
              Use Current Location
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Address" required>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address" />
            </Field>
            <Field label="Landmark">
              <Input value={landmark} onChange={(e) => setLandmark(e.target.value)} placeholder="Nearby landmark" />
            </Field>
            <Field label="Latitude (Optional)">
              <Input type="number" step="any" value={latitude} onChange={(e) => setLatitude(e.target.value)} />
            </Field>
            <Field label="Longitude (Optional)">
              <Input type="number" step="any" value={longitude} onChange={(e) => setLongitude(e.target.value)} />
            </Field>
          </div>
        </Card>

        {/* Budget & Targets */}
        <Card className="p-5 rounded-2xl">
          <h2 className="text-sm font-semibold mb-4">Budget &amp; Targets</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Budget (₹)" required>
              <Input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} placeholder="25000" />
            </Field>
            <Field label="Sales Target (₹)">
              <Input type="number" value={salesTarget} onChange={(e) => setSalesTarget(e.target.value)} placeholder="60000" />
            </Field>
            <Field label="Expected Footfall">
              <Input value={expectedFootfall} onChange={(e) => setExpectedFootfall(e.target.value)} placeholder="500+" />
            </Field>
          </div>
        </Card>

        {/* Team */}
        <Card className="p-5 rounded-2xl">
          <h2 className="text-sm font-semibold mb-4">Team</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Sales Reps Involved" required>
              <div className="rounded-md border bg-background min-h-12 p-2 flex flex-wrap gap-2 items-center">
                {selectedReps.map((r) => (
                  <Badge key={r.id} variant="secondary" className="rounded-full pl-3 pr-1 py-1 gap-1">
                    {r.full_name}
                    <button type="button" onClick={() => removeRep(r.id)} className="ml-1 rounded-full hover:bg-muted p-0.5" aria-label={`Remove ${r.full_name}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {selectedReps.length === 0 && (
                  <span className="text-sm text-muted-foreground px-1">No reps selected</span>
                )}
              </div>
            </Field>
            <Field label="Add More (Optional)">
              <Popover open={repPickerOpen} onOpenChange={setRepPickerOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    Choose member
                    <span className="text-muted-foreground text-xs">{availableReps.length} available</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Search member..." />
                    <CommandList>
                      <CommandEmpty>No members found</CommandEmpty>
                      <CommandGroup>
                        {availableReps.map((p) => (
                          <CommandItem key={p.id} value={p.full_name} onSelect={() => addRep(p.id)}>
                            {p.full_name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </Field>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function DatePopover({ date, onChange }: { date: Date | undefined; onChange: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
          <CalendarIcon className="h-4 w-4 mr-2 opacity-60" />
          {date ? format(date, "dd MMM yyyy") : "Pick a date"}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="single" selected={date} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}