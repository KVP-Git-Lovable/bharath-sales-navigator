import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Download, Eye, Volume2, Filter, X } from "lucide-react";
import * as XLSX from "xlsx";

interface CompetitionDataListProps {
  data: any[];
  skus: any[];
}

export function CompetitionDataList({ data, skus }: CompetitionDataListProps) {
  const [filterRetailer, setFilterRetailer] = useState("");
  const [filterImpact, setFilterImpact] = useState("all");
  const [filterAttention, setFilterAttention] = useState("all");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [showImageDialog, setShowImageDialog] = useState(false);
  const [showAudioDialog, setShowAudioDialog] = useState(false);

  const filteredData = data.filter(item => {
    if (filterRetailer && !item.retailers?.name?.toLowerCase().includes(filterRetailer.toLowerCase())) {
      return false;
    }
    if (filterImpact !== "all" && item.impact_level !== filterImpact) {
      return false;
    }
    if (filterAttention !== "all") {
      const needsAttention = item.needs_attention ? "yes" : "no";
      if (needsAttention !== filterAttention) return false;
    }
    return true;
  });

  const exportToExcel = () => {
    const exportData = filteredData.map(item => ({
      "SKU Name": skus.find(s => s.id === item.sku_id)?.sku_name || 'Unknown',
      "Retailer": item.retailers?.name || 'N/A',
      "Date": item.visits?.visit_date ? new Date(item.visits.visit_date).toLocaleDateString() : new Date(item.created_at).toLocaleDateString(),
      "Stock Quantity": item.stock_quantity,
      "Unit": item.unit,
      "Insight": item.insight || 'N/A',
      "Impact Level": item.impact_level || 'N/A',
      "Needs Attention": item.needs_attention ? 'Yes' : 'No',
      "Photos": item.photo_urls?.length || 0,
      "Voice Notes": item.voice_note_urls?.length || 0
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Competition Data");
    XLSX.writeFile(wb, `competition_data_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const clearFilters = () => {
    setFilterRetailer("");
    setFilterImpact("all");
    setFilterAttention("all");
  };

  const hasActiveFilters = filterRetailer || filterImpact !== "all" || filterAttention !== "all";

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Retailer</label>
          <Input
            placeholder="Filter by retailer..."
            value={filterRetailer}
            onChange={(e) => setFilterRetailer(e.target.value)}
          />
        </div>
        <div className="w-[150px]">
          <label className="text-sm font-medium mb-1 block">Impact Level</label>
          <Select value={filterImpact} onValueChange={setFilterImpact}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[150px]">
          <label className="text-sm font-medium mb-1 block">Attention</label>
          <Select value={filterAttention} onValueChange={setFilterAttention}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="yes">Needs Attention</SelectItem>
              <SelectItem value="no">Normal</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
        <Button onClick={exportToExcel} size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export to Excel
        </Button>
      </div>

      {/* Data Table */}
      <div className="border rounded-lg">
        <div className="max-h-[500px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU Name</TableHead>
                <TableHead>Retailer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Stock Qty</TableHead>
                <TableHead>Insight</TableHead>
                <TableHead>Impact</TableHead>
                <TableHead>Attention</TableHead>
                <TableHead>Media</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No data found
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {skus.find(s => s.id === item.sku_id)?.sku_name || 'Unknown'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="link"
                        className="p-0 h-auto font-normal text-primary hover:underline"
                        onClick={() => window.location.href = `/retailer/${item.retailer_id}`}
                      >
                        {item.retailers?.name || 'N/A'}
                      </Button>
                    </TableCell>
                    <TableCell>
                      {item.visits?.visit_date 
                        ? new Date(item.visits.visit_date).toLocaleDateString()
                        : new Date(item.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{item.stock_quantity} {item.unit}</TableCell>
                    <TableCell className="capitalize">
                      {item.insight ? item.insight.replace('_', ' ') : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {item.impact_level && (
                        <Badge variant={
                          item.impact_level === 'high' ? 'destructive' :
                          item.impact_level === 'medium' ? 'default' : 'secondary'
                        }>
                          {item.impact_level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.needs_attention && (
                        <Badge variant="destructive">Yes</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {item.photo_urls && item.photo_urls.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedImages(item.photo_urls);
                              setShowImageDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {item.photo_urls.length}
                          </Button>
                        )}
                        {item.voice_note_urls && item.voice_note_urls.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAudio(item.voice_note_urls[0]);
                              setShowAudioDialog(true);
                            }}
                          >
                            <Volume2 className="h-4 w-4 mr-1" />
                            {item.voice_note_urls.length}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Image Viewer Dialog */}
      <Dialog open={showImageDialog} onOpenChange={setShowImageDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Competition Photos</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-auto">
            {selectedImages.map((url, idx) => (
              <img
                key={idx}
                src={url}
                alt={`Competition photo ${idx + 1}`}
                className="w-full rounded-lg border"
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Audio Player Dialog */}
      <Dialog open={showAudioDialog} onOpenChange={setShowAudioDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Voice Note</DialogTitle>
          </DialogHeader>
          {selectedAudio && (
            <audio controls className="w-full">
              <source src={selectedAudio} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
