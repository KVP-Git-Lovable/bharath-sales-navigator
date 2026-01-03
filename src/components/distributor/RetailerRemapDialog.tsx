import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, ArrowRight, Store, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Retailer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  distributor_id: string | null;
  distributor_name?: string;
}

interface Distributor {
  id: string;
  name: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceDistributorId?: string;
  onSuccess?: () => void;
}

export function RetailerRemapDialog({ open, onOpenChange, sourceDistributorId, onSuccess }: Props) {
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [selectedRetailers, setSelectedRetailers] = useState<string[]>([]);
  const [targetDistributorId, setTargetDistributorId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [distributorSearch, setDistributorSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, sourceDistributorId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load retailers
      let retailerQuery = supabase
        .from('retailers')
        .select('id, name, phone, address, distributor_id')
        .order('name');
      
      if (sourceDistributorId) {
        retailerQuery = retailerQuery.eq('distributor_id', sourceDistributorId);
      }

      const { data: retailersData, error: retailerError } = await retailerQuery;
      if (retailerError) throw retailerError;

      // Load distributors for target selection
      const { data: distributorsData, error: distError } = await supabase
        .from('distributors')
        .select('id, name')
        .order('name');
      if (distError) throw distError;

      // Get distributor names for retailers
      const retailersWithDist = (retailersData || []).map(r => {
        const dist = distributorsData?.find(d => d.id === r.distributor_id);
        return { ...r, distributor_name: dist?.name };
      });

      setRetailers(retailersWithDist);
      setDistributors(distributorsData || []);
    } catch (error: any) {
      toast.error("Failed to load data: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredRetailers = retailers.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.phone?.includes(searchQuery) ||
    r.address?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDistributors = distributors.filter(d =>
    d.name.toLowerCase().includes(distributorSearch.toLowerCase())
  );

  const toggleRetailer = (id: string) => {
    setSelectedRetailers(prev => 
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedRetailers.length === filteredRetailers.length) {
      setSelectedRetailers([]);
    } else {
      setSelectedRetailers(filteredRetailers.map(r => r.id));
    }
  };

  const handleRemap = async () => {
    if (selectedRetailers.length === 0) {
      toast.error("Please select at least one retailer");
      return;
    }
    if (!targetDistributorId) {
      toast.error("Please select a target distributor");
      return;
    }

    setSubmitting(true);
    try {
      const targetDist = distributors.find(d => d.id === targetDistributorId);
      
      const { error } = await supabase
        .from('retailers')
        .update({ 
          distributor_id: targetDistributorId,
          parent_type: 'Distributor',
          parent_name: targetDist?.name || null
        })
        .in('id', selectedRetailers);

      if (error) throw error;

      toast.success(`${selectedRetailers.length} retailer(s) remapped successfully`);
      setSelectedRetailers([]);
      setTargetDistributorId("");
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast.error("Failed to remap retailers: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Remap Retailers to Distributor
          </DialogTitle>
          <DialogDescription>
            Select retailers and choose a new distributor to transfer them to.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Retailer Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-sm">Select Retailers</h4>
              <Button variant="ghost" size="sm" onClick={toggleAll}>
                {selectedRetailers.length === filteredRetailers.length ? "Deselect All" : "Select All"}
              </Button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search retailers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-48 border rounded-md">
              {loading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredRetailers.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No retailers found</div>
              ) : (
                <div className="p-2 space-y-1">
                  {filteredRetailers.map(retailer => (
                    <div 
                      key={retailer.id}
                      className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                        selectedRetailers.includes(retailer.id) ? 'bg-primary/10' : ''
                      }`}
                      onClick={() => toggleRetailer(retailer.id)}
                    >
                      <Checkbox 
                        checked={selectedRetailers.includes(retailer.id)}
                        onCheckedChange={() => toggleRetailer(retailer.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{retailer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {retailer.phone} {retailer.address && `• ${retailer.address}`}
                        </p>
                      </div>
                      {retailer.distributor_name && (
                        <Badge variant="outline" className="text-xs shrink-0">
                          {retailer.distributor_name}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
            {selectedRetailers.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                {selectedRetailers.length} retailer(s) selected
              </p>
            )}
          </div>

          {/* Arrow */}
          <div className="flex justify-center">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Target Distributor Selection */}
          <div>
            <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Target Distributor
            </h4>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search distributors..."
                value={distributorSearch}
                onChange={(e) => setDistributorSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <ScrollArea className="h-36 border rounded-md">
              <div className="p-2 space-y-1">
                {filteredDistributors.map(dist => (
                  <div 
                    key={dist.id}
                    className={`flex items-center gap-3 p-2 rounded-md cursor-pointer hover:bg-muted/50 ${
                      targetDistributorId === dist.id ? 'bg-primary/10 border border-primary' : ''
                    }`}
                    onClick={() => setTargetDistributorId(dist.id)}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 ${
                      targetDistributorId === dist.id ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`} />
                    <span className="font-medium text-sm">{dist.name}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleRemap} 
            disabled={submitting || selectedRetailers.length === 0 || !targetDistributorId}
          >
            {submitting ? "Remapping..." : `Remap ${selectedRetailers.length} Retailer(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
