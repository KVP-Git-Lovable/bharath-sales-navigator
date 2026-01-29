import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ExternalLink, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Retailer {
  id: string;
  name: string;
  latitude?: number | null;
  longitude?: number | null;
  address?: string;
}

interface DakshinaKannadaMapProps {
  retailers?: Retailer[];
  height?: string;
}

// Dakshina Kannada district center coordinates
const DAKSHINA_KANNADA_CENTER = { lat: 12.8698, lng: 74.8426 };
const DEFAULT_ZOOM = 10;

export function DakshinaKannadaMap({ retailers = [], height = "350px" }: DakshinaKannadaMapProps) {
  const [activeTab, setActiveTab] = useState<string>("embed");
  
  const retailersWithCoords = retailers.filter(r => r.latitude && r.longitude);
  
  // Generate Google Maps embed URL (works without API restrictions)
  const getEmbedUrl = () => {
    // Use the embed API which has a different quota and works more reliably
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const center = `${DAKSHINA_KANNADA_CENTER.lat},${DAKSHINA_KANNADA_CENTER.lng}`;
    
    if (apiKey) {
      return `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${center}&zoom=${DEFAULT_ZOOM}&maptype=roadmap`;
    }
    
    // Fallback: Use OpenStreetMap embed
    return `https://www.openstreetmap.org/export/embed.html?bbox=${DAKSHINA_KANNADA_CENTER.lng - 0.5}%2C${DAKSHINA_KANNADA_CENTER.lat - 0.3}%2C${DAKSHINA_KANNADA_CENTER.lng + 0.5}%2C${DAKSHINA_KANNADA_CENTER.lat + 0.3}&layer=mapnik&marker=${DAKSHINA_KANNADA_CENTER.lat}%2C${DAKSHINA_KANNADA_CENTER.lng}`;
  };

  // Open in Google Maps (external link)
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/@${DAKSHINA_KANNADA_CENTER.lat},${DAKSHINA_KANNADA_CENTER.lng},${DEFAULT_ZOOM}z`;
    window.open(url, '_blank');
  };

  // Open with retailers
  const openRetailersInMaps = () => {
    if (retailersWithCoords.length > 0) {
      // Create a maps URL with multiple markers
      const first = retailersWithCoords[0];
      const url = `https://www.google.com/maps/search/?api=1&query=${first.latitude},${first.longitude}`;
      window.open(url, '_blank');
    } else {
      openInGoogleMaps();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Dakshina Kannada Map
          </CardTitle>
          <div className="flex items-center gap-2">
            {retailersWithCoords.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {retailersWithCoords.length} with GPS
              </span>
            )}
            <Button variant="outline" size="sm" onClick={openInGoogleMaps}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="embed" className="text-xs">
              <Map className="h-3 w-3 mr-1" />
              Map View
            </TabsTrigger>
            <TabsTrigger value="retailers" className="text-xs">
              <MapPin className="h-3 w-3 mr-1" />
              Retailers ({retailersWithCoords.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="embed" className="mt-3">
            <div 
              className="rounded-lg overflow-hidden border bg-muted"
              style={{ height }}
            >
              <iframe
                src={getEmbedUrl()}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Dakshina Kannada Map"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="retailers" className="mt-3">
            <div 
              className="rounded-lg border overflow-auto"
              style={{ height }}
            >
              {retailersWithCoords.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-4">
                  <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No retailers with GPS coordinates</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add latitude/longitude to retailers to see them on the map
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {retailersWithCoords.slice(0, 20).map((retailer) => (
                    <div 
                      key={retailer.id}
                      className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => {
                        const url = `https://www.google.com/maps/search/?api=1&query=${retailer.latitude},${retailer.longitude}`;
                        window.open(url, '_blank');
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{retailer.name}</p>
                          {retailer.address && (
                            <p className="text-xs text-muted-foreground truncate">{retailer.address}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                          <MapPin className="h-3 w-3" />
                          <span>{retailer.latitude?.toFixed(4)}, {retailer.longitude?.toFixed(4)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {retailersWithCoords.length > 20 && (
                    <div className="p-3 text-center">
                      <Button variant="link" size="sm" onClick={openRetailersInMaps}>
                        View all {retailersWithCoords.length} retailers in Google Maps
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
