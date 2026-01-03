import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Route, ChevronRight, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Beat {
  id: string;
  beat_id: string;
  beat_name: string;
  category: string | null;
  is_active: boolean | null;
  average_km: number | null;
  travel_allowance: number | null;
}

interface Props {
  distributorId: string;
}

export function DistributorBeats({ distributorId }: Props) {
  const navigate = useNavigate();
  const [beats, setBeats] = useState<Beat[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    loadBeats();

    // Real-time subscription
    const channel = supabase
      .channel(`distributor-beats-${distributorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'beats',
          filter: `distributor_id=eq.${distributorId}`
        },
        () => {
          loadBeats();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [distributorId]);

  const loadBeats = async () => {
    try {
      const { data, error } = await supabase
        .from('beats')
        .select('id, beat_id, beat_name, category, is_active, average_km, travel_allowance')
        .eq('distributor_id', distributorId)
        .order('beat_name');

      if (error) throw error;
      setBeats(data || []);
    } catch (error: any) {
      toast.error("Failed to load beats: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = new Set(beats.map(b => b.category).filter(Boolean));
    return Array.from(cats) as string[];
  }, [beats]);

  // Filtered beats
  const filteredBeats = useMemo(() => {
    return beats.filter(beat => {
      const matchesSearch = beat.beat_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           beat.beat_id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || 
                           (statusFilter === "active" && beat.is_active !== false) ||
                           (statusFilter === "inactive" && beat.is_active === false);
      const matchesCategory = categoryFilter === "all" || beat.category === categoryFilter;
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [beats, searchQuery, statusFilter, categoryFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Route className="h-4 w-4" />
          Beats Supported ({filteredBeats.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search beats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[120px] h-9">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            {categories.length > 0 && (
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredBeats.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {beats.length === 0 ? "No beats linked to this distributor" : "No beats match your filters"}
            </p>
            {beats.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Link beats by setting distributor in the Beat Master
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredBeats.map(beat => (
              <div
                key={beat.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/beat/${beat.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Route className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{beat.beat_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted-foreground">{beat.beat_id}</span>
                      {beat.category && (
                        <Badge variant="outline" className="text-xs">
                          {beat.category}
                        </Badge>
                      )}
                      {beat.is_active === false && (
                        <Badge variant="secondary" className="text-xs">Inactive</Badge>
                      )}
                      {beat.average_km && (
                        <span className="text-xs text-muted-foreground">{beat.average_km} km</span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
