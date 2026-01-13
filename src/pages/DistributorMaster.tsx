import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Search, 
  Building2, 
  Phone, 
  MapPin,
  Users,
  Truck,
  Filter,
  ArrowRightLeft
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RetailerRemapDialog } from "@/components/distributor/RetailerRemapDialog";

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: string;
  distribution_level: string | null;
  partnership_status: string | null;
  gst_number: string | null;
  sales_team_size: number | null;
  assets_vans: number | null;
  assets_trucks: number | null;
  network_retailers_count: number | null;
  onboarding_date: string | null;
}

const statusColors: Record<string, string> = {
  'initial_connect': 'bg-gray-100 text-gray-800',
  'evaluation': 'bg-yellow-100 text-yellow-800',
  'strong_candidate': 'bg-blue-100 text-blue-800',
  'documentation': 'bg-purple-100 text-purple-800',
  'onboarded': 'bg-green-100 text-green-800',
  'active': 'bg-green-100 text-green-800',
  'inactive': 'bg-red-100 text-red-800',
  'drop': 'bg-red-100 text-red-800',
};

const partnershipColors: Record<string, string> = {
  'platinum': 'bg-gradient-to-r from-slate-400 to-slate-600 text-white',
  'gold': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  'silver': 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
  'registered': 'bg-gray-100 text-gray-800',
};

const levelLabels: Record<string, string> = {
  'super_stockist': 'Super Stockist',
  'distributor': 'Distributor',
  'sub_distributor': 'Sub-Distributor',
  'agent': 'Agent',
};

export default function DistributorMaster() {
  const navigate = useNavigate();
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [showRemapDialog, setShowRemapDialog] = useState(false);

  useEffect(() => {
    loadDistributors();
  }, []);

  const loadDistributors = async () => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDistributors(data || []);
    } catch (error: any) {
      toast.error("Failed to load distributors: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredDistributors = distributors.filter(d => {
    const matchesSearch = 
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.contact_person?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.phone?.includes(searchQuery);
    
    const matchesStatus = statusFilter === "all" || d.status === statusFilter;
    const matchesLevel = levelFilter === "all" || d.distribution_level === levelFilter;
    
    return matchesSearch && matchesStatus && matchesLevel;
  });

  const formatStatus = (status: string) => {
    return status?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown';
  };

  return (
    <Layout>
      <div className="p-4 pb-24 space-y-4">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">Distributor Master</h1>
              <p className="text-sm text-muted-foreground">Manage your distribution network</p>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline"
                onClick={() => setShowRemapDialog(true)}
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Remap
              </Button>
              <Button 
                onClick={() => navigate('/add-distributor')}
                size="sm"
                className="gap-2 flex-1 sm:flex-none"
              >
                <Plus className="h-4 w-4" />
                Add New
              </Button>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search distributors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
                <Filter className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="initial_connect">Initial Connect</SelectItem>
                <SelectItem value="evaluation">Evaluation</SelectItem>
                <SelectItem value="strong_candidate">Strong Candidate</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="onboarded">Onboarded</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="drop">Dropped</SelectItem>
              </SelectContent>
            </Select>

            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="flex-1 h-9 text-xs sm:text-sm">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="super_stockist">Super Stockist</SelectItem>
                <SelectItem value="distributor">Distributor</SelectItem>
                <SelectItem value="sub_distributor">Sub-Distributor</SelectItem>
                <SelectItem value="agent">Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-4 gap-2">
          <Card className="bg-primary/10">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-primary">{distributors.length}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card className="bg-green-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-green-600">
                {distributors.filter(d => d.status === 'active' || d.status === 'onboarded').length}
              </p>
              <p className="text-xs text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {distributors.filter(d => d.status === 'evaluation' || d.status === 'strong_candidate').length}
              </p>
              <p className="text-xs text-muted-foreground">Pipeline</p>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10">
            <CardContent className="p-3 text-center">
              <p className="text-lg font-bold text-purple-600">
                {distributors.filter(d => d.partnership_status === 'platinum' || d.partnership_status === 'gold').length}
              </p>
              <p className="text-xs text-muted-foreground">Premium</p>
            </CardContent>
          </Card>
        </div>

        {/* Distributor List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-32 bg-muted/50" />
              </Card>
            ))}
          </div>
        ) : filteredDistributors.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No distributors found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate('/add-distributor')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add First Distributor
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredDistributors.map((distributor) => (
              <Card 
                key={distributor.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => navigate(`/distributor/${distributor.id}`)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{distributor.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {distributor.partnership_status && (
                          <Badge className={`text-xs flex-shrink-0 ${partnershipColors[distributor.partnership_status] || 'bg-gray-100'}`}>
                            {distributor.partnership_status.charAt(0).toUpperCase() + distributor.partnership_status.slice(1)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{distributor.contact_person}</p>
                    </div>
                    <Badge className={`flex-shrink-0 ${statusColors[distributor.status] || 'bg-gray-100 text-gray-800'}`}>
                      {formatStatus(distributor.status)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {distributor.phone}
                    </span>
                    {distributor.distribution_level && (
                      <Badge variant="outline" className="text-xs">
                        {levelLabels[distributor.distribution_level] || distributor.distribution_level}
                      </Badge>
                    )}
                  </div>

                  {distributor.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mb-2">
                      <MapPin className="h-3 w-3" />
                      {distributor.address}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {distributor.sales_team_size !== null && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {distributor.sales_team_size} team
                      </span>
                    )}
                    {(distributor.assets_vans || distributor.assets_trucks) && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {(distributor.assets_vans || 0) + (distributor.assets_trucks || 0)} vehicles
                      </span>
                    )}
                    {distributor.network_retailers_count !== null && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {distributor.network_retailers_count} retailers
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Remap Dialog */}
        <RetailerRemapDialog 
          open={showRemapDialog} 
          onOpenChange={setShowRemapDialog}
          onSuccess={loadDistributors}
        />
      </div>
    </Layout>
  );
}
