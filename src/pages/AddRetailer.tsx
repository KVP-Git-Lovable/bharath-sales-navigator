import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Layout } from "@/components/Layout";
import { Plus, MapPin, Phone, Store, Camera, Tag, X, ScanLine, Check, ChevronsUpDown, WifiOff, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useOfflineRetailers } from "@/hooks/useOfflineRetailers";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { offlineStorage, STORES } from "@/lib/offlineStorage";
import { useConnectivity } from "@/hooks/useConnectivity";

export const AddRetailer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const connectivityStatus = useConnectivity();
  const returnTo = location.state?.returnTo || '/my-retailers';
  const plannedBeats = location.state?.plannedBeats || [];
  const [retailerData, setRetailerData] = useState({
    name: "",
    gstNumber: "",
    phone: "",
    address: "",
    category: "",
    notes: "",
    parentType: "Distributor", // Default to Distributor
    parentName: "BHARATH BEVERAGES",
    selectedDistributors: [] as string[], // Array for multiple distributors
    locationTag: "",
    retailType: "",
    potential: "",
    competitor1: "",
    competitor2: "",
    competitor3: "",
    latitude: "",
    longitude: "",
    photo_url: "",
    manual_credit_score: ""
  });

  const [isSaving, setIsSaving] = useState(false);
  const [beatDialogOpen, setBeatDialogOpen] = useState(false);
  const [existingBeat, setExistingBeat] = useState<string | undefined>();
  const [newBeat, setNewBeat] = useState("");
  const [existingBeats, setExistingBeats] = useState<string[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [capturedPhotoPreview, setCapturedPhotoPreview] = useState<string | null>(null);
  const [distributors, setDistributors] = useState<{id: string, name: string}[]>([]);
  const [selectedBeat, setSelectedBeat] = useState<string>('');
  const [beats, setBeats] = useState<{beat_id: string, beat_name: string}[]>([]);
  const [isScanningBoard, setIsScanningBoard] = useState(false);
  const [territories, setTerritories] = useState<{id: string, name: string, region: string}[]>([]);
  const [selectedTerritoryId, setSelectedTerritoryId] = useState<string | null>(null);
  const [territoryComboOpen, setTerritoryComboOpen] = useState(false);
  const [creditConfig, setCreditConfig] = useState<{is_enabled: boolean, scoring_mode: string} | null>(null);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);

  const categories = ["Category A", "Category B", "Category C"];
  const parentTypes = ["Company", "Super Stockist", "Distributor"];
  const retailTypes = ["Grocery Store", "Supermarket", "Convenience Store", "Provision Store", "General Store", "Milk Parlour", "Hotel", "Other"];
  const potentials = ["High", "Medium", "Low"];
  const [customRetailType, setCustomRetailType] = useState("");

  // Load distributors from vendors table (Distributor Management)
  const loadDistributors = async () => {
    if (!user) return;
    const { data, error } = await supabase.rpc('get_public_vendors');
    
    if (error) {
      console.error('Failed to load distributors:', error);
      setDistributors([]);
    } else {
      setDistributors(data || []);
    }
  };

  // Load beats from the beats table (online) or from cache (offline)
  const loadBeats = async () => {
    if (!user) {
      console.log('[AddRetailer] Cannot load beats - no user');
      return;
    }
    
    console.log('[AddRetailer] Loading beats. User ID:', user.id, 'Connectivity status:', connectivityStatus);
    
    if (connectivityStatus === 'online') {
      // ONLINE: Load from Supabase (existing behavior)
      try {
        const { data, error } = await supabase
          .from('beats')
          .select('beat_id, beat_name, created_by, is_active, id')
          .eq('created_by', user.id)
          .eq('is_active', true)
          .order('beat_name');
        
        if (error) throw error;
        
        // Cache beats immediately after loading for offline access
        if (data && data.length > 0) {
          await offlineStorage.init();
          console.log('[AddRetailer Online] Caching beats to IndexedDB:', data.length);
          for (const beat of data) {
            await offlineStorage.save(STORES.BEATS, {
              id: beat.id,
              beat_id: beat.beat_id,
              beat_name: beat.beat_name,
              created_by: user.id,
              is_active: true
            });
          }
          console.log('[AddRetailer Online] ✅ Beats cached successfully');
        }
        
        setBeats(data || []);
        console.log('[AddRetailer Online] Loaded beats from Supabase:', data?.length || 0);
      } catch (error) {
        console.error('[AddRetailer Online] Failed to load beats:', error);
        
        // Fallback to cache on error
        try {
          await offlineStorage.init();
          const cachedBeats = await offlineStorage.getAll(STORES.BEATS);
          const userBeats = cachedBeats.filter((beat: any) => 
            beat.created_by === user.id && beat.is_active
          );
          setBeats(userBeats.map((beat: any) => ({
            beat_id: beat.beat_id,
            beat_name: beat.beat_name
          })));
          console.log('[AddRetailer] Loaded beats from cache (fallback):', userBeats.length);
        } catch (cacheError) {
          console.error('[AddRetailer] Cache fallback failed:', cacheError);
          setBeats([]);
        }
      }
    } else {
      // OFFLINE or UNKNOWN: Load from IndexedDB cache
      try {
        console.log('[AddRetailer Offline] Initializing offline storage...');
        await offlineStorage.init();
        
        console.log('[AddRetailer Offline] Getting all cached beats...');
        const cachedBeats = await offlineStorage.getAll(STORES.BEATS);
        console.log('[AddRetailer Offline] Total cached beats:', cachedBeats.length, cachedBeats);
        
        console.log('[AddRetailer Offline] Filtering beats for user:', user.id);
        const userBeats = cachedBeats.filter((beat: any) => {
          const matches = beat.created_by === user.id && beat.is_active;
          console.log('[AddRetailer Offline] Beat:', beat.beat_name, 'created_by:', beat.created_by, 'is_active:', beat.is_active, 'matches:', matches);
          return matches;
        });
        
        const mappedBeats = userBeats.map((beat: any) => ({
          beat_id: beat.beat_id,
          beat_name: beat.beat_name
        }));
        
        setBeats(mappedBeats);
        console.log('[AddRetailer Offline] Final beats to display:', mappedBeats.length, mappedBeats);
      } catch (error) {
        console.error('[AddRetailer Offline] Error loading beats from cache:', error);
        setBeats([]);
      }
    }
  };

  // Load territories from the territories table
  const loadTerritories = async () => {
    try {
      const { data, error } = await supabase
        .from('territories')
        .select('id, name, region')
        .order('name');
      
      if (error) throw error;
      setTerritories(data || []);
    } catch (error: any) {
      console.error('Error loading territories:', error);
    }
  };

  useEffect(() => {
    if (user) {
      loadDistributors();
      loadBeats();
      loadTerritories();
      loadCreditConfig();
    }
  }, [user, connectivityStatus]); // Re-run when connectivity changes

  // Listen for beat creation events to reload beats
  useEffect(() => {
    const handleBeatCreated = () => {
      console.log('[AddRetailer] Beat created event received, reloading beats...');
      if (user) {
        loadBeats();
      }
    };

    window.addEventListener('beatCreated', handleBeatCreated);
    return () => window.removeEventListener('beatCreated', handleBeatCreated);
  }, [user]);

  // Auto-select beat if coming from My Visits with planned beat(s)
  useEffect(() => {
    if (plannedBeats.length > 0 && !selectedBeat) {
      // If only one beat planned, auto-select it
      // If multiple beats, auto-select the first one
      setSelectedBeat(plannedBeats[0].beat_id);
    }
  }, [plannedBeats, selectedBeat]);

  const loadCreditConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('credit_management_config')
        .select('is_enabled, scoring_mode')
        .single();
      
      if (!error && data) {
        setCreditConfig(data);
      }
    } catch (error) {
      console.error('Error loading credit config:', error);
    }
  };

  const handleInputChange = (field: string, value: string | string[]) => {
    setRetailerData(prev => ({ ...prev, [field]: value }));
  };

  const handleDistributorToggle = (distributorId: string, distributorName: string) => {
    setRetailerData(prev => {
      const isSelected = prev.selectedDistributors.includes(distributorId);
      if (isSelected) {
        return {
          ...prev,
          selectedDistributors: prev.selectedDistributors.filter(id => id !== distributorId),
          parentName: prev.selectedDistributors.length === 1 ? "" : prev.parentName
        };
      } else {
        const newSelectedDistributors = [...prev.selectedDistributors, distributorId];
        const distributorNames = newSelectedDistributors.map(id => 
          distributors.find(d => d.id === id)?.name || ""
        ).filter(Boolean);
        return {
          ...prev,
          selectedDistributors: newSelectedDistributors,
          parentName: distributorNames.join(", ")
        };
      }
    });
  };

  const handlePhotoCapture = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please sign in to upload photos', variant: 'destructive' });
      return;
    }

    try {
      setIsUploadingPhoto(true);
      
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera if available
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          // Show preview
          const reader = new FileReader();
          reader.onload = (e) => {
            setCapturedPhotoPreview(e.target?.result as string);
          };
          reader.readAsDataURL(file);

          // Upload to Supabase Storage
          const fileName = `${user.id}/${Date.now()}_retailer_photo.jpg`;
          const { data, error } = await supabase.storage
            .from('retailer-photos')
            .upload(fileName, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (error) throw error;

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('retailer-photos')
            .getPublicUrl(fileName);

          // Update retailer data with photo URL
          handleInputChange('photo_url', urlData.publicUrl);
          
          toast({ 
            title: 'Photo Captured', 
            description: 'Retailer photo uploaded successfully!' 
          });
        } catch (error) {
          console.error('Photo upload error:', error);
          toast({ 
            title: 'Upload Failed', 
            description: 'Could not upload photo. Please try again.', 
            variant: 'destructive' 
          });
        } finally {
          setIsUploadingPhoto(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('Camera access error:', error);
      toast({ 
        title: 'Camera Error', 
        description: 'Could not access camera. Please check permissions.', 
        variant: 'destructive' 
      });
      setIsUploadingPhoto(false);
    }
  };

  // Compress image before scanning to speed up processing
  const compressImage = (dataUrl: string, maxWidth = 1024, maxHeight = 1024): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.8 quality
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = dataUrl;
    });
  };

  const handleScanBoard = async () => {
    if (!user) {
      toast({ title: 'Authentication Error', description: 'Please sign in to scan boards', variant: 'destructive' });
      return;
    }

    try {
      setIsScanningBoard(true);
      
      // Create file input for camera
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment'; // Use rear camera
      
      input.onchange = async (event) => {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) {
          setIsScanningBoard(false);
          return;
        }

        try {
          toast({ 
            title: 'Scanning...', 
            description: 'Reading board information',
            duration: 15000
          });

          // Convert image to base64
          const reader = new FileReader();
          reader.onload = async (e) => {
            const base64Image = e.target?.result as string;
            
            // Compress image before sending
            const compressedImage = await compressImage(base64Image);

            try {
              // Call edge function with compressed image
              const { data, error } = await supabase.functions.invoke('scan-board', {
                body: { imageBase64: compressedImage }
              });

              if (error) {
                console.error('Scan error:', error);
                setIsScanningBoard(false);
                return;
              }

              if (data?.error) {
                console.error('Scan data error:', data.error);
                setIsScanningBoard(false);
                return;
              }

              // Auto-fill form fields with extracted data
              let fieldsFound = [];
              if (data?.name && data.name.trim()) {
                handleInputChange('name', data.name);
                fieldsFound.push('name');
              }
              if (data?.address && data.address.trim()) {
                handleInputChange('address', data.address);
                fieldsFound.push('address');
              }
              if (data?.phone && data.phone.trim()) {
                handleInputChange('phone', data.phone);
                fieldsFound.push('phone');
              }

              if (fieldsFound.length > 0) {
                toast({ 
                  title: 'Success!', 
                  description: `Found ${fieldsFound.join(', ')} from the board`,
                  duration: 3000
                });
              } else {
                toast({ 
                  title: 'Scan Complete', 
                  description: 'No clear information found. Please enter details manually.',
                  duration: 3000
                });
              }
            } catch (scanError: any) {
              console.error('Scan error:', scanError);
            } finally {
              setIsScanningBoard(false);
            }
          };
          
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('File read error:', error);
          toast({ 
            title: 'Error', 
            description: 'Could not read image file', 
            variant: 'destructive' 
          });
          setIsScanningBoard(false);
        }
      };

      input.click();
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: 'Camera Error', 
        description: 'Could not access camera. Please check permissions.', 
        variant: 'destructive' 
      });
      setIsScanningBoard(false);
    }
  };

  const loadExistingBeats = async () => {
    if (!user) return setExistingBeats([]);
    const { data, error } = await supabase
      .from('retailers')
      .select('beat_id')
      .eq('user_id', user.id);
    if (error) {
      setExistingBeats([]);
      return;
    }
    const set = new Set<string>();
    (data || []).forEach((r: any) => r.beat_id && set.add(r.beat_id));
    setExistingBeats(Array.from(set));
  };

  const { createRetailer } = useOfflineRetailers();
  const { isOnline } = useOfflineSync();

  const performInsert = async (beatId: string) => {
    if (!user) {
      toast({ title: 'Not signed in', description: 'Please sign in to continue', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    
    const payload: any = {
      user_id: user.id,
      name: retailerData.name,
      gst_number: retailerData.gstNumber || null,
      phone: retailerData.phone,
      address: retailerData.address,
      category: retailerData.category || null,
      beat_id: beatId,
      beat_name: beats.find(b => b.beat_id === beatId)?.beat_name || null,
      territory_id: selectedTerritoryId || null,
      status: 'active',
      notes: retailerData.notes || null,
      parent_type: retailerData.parentType || null,
      parent_name: retailerData.parentName || null,
      location_tag: retailerData.locationTag || null,
      retail_type: retailerData.retailType || null,
      potential: retailerData.potential ? retailerData.potential.toLowerCase() : null,
      competitors: [retailerData.competitor1, retailerData.competitor2, retailerData.competitor3].filter(Boolean),
      photo_url: retailerData.photo_url || null,
      latitude: retailerData.latitude ? parseFloat(retailerData.latitude) : null,
      longitude: retailerData.longitude ? parseFloat(retailerData.longitude) : null,
      manual_credit_score: retailerData.manual_credit_score ? parseFloat(retailerData.manual_credit_score) : null,
    };

    const result = await createRetailer(payload);
    setIsSaving(false);

    if (result.success) {
      const message = result.offline 
        ? `${retailerData.name} saved offline. Will sync when online.`
        : `${retailerData.name} saved successfully.`;
      
      toast({ 
        title: result.offline ? 'Retailer Saved Offline' : 'Retailer Added', 
        description: message,
        action: result.offline ? <WifiOff className="h-4 w-4" /> : undefined
      });
      
      // Navigate back to the return path
      navigate(returnTo, { replace: true });
    } else {
      toast({ 
        title: 'Failed to save', 
        description: 'Could not save retailer', 
        variant: 'destructive' 
      });
    }
  };

  const handleSaveWithBeat = async () => {
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({ title: 'Missing Information', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    await loadExistingBeats();
    setExistingBeat(undefined);
    setNewBeat("");
    setBeatDialogOpen(true);
  };

  const confirmAssignBeat = async () => {
    const chosenBeat = (existingBeat && existingBeat !== '__new__') ? existingBeat : newBeat.trim();
    if (!chosenBeat) {
      toast({ title: 'Choose a beat', description: 'Pick an existing beat or enter a new name.' });
      return;
    }
    await performInsert(chosenBeat);
    setBeatDialogOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!retailerData.name || !retailerData.phone || !retailerData.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    // Save with selected beat or default to unassigned
    await performInsert(selectedBeat || 'unassigned');
  };

  return (
    <Layout>
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 space-y-4">
        {/* Header */}
        <Card className="shadow-card bg-gradient-primary text-primary-foreground">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-xl font-bold">{t('retailer.addRetailer')}</CardTitle>
                <p className="text-primary-foreground/80">{t('retailer.subtitle')}</p>
              </div>
            </div>
            <Plus size={24} />
          </CardHeader>
        </Card>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('retailer.information')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Scan Board Section */}
              <div className="space-y-2 p-3 bg-muted/30 rounded-lg border border-dashed">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">{t('retailer.quickScan')}</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('retailer.quickScanDesc')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    onClick={handleScanBoard}
                    disabled={isScanningBoard}
                    className="flex items-center gap-2"
                  >
                    <ScanLine size={16} />
                    {isScanningBoard ? t('retailer.scanning') : t('retailer.scanBoard')}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">{t('retailer.retailerName')} *</Label>
                <Input
                  id="name"
                  placeholder={t('retailer.enterRetailerName')}
                  value={retailerData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gstNumber">{t('retailer.gstNumber')}</Label>
                <Input
                  id="gstNumber"
                  placeholder={t('retailer.enterGstNumber')}
                  value={retailerData.gstNumber}
                  onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                  className="bg-background"
                />
              </div>

              {/* Photo Attachment Section */}
              <div className="space-y-2">
                <Label>{t('retailer.retailerPhoto')}</Label>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePhotoCapture}
                    disabled={isUploadingPhoto}
                    className="flex items-center gap-2"
                  >
                    <Camera size={16} />
                    {isUploadingPhoto ? t('retailer.uploading') : t('retailer.takePhoto')}
                  </Button>
                  
                  {(capturedPhotoPreview || retailerData.photo_url) && (
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-12 border rounded-lg overflow-hidden bg-muted">
                        <img
                          src={capturedPhotoPreview || retailerData.photo_url}
                          alt="Retailer photo"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">{t('retailer.photoCaptured')}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{t('retailer.photoDesc')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t('retailer.phone')} *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={t('retailer.enterPhone')}
                  value={retailerData.phone}
                  onChange={(e) => handleInputChange("phone", e.target.value)}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">{t('retailer.address')} *</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="address"
                    placeholder="Enter complete address"
                    value={retailerData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    className="bg-background min-h-[80px] flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="icon"
                    onClick={async () => {
                      if (!navigator.geolocation) {
                        toast({ 
                          title: "GPS Not Available", 
                          description: "Your device doesn't support location services", 
                          variant: "destructive" 
                        });
                        return;
                      }
                      
                      // Check if location permission is granted
                      try {
                        const permissionStatus = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
                        
                        if (permissionStatus.state === 'denied') {
                          toast({ 
                            title: "Location Permission Denied", 
                            description: "Please enable location access in your device settings",
                            variant: "destructive",
                            duration: 5000
                          });
                          return;
                        }
                      } catch (e) {
                        console.log('Permission API not supported, will try direct geolocation');
                      }
                      
                      const loadingToast = toast({ 
                        title: "Getting Location...", 
                        description: "Please wait...",
                        duration: 5000
                      });
                      
                      try {
                        // Multi-strategy GPS capture for maximum speed and reliability
                        let position: GeolocationPosition | null = null;
                        
                        // Strategy 1: Try cached location first (fastest - 1 second)
                        try {
                          position = await new Promise<GeolocationPosition>((resolve, reject) => {
                            navigator.geolocation.getCurrentPosition(
                              resolve,
                              reject,
                              { 
                                enableHighAccuracy: false,
                                timeout: 1000, // Very short timeout for cached location
                                maximumAge: 300000 // Accept location cached within last 5 minutes
                              }
                            );
                          });
                        } catch (cacheError) {
                          console.log('Cached location not available, trying network location...');
                          
                          // Strategy 2: Try network-based location (fast - 3 seconds)
                          try {
                            position = await new Promise<GeolocationPosition>((resolve, reject) => {
                              navigator.geolocation.getCurrentPosition(
                                resolve,
                                reject,
                                { 
                                  enableHighAccuracy: false,
                                  timeout: 3000, // Short timeout for network location
                                  maximumAge: 0 // Force fresh location
                                }
                              );
                            });
                          } catch (networkError) {
                            console.log('Network location failed, trying high accuracy GPS...');
                            
                            // Strategy 3: Fall back to high accuracy GPS (slower but most accurate - 6 seconds)
                            position = await new Promise<GeolocationPosition>((resolve, reject) => {
                              navigator.geolocation.getCurrentPosition(
                                resolve,
                                reject,
                                { 
                                  enableHighAccuracy: true,
                                  timeout: 6000, // Longer timeout for GPS
                                  maximumAge: 0
                                }
                              );
                            });
                          }
                        }
                        
                        if (!position) {
                          throw new Error('Failed to get location');
                        }
                        
                        // Get precise coordinates with 7 decimal places (~1 cm accuracy)
                        const lat = Number(position.coords.latitude.toFixed(7));
                        const lon = Number(position.coords.longitude.toFixed(7));
                        const accuracy = position.coords.accuracy;
                        
                        // Update coordinates immediately
                        handleInputChange("latitude", lat.toString());
                        handleInputChange("longitude", lon.toString());
                        
                        loadingToast.dismiss?.();
                        
                        if (accuracy > 100) {
                          toast({ 
                            title: "Location Captured", 
                            description: `GPS locked (accuracy: ${accuracy.toFixed(0)}m). Fetching address...`,
                            duration: 3000
                          });
                        } else {
                          toast({ 
                            title: "GPS Location Locked", 
                            description: `High accuracy: ${accuracy.toFixed(0)}m. Fetching address...`,
                            duration: 2000
                          });
                        }
                        
                        // Use Google Maps Geocoding with timeout
                        try {
                          const googleApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

                          // Helper to compute distance in meters
                          const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
                            const toRad = (v: number) => (v * Math.PI) / 180;
                            const R = 6371000; // meters
                            const dLat = toRad(lat2 - lat1);
                            const dLon = toRad(lon2 - lon1);
                            const a =
                              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
                                Math.sin(dLon / 2) * Math.sin(dLon / 2);
                            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                            return R * c;
                          };

                          if (googleApiKey && googleApiKey !== 'your_google_maps_api_key_here') {
                            // Add timeout for API calls
                            const fetchWithTimeout = (url: string, timeout = 8000) => {
                              return Promise.race([
                                fetch(url),
                                new Promise<Response>((_, reject) => 
                                  setTimeout(() => reject(new Error('API timeout')), timeout)
                                )
                              ]);
                            };

                            // 1) Reverse geocode prioritizing POIs/premise/street address
                            const geocodeUrl =
                              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lon}` +
                              `&language=en&key=${googleApiKey}` +
                              `&result_type=street_address|premise|point_of_interest|establishment|shopping_mall` +
                              `&location_type=ROOFTOP|GEOMETRIC_CENTER`;

                            // 2) Nearby places ordered by distance
                            const nearbyUrl =
                              `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lon}` +
                              `&rankby=distance&type=establishment&key=${googleApiKey}`;

                            const [geoRes, nearbyRes] = await Promise.allSettled([
                              fetchWithTimeout(geocodeUrl),
                              fetchWithTimeout(nearbyUrl)
                            ]);

                            let bestGeocode: any | null = null;
                            if (geoRes.status === 'fulfilled' && geoRes.value.ok) {
                              const geoData = await geoRes.value.json();
                              if (geoData.status === 'OK' && Array.isArray(geoData.results)) {
                                const priority = [
                                  'shopping_mall',
                                  'premise',
                                  'establishment',
                                  'point_of_interest',
                                  'street_address',
                                  'route'
                                ];
                                const score = (types: string[] = []) => {
                                  for (let i = 0; i < priority.length; i++) {
                                    if (types.includes(priority[i])) return i;
                                  }
                                  return 999;
                                };
                                bestGeocode = geoData.results
                                  .slice()
                                  .sort((a: any, b: any) => score(a.types) - score(b.types))[0] || null;
                              }
                            }

                            let bestPlace: any | null = null;
                            if (nearbyRes.status === 'fulfilled' && nearbyRes.value.ok) {
                              const nearbyData = await nearbyRes.value.json();
                              if ((nearbyData.status === 'OK' || nearbyData.status === 'ZERO_RESULTS') && Array.isArray(nearbyData.results)) {
                                const desiredPlaceTypes = new Set([
                                  'shopping_mall',
                                  'supermarket',
                                  'department_store',
                                  'grocery_or_supermarket',
                                  'store',
                                  'point_of_interest',
                                  'establishment'
                                ]);
                                // Prefer closest place matching desired types and within ~300m
                                for (const p of nearbyData.results) {
                                  if (!Array.isArray(p.types)) continue;
                                  const hasDesired = p.types.some((t: string) => desiredPlaceTypes.has(t));
                                  if (!hasDesired) continue;
                                  const plat = p.geometry?.location?.lat;
                                  const plon = p.geometry?.location?.lng;
                                  if (typeof plat === 'number' && typeof plon === 'number') {
                                    const d = haversine(lat, lon, plat, plon);
                                    if (d <= 350) { // within 350m of user
                                      bestPlace = p;
                                      break; // first match is the closest due to rankby=distance
                                    }
                                  }
                                }
                                // If nothing within 350m, still take the very first result as the nearest POI fallback
                                if (!bestPlace && nearbyData.results[0]) bestPlace = nearbyData.results[0];
                              }
                            }

                            // If we have a close POI (e.g., Bharath Mall), use its official name and address
                            if (bestPlace?.place_id) {
                              try {
                                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${bestPlace.place_id}&fields=name,formatted_address,geometry,types&key=${googleApiKey}`;
                                const detRes = await fetch(detailsUrl);
                                if (detRes.ok) {
                                  const detData = await detRes.json();
                                  if (detData.status === 'OK' && detData.result) {
                                    const name = detData.result.name;
                                    const addr = detData.result.formatted_address || bestGeocode?.formatted_address || bestPlace.vicinity;
                                    const finalAddr = name && addr && !addr.startsWith(name) ? `${name}, ${addr}` : (addr || name);
                                    if (finalAddr) {
                                      handleInputChange('address', finalAddr);
                                      toast({ title: 'Address Found', description: `📍 ${name || 'Nearby place'} selected`, duration: 2500 });
                                      return;
                                    }
                                  }
                                }
                              } catch {}
                              // Fallback to place vicinity/name if details failed
                              const fallbackAddr = (bestPlace.name ? `${bestPlace.name}, ` : '') + (bestPlace.vicinity || bestGeocode?.formatted_address || `${lat}, ${lon}`);
                              handleInputChange('address', fallbackAddr);
                              toast({ title: 'Address Found', description: 'Nearest place selected', duration: 2500 });
                              return;
                            }

                            // Otherwise, use the best geocode result (more precise than generic area)
                            if (bestGeocode?.formatted_address) {
                              handleInputChange('address', bestGeocode.formatted_address);
                              toast({ title: 'Address Found', description: 'Location fetched from Google Maps', duration: 2000 });
                              return;
                            }
                          }

                          // Fallback to OpenStreetMap Nominatim with timeout
                          const geocodeTimeout = new Promise((_, reject) => {
                            setTimeout(() => reject(new Error('Geocoding timeout')), 3000);
                          });
                          
                          const geocodePromise = fetch(
                            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
                            { headers: { 'User-Agent': 'FieldSalesNavigator/1.0' } }
                          );
                          
                          const response = await Promise.race([geocodePromise, geocodeTimeout]) as Response;
                          if (!response.ok) throw new Error('Geocoding service unavailable');
                          const data = await response.json();
                          const address = data.address || {};
                          const parts = [] as string[];
                          if (address.house_number) parts.push(address.house_number);
                          if (address.road || address.street) parts.push(address.road || address.street);
                          if (address.neighbourhood || address.suburb) parts.push(address.neighbourhood || address.suburb);
                          if (address.city || address.town || address.village) parts.push(address.city || address.town || address.village);
                          if (address.state_district) parts.push(address.state_district);
                          if (address.state) parts.push(address.state);
                          if (address.postcode) parts.push(address.postcode);
                          const formattedAddress = parts.length > 0 ? parts.join(', ') : data.display_name || `${lat}, ${lon}`;
                          handleInputChange('address', formattedAddress);
                          toast({ title: '✓ Address Found', description: 'Location fetched successfully', duration: 2000 });
                        } catch (geocodeError) {
                          console.error('Geocoding error:', geocodeError);
                          toast({ title: 'Address Not Found', description: 'Coordinates saved. Please enter address manually.', variant: 'default', duration: 3000 });
                        }
                        
                      } catch (error: any) {
                        loadingToast.dismiss?.();
                        console.error('GPS/Geocoding error:', error);
                        
                        // Provide specific error messages
                        if (error.code === 1) {
                          toast({ 
                            title: "Location Permission Denied", 
                            description: "Please enable location access: Settings → Privacy → Location",
                            variant: "destructive",
                            duration: 5000
                          });
                        } else if (error.code === 2) {
                          toast({ 
                            title: "GPS Signal Not Available", 
                            description: "Please move to an open area with clear sky view and try again",
                            variant: "destructive",
                            duration: 5000
                          });
                        } else if (error.code === 3 || error.message?.includes('timeout')) {
                          toast({ 
                            title: "GPS Timeout", 
                            description: "Location request took too long. Please ensure GPS is enabled and try again",
                            variant: "destructive",
                            duration: 5000
                          });
                        } else {
                          toast({ 
                            title: "Location Error", 
                            description: "Could not get location. Please check GPS settings and try again",
                            variant: "destructive",
                            duration: 5000
                          });
                        }
                      }
                    }}
                    className="mt-auto"
                  >
                    <MapPin size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t('retailer.gpsButton')}</p>
                
                {/* Latitude and Longitude Display */}
                {(retailerData.latitude || retailerData.longitude) && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2 hidden">
                        <Label>Latitude</Label>
                        <Input
                          value={retailerData.latitude}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                          placeholder="GPS Latitude"
                        />
                      </div>
                      <div className="space-y-2 hidden">
                        <Label>Longitude</Label>
                        <Input
                          value={retailerData.longitude}
                          readOnly
                          className="bg-muted cursor-not-allowed"
                          placeholder="GPS Longitude"
                        />
                      </div>
                    </div>
                    
                    {/* Google Maps Style Coordinate Display */}
                    {retailerData.latitude && retailerData.longitude && (
                      <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center justify-between">
                          <div>
                            <Label className="text-sm font-medium">GPS Coordinates</Label>
                            <button
                              type="button"
                              onClick={() => {
                                const googleMapsUrl = `https://www.google.com/maps?q=${retailerData.latitude},${retailerData.longitude}`;
                                window.open(googleMapsUrl, '_blank');
                                toast({ title: "Opening Google Maps", description: "Redirecting to Google Maps..." });
                              }}
                              className="text-primary hover:text-primary/80 transition-colors text-sm font-mono mt-1 block"
                              title="Click to open in Google Maps"
                            >
                              {retailerData.latitude}, {retailerData.longitude}
                            </button>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const googleMapsUrl = `https://www.google.com/maps?q=${retailerData.latitude},${retailerData.longitude}`;
                              window.open(googleMapsUrl, '_blank');
                              toast({ title: "Opening Google Maps", description: "Redirecting to Google Maps..." });
                            }}
                            className="text-xs"
                          >
                            <MapPin size={14} className="mr-1" />
                            Open in Maps
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Click coordinates or button to view location in Google Maps
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationTag">{t('retailer.locationTag')} *</Label>
                <div className="flex gap-2">
                  <Input
                    id="locationTag"
                    placeholder="e.g., Near City Hospital, Main Market"
                    value={retailerData.locationTag}
                    onChange={(e) => handleInputChange("locationTag", e.target.value)}
                    className="bg-background"
                  />
                  <Button type="button" variant="outline" size="icon">
                    <Tag size={16} />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">This will be used to verify visit authenticity</p>
              </div>

              {/* Manual Credit Score - Only show when credit management is enabled and mode is manual */}
              {creditConfig?.is_enabled && creditConfig?.scoring_mode === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="manual_credit_score">Credit Score (Manual)</Label>
                  <Input
                    id="manual_credit_score"
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    placeholder="Enter credit score (0-10)"
                    value={retailerData.manual_credit_score}
                    onChange={(e) => handleInputChange("manual_credit_score", e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">Manual credit score out of 10</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Parent Type</Label>
                  <Select value={retailerData.parentType} onValueChange={(value) => handleInputChange("parentType", value)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select parent" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border z-50">
                      {parentTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Select Distributor</Label>
                  {retailerData.parentType === "Distributor" ? (
                    <Select 
                      value={retailerData.selectedDistributors[0] || ""} 
                      onValueChange={(value) => {
                        const distributor = distributors.find(d => d.id === value);
                        handleInputChange("selectedDistributors", [value]);
                        handleInputChange("parentName", distributor?.name || "");
                      }}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Select distributor" />
                      </SelectTrigger>
                      <SelectContent className="bg-background border z-50">
                        {distributors.length > 0 ? (
                          distributors.map((distributor) => (
                            <SelectItem key={distributor.id} value={distributor.id}>
                              {distributor.name}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>No distributors available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Enter parent name"
                      value={retailerData.parentName}
                      onChange={(e) => handleInputChange("parentName", e.target.value)}
                      className="bg-background"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Retail Type</Label>
                <Select 
                  value={retailerData.retailType === "Other" ? "Other" : retailerData.retailType} 
                  onValueChange={(value) => {
                    handleInputChange("retailType", value);
                    if (value !== "Other") {
                      setCustomRetailType("");
                    }
                  }}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {retailTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {retailerData.retailType === "Other" && (
                  <Input
                    placeholder="Enter custom retail type"
                    value={customRetailType}
                    onChange={(e) => {
                      setCustomRetailType(e.target.value);
                      handleInputChange("retailType", e.target.value);
                    }}
                    className="bg-background mt-2"
                  />
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="beat">Assign to Beat *</Label>
                  <Badge variant={connectivityStatus === 'offline' ? 'destructive' : 'default'} className="text-xs">
                    {connectivityStatus === 'offline' ? '📴 Offline' : connectivityStatus === 'unknown' ? '❓ Unknown' : '🌐 Online'} • {beats.length} beats
                  </Badge>
                </div>
                <Select value={selectedBeat} onValueChange={(value) => setSelectedBeat(value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a beat" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {beats.length > 0 ? (
                      beats.map((beat) => (
                        <SelectItem key={beat.beat_id} value={beat.beat_id}>
                          {beat.beat_name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No beats available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Select which beat this retailer belongs to</p>
              </div>

              {/* Assign Territory */}
              <div className="space-y-2">
                <Label>Assign to Territory</Label>
                <Popover open={territoryComboOpen} onOpenChange={setTerritoryComboOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={territoryComboOpen}
                      className="w-full justify-between bg-background"
                    >
                      {selectedTerritoryId
                        ? territories.find((t) => t.id === selectedTerritoryId)?.name
                        : "Select territory..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput placeholder="Search territory..." />
                      <CommandList>
                        <CommandEmpty>No territory found.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            onSelect={() => {
                              setSelectedTerritoryId(null);
                              setTerritoryComboOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !selectedTerritoryId ? "opacity-100" : "opacity-0"
                              )}
                            />
                            None
                          </CommandItem>
                          {territories.map((territory) => (
                            <CommandItem
                              key={territory.id}
                              onSelect={() => {
                                setSelectedTerritoryId(territory.id);
                                setTerritoryComboOpen(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedTerritoryId === territory.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{territory.name}</span>
                                <span className="text-xs text-muted-foreground">{territory.region}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground">Optionally assign this retailer to a sales territory</p>
              </div>

              <div className="space-y-2 hidden">
                <Label>Top 3 Competitors</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Competitor 1"
                    value={retailerData.competitor1}
                    onChange={(e) => handleInputChange("competitor1", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 2"
                    value={retailerData.competitor2}
                    onChange={(e) => handleInputChange("competitor2", e.target.value)}
                    className="bg-background"
                  />
                  <Input
                    placeholder="Competitor 3"
                    value={retailerData.competitor3}
                    onChange={(e) => handleInputChange("competitor3", e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options Collapsible */}
          <Collapsible open={advancedOptionsOpen} onOpenChange={setAdvancedOptionsOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                <span className="font-medium">Advanced Options</span>
                <ChevronDown className={`h-4 w-4 transition-transform ${advancedOptionsOpen ? 'rotate-180' : ''}`} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg bg-muted/20">
              {/* Category */}
              <div className="space-y-2">
                <Label>{t('retailer.category')}</Label>
                <Select value={retailerData.category} onValueChange={(value) => handleInputChange("category", value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('retailer.selectCategory')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Potential */}
              <div className="space-y-2">
                <Label>Potential</Label>
                <Select value={retailerData.potential} onValueChange={(value) => handleInputChange("potential", value)}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select potential" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {potentials.map((potential) => (
                      <SelectItem key={potential} value={potential}>{potential}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              {/* Quick Info */}
              <div className="p-3 bg-muted/30 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm">Quick Info</h4>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Store size={12} />
                    <span>Retailer will be added to today's visit plan</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={12} />
                    <span>Location will be verified before visit</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone size={12} />
                    <span>Contact details will be saved for future visits</span>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Actions */}
          <div className="flex gap-2">
            <Button type="submit" className="flex-1" size="lg" disabled={isSaving}>
              <Plus size={16} className="mr-2" />
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
            <Button type="button" variant="outline" className="flex-1" size="lg" onClick={handleSaveWithBeat} disabled={isSaving}>
              <Tag size={16} className="mr-2" />
              Add to the Beat
            </Button>
          </div>
        </form>
        <Dialog open={beatDialogOpen} onOpenChange={setBeatDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Beat</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Choose existing beat</Label>
                <Select value={existingBeat} onValueChange={setExistingBeat}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a beat" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border z-50">
                    {existingBeats.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                    <SelectItem value="__new__">Create new…</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(existingBeat === "__new__" || (!existingBeat && newBeat)) && (
                <div className="space-y-2">
                  <Label>New beat name</Label>
                  <Input placeholder="Enter beat name" value={newBeat} onChange={(e) => setNewBeat(e.target.value)} className="bg-background" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="secondary" onClick={() => setBeatDialogOpen(false)}>Cancel</Button>
              <Button onClick={confirmAssignBeat} disabled={isSaving}>Assign & Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
    </Layout>
  );
};