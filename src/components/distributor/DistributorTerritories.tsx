import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Map, ChevronRight, Search, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Territory {
  id: string;
  name: string;
  region: string;
  territory_type: string | null;
  pincode_ranges: string[] | null;
}

interface Props {
  distributorId: string;
}

const typeColors: Record<string, string> = {
  'state': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'region': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'district': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'city': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'area': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
};

export function DistributorTerritories({ distributorId }: Props) {
  const navigate = useNavigate();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [regionFilter, setRegionFilter] = useState<string>("all");

  useEffect(() => {
    loadTerritories();

    // Real-time subscription for territories table
    const channel = supabase
      .channel(`distributor-territories-${distributorId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'territories'
        },
        () => {
          loadTerritories();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [distributorId]);

  const loadTerritories = async () => {
    try {
      // Get territories that have this distributor in their assigned_distributor_ids array
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, region, territory_type, pincode_ranges')
        .contains('assigned_distributor_ids', [distributorId])
        .order('name');

      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      console.error("Failed to load territories:", error.message);
      setTerritories([]);
    } finally {
      setLoading(false);
    }
  };

  // Get unique values for filters
  const types = useMemo(() => {
    const t = new Set(territories.map(t => t.territory_type).filter(Boolean));
    return Array.from(t) as string[];
  }, [territories]);

  const regions = useMemo(() => {
    const r = new Set(territories.map(t => t.region).filter(Boolean));
    return Array.from(r) as string[];
  }, [territories]);

  // Filtered territories
  const filteredTerritories = useMemo(() => {
    return territories.filter(territory => {
      const matchesSearch = territory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           territory.region?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === "all" || territory.territory_type === typeFilter;
      const matchesRegion = regionFilter === "all" || territory.region === regionFilter;
      return matchesSearch && matchesType && matchesRegion;
    });
  }, [territories, searchQuery, typeFilter, regionFilter]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Map className="h-4 w-4" />
          Territories ({filteredTerritories.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search territories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-2">
            {types.length > 0 && (
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <Filter className="h-3 w-3 mr-1" />
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {types.map(t => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {regions.length > 0 && (
              <Select value={regionFilter} onValueChange={setRegionFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Regions</SelectItem>
                  {regions.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : filteredTerritories.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              {territories.length === 0 ? "No territories assigned" : "No territories match your filters"}
            </p>
            {territories.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Assign this distributor to territories in Territory Master
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {filteredTerritories.map(territory => (
              <div
                key={territory.id}
                className="flex items-center justify-between border rounded-lg p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => navigate(`/territory/${territory.id}`)}
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                    <Map className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-primary hover:underline">{territory.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{territory.region}</Badge>
                      {territory.territory_type && (
                        <Badge className={`text-xs capitalize ${typeColors[territory.territory_type] || 'bg-gray-100'}`}>
                          {territory.territory_type}
                        </Badge>
                      )}
                      {territory.pincode_ranges && territory.pincode_ranges.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {territory.pincode_ranges.length} pincodes
                        </span>
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
