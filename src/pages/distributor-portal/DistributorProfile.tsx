import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  ArrowLeft, 
  Building2, 
  Save, 
  Phone, 
  Mail, 
  MapPin,
  Calendar,
  Users,
  Truck,
  Store,
  FileText,
  Edit2,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import DistributorCompanyProfile from '@/components/distributor/DistributorCompanyProfile';

interface Distributor {
  id: string;
  name: string;
  contact_person: string;
  phone: string;
  email: string | null;
  address: string | null;
  gst_number: string | null;
  status: string;
  distribution_level: string | null;
  partnership_status: string | null;
  established_year: number | null;
  distribution_experience_years: number | null;
  sales_team_size: number | null;
  assets_vans: number | null;
  assets_trucks: number | null;
  network_retailers_count: number | null;
  region_coverage: string | null;
  onboarding_date: string | null;
  years_of_relationship: number | null;
  products_distributed: string[] | null;
  other_products: string[] | null;
  competition_products: string[] | null;
  strength: string | null;
  weakness: string | null;
  opportunities: string | null;
  threats: string | null;
  about_business: string | null;
  coverage_area: string | null;
}

const levelLabels: Record<string, string> = {
  'super_stockist': 'Super Stockist',
  'distributor': 'Distributor',
  'sub_distributor': 'Sub-Distributor',
  'agent': 'Agent',
};

const partnershipColors: Record<string, string> = {
  'platinum': 'bg-gradient-to-r from-slate-400 to-slate-600 text-white',
  'gold': 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white',
  'silver': 'bg-gradient-to-r from-gray-300 to-gray-500 text-white',
  'registered': 'bg-muted text-muted-foreground',
};

const DistributorProfile = () => {
  const navigate = useNavigate();
  const [distributor, setDistributor] = useState<Distributor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Distributor>>({});

  useEffect(() => {
    const storedUser = localStorage.getItem('distributor_user');
    if (!storedUser) {
      navigate('/distributor-portal/login');
      return;
    }
    const user = JSON.parse(storedUser);
    loadDistributor(user.distributor_id);
  }, [navigate]);

  const loadDistributor = async (distributorId: string) => {
    try {
      const { data, error } = await supabase
        .from('distributors')
        .select('*')
        .eq('id', distributorId)
        .single();

      if (error) throw error;
      setDistributor(data);
      setFormData(data);
    } catch (error: any) {
      toast.error('Failed to load profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!distributor) return;
    setSaving(true);

    try {
      const { error } = await supabase
        .from('distributors')
        .update({
          contact_person: formData.contact_person,
          phone: formData.phone,
          email: formData.email,
          address: formData.address,
          gst_number: formData.gst_number,
          established_year: formData.established_year,
          sales_team_size: formData.sales_team_size,
          assets_vans: formData.assets_vans,
          assets_trucks: formData.assets_trucks,
          network_retailers_count: formData.network_retailers_count,
          region_coverage: formData.region_coverage,
          coverage_area: formData.coverage_area,
          about_business: formData.about_business,
          strength: formData.strength,
          weakness: formData.weakness,
          opportunities: formData.opportunities,
          threats: formData.threats,
          updated_at: new Date().toISOString(),
        })
        .eq('id', distributor.id);

      if (error) throw error;

      toast.success('Profile updated successfully');
      setDistributor({ ...distributor, ...formData });
      setIsEditing(false);
    } catch (error: any) {
      toast.error('Failed to update: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!distributor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Profile not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background standalone-page">
      {/* Header */}
      <header className="sticky-header-safe z-50 bg-card border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/distributor-portal')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="font-semibold text-foreground">Company Profile</h1>
              <p className="text-xs text-muted-foreground">{distributor.name}</p>
            </div>
          </div>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => {
                setFormData(distributor);
                setIsEditing(false);
              }}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Company Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-foreground">{distributor.name}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {distributor.distribution_level && (
                      <Badge variant="outline">
                        {levelLabels[distributor.distribution_level] || distributor.distribution_level}
                      </Badge>
                    )}
                    {distributor.partnership_status && (
                      <Badge className={partnershipColors[distributor.partnership_status] || 'bg-muted'}>
                        {distributor.partnership_status.charAt(0).toUpperCase() + distributor.partnership_status.slice(1)}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="business">Business Info</TabsTrigger>
            <TabsTrigger value="swot">SWOT</TabsTrigger>
            <TabsTrigger value="invoice-settings">Invoice Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Contact Person</Label>
                    {isEditing ? (
                      <Input
                        value={formData.contact_person || ''}
                        onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        {distributor.contact_person}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Phone</Label>
                    {isEditing ? (
                      <Input
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        {distributor.phone}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Email</Label>
                    {isEditing ? (
                      <Input
                        type="email"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {distributor.email || '-'}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>GST Number</Label>
                    {isEditing ? (
                      <Input
                        value={formData.gst_number || ''}
                        onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1 text-sm">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        {distributor.gst_number || '-'}
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Address</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      rows={2}
                    />
                  ) : (
                    <div className="flex items-start gap-2 mt-1 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      {distributor.address || '-'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="business" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Business Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label>Established Year</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.established_year || ''}
                        onChange={(e) => setFormData({ ...formData, established_year: parseInt(e.target.value) || null })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{distributor.established_year || '-'}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Sales Team Size</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.sales_team_size || ''}
                        onChange={(e) => setFormData({ ...formData, sales_team_size: parseInt(e.target.value) || null })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{distributor.sales_team_size || 0}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Vans</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.assets_vans || ''}
                        onChange={(e) => setFormData({ ...formData, assets_vans: parseInt(e.target.value) || null })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{distributor.assets_vans || 0}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Trucks</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.assets_trucks || ''}
                        onChange={(e) => setFormData({ ...formData, assets_trucks: parseInt(e.target.value) || null })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Truck className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{distributor.assets_trucks || 0}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Network Retailers Count</Label>
                    {isEditing ? (
                      <Input
                        type="number"
                        value={formData.network_retailers_count || ''}
                        onChange={(e) => setFormData({ ...formData, network_retailers_count: parseInt(e.target.value) || null })}
                      />
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Store className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{distributor.network_retailers_count || 0}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <Label>Region Coverage</Label>
                    {isEditing ? (
                      <Input
                        value={formData.region_coverage || ''}
                        onChange={(e) => setFormData({ ...formData, region_coverage: e.target.value })}
                      />
                    ) : (
                      <p className="text-sm mt-1">{distributor.region_coverage || '-'}</p>
                    )}
                  </div>
                </div>
                <div>
                  <Label>Coverage Area</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.coverage_area || ''}
                      onChange={(e) => setFormData({ ...formData, coverage_area: e.target.value })}
                      rows={2}
                    />
                  ) : (
                    <p className="text-sm mt-1">{distributor.coverage_area || '-'}</p>
                  )}
                </div>
                <div>
                  <Label>About Business</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.about_business || ''}
                      onChange={(e) => setFormData({ ...formData, about_business: e.target.value })}
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-1">{distributor.about_business || '-'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="swot" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">SWOT Analysis</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg">
                  <Label className="text-green-700 dark:text-green-300 font-medium">Strengths</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.strength || ''}
                      onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                      className="mt-2 bg-white dark:bg-background"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-2">{distributor.strength || '-'}</p>
                  )}
                </div>
                <div className="bg-red-50 dark:bg-red-950 p-4 rounded-lg">
                  <Label className="text-red-700 dark:text-red-300 font-medium">Weaknesses</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.weakness || ''}
                      onChange={(e) => setFormData({ ...formData, weakness: e.target.value })}
                      className="mt-2 bg-white dark:bg-background"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-2">{distributor.weakness || '-'}</p>
                  )}
                </div>
                <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                  <Label className="text-blue-700 dark:text-blue-300 font-medium">Opportunities</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.opportunities || ''}
                      onChange={(e) => setFormData({ ...formData, opportunities: e.target.value })}
                      className="mt-2 bg-white dark:bg-background"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-2">{distributor.opportunities || '-'}</p>
                  )}
                </div>
                <div className="bg-orange-50 dark:bg-orange-950 p-4 rounded-lg">
                  <Label className="text-orange-700 dark:text-orange-300 font-medium">Threats</Label>
                  {isEditing ? (
                    <Textarea
                      value={formData.threats || ''}
                      onChange={(e) => setFormData({ ...formData, threats: e.target.value })}
                      className="mt-2 bg-white dark:bg-background"
                      rows={3}
                    />
                  ) : (
                    <p className="text-sm mt-2">{distributor.threats || '-'}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invoice-settings" className="space-y-4">
            <DistributorCompanyProfile distributorId={distributor.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default DistributorProfile;
