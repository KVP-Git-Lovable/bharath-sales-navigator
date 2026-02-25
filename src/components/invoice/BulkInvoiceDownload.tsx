import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Download, Loader2, PackageCheck } from "lucide-react";
import JSZip from "jszip";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { downloadFile } from "@/utils/fileDownloader";

const SUPABASE_URL = "https://etabpbfokzhhfuybeieu.supabase.co";

export default function BulkInvoiceDownload() {
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [totalFiles, setTotalFiles] = useState(0);
  const [downloadedFiles, setDownloadedFiles] = useState(0);

  const fetchInvoiceFiles = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (startDate > endDate) {
      toast.error("Start date must be before end date");
      return;
    }

    setLoading(true);
    setProgress(0);
    setDownloadedFiles(0);

    try {
      // List all files in the invoices bucket
      const { data: files, error } = await supabase.storage
        .from("invoices")
        .list("", { limit: 10000, sortBy: { column: "created_at", order: "asc" } });

      if (error) throw error;

      // Filter files by date range
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      const startOfDay = new Date(startDate);
      startOfDay.setHours(0, 0, 0, 0);

      const filteredFiles = (files || []).filter((file) => {
        const fileDate = new Date(file.created_at);
        return fileDate >= startOfDay && fileDate <= endOfDay;
      });

      if (filteredFiles.length === 0) {
        toast.info("No invoices found in the selected date range");
        setLoading(false);
        return;
      }

      setTotalFiles(filteredFiles.length);
      toast.info(`Found ${filteredFiles.length} invoices. Preparing ZIP...`);

      const zip = new JSZip();
      let completed = 0;

      // Download each file and add to ZIP
      const batchSize = 5;
      for (let i = 0; i < filteredFiles.length; i += batchSize) {
        const batch = filteredFiles.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (file) => {
            try {
              const url = `${SUPABASE_URL}/storage/v1/object/public/invoices/${file.name}`;
              const response = await fetch(url);
              if (!response.ok) throw new Error(`Failed to fetch ${file.name}`);
              const blob = await response.blob();
              zip.file(file.name, blob);
            } catch (err) {
              console.error(`Failed to download ${file.name}:`, err);
            } finally {
              completed++;
              setDownloadedFiles(completed);
              setProgress(Math.round((completed / filteredFiles.length) * 100));
            }
          })
        );
      }

      // Generate ZIP
      toast.info("Compressing files...");
      const zipBlob = await zip.generateAsync({ type: "blob" }, (metadata) => {
        setProgress(Math.round(metadata.percent));
      });

      const dateRange = `${format(startDate, "dd-MM-yyyy")}_to_${format(endDate, "dd-MM-yyyy")}`;
      const filename = `Invoices_${dateRange}.zip`;

      await downloadFile({
        filename,
        mimeType: "application/zip",
        blob: zipBlob,
      });

      toast.success(`Downloaded ${filteredFiles.length} invoices as ZIP!`);
    } catch (error: any) {
      console.error("Bulk download error:", error);
      toast.error("Failed to download invoices: " + error.message);
    } finally {
      setLoading(false);
      setProgress(0);
      setDownloadedFiles(0);
      setTotalFiles(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageCheck className="h-5 w-5" />
          Bulk Download Invoices
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a date range to download all invoice PDFs as a single ZIP file
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-sm font-medium">From Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !startDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {startDate ? format(startDate, "dd MMM yyyy") : "Pick start date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={startDate}
                  onSelect={setStartDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-sm font-medium">To Date</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full sm:w-[200px] justify-start text-left font-normal",
                    !endDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {endDate ? format(endDate, "dd MMM yyyy") : "Pick end date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={endDate}
                  onSelect={setEndDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Download Button */}
          <div className="flex items-end">
            <Button
              onClick={fetchInvoiceFiles}
              disabled={loading || !startDate || !endDate}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download ZIP
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress */}
        {loading && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {downloadedFiles < totalFiles
                  ? `Downloading ${downloadedFiles}/${totalFiles} files...`
                  : "Compressing..."}
              </span>
              <span>{progress}%</span>
            </div>
            <Progress value={progress} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
