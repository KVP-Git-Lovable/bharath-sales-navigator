import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const retailersWithCoords = retailers.filter(r => r.latitude && r.longitude);

  const initializeMap = useCallback(() => {
    if (!mapRef.current || !window.google?.maps) return;

    try {
      // Create map
      const map = new google.maps.Map(mapRef.current, {
        center: DAKSHINA_KANNADA_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      // Clear existing markers
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];

      // Add markers for retailers with coordinates
      const bounds = new google.maps.LatLngBounds();
      let hasMarkers = false;

      retailersWithCoords.forEach((retailer) => {
        if (retailer.latitude && retailer.longitude) {
          const position = { lat: retailer.latitude, lng: retailer.longitude };
          
          const marker = new google.maps.Marker({
            position,
            map,
            title: retailer.name,
          });

          // Add info window
          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div style="padding: 8px; max-width: 200px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600; font-size: 14px;">${retailer.name}</h3>
                ${retailer.address ? `<p style="margin: 0; font-size: 12px; color: #666;">${retailer.address}</p>` : ''}
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          markersRef.current.push(marker);
          bounds.extend(position);
          hasMarkers = true;
        }
      });

      // Fit bounds if we have markers
      if (hasMarkers && retailersWithCoords.length > 1) {
        map.fitBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
      } else if (hasMarkers && retailersWithCoords.length === 1) {
        const center = bounds.getCenter() as unknown as { lat: () => number; lng: () => number };
        (map as unknown as { setCenter: (c: { lat: number; lng: number }) => void }).setCenter({ lat: center.lat(), lng: center.lng() });
        (map as unknown as { setZoom: (z: number) => void }).setZoom(14);
      }

      setIsLoading(false);
      setError(null);
    } catch (err) {
      console.error('Error initializing map:', err);
      setError('Failed to initialize map');
      setIsLoading(false);
    }
  }, [retailersWithCoords]);

  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError('Google Maps API key not configured');
      setIsLoading(false);
      return;
    }

    // Check if Google Maps is already loaded
    if (window.google?.maps) {
      initializeMap();
      return;
    }

    // Load Google Maps script
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      existingScript.addEventListener('load', initializeMap);
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      initializeMap();
    };
    
    script.onerror = () => {
      setError('Failed to load Google Maps');
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      markersRef.current.forEach(marker => marker.setMap(null));
      markersRef.current = [];
    };
  }, [initializeMap]);

  // Update markers when retailers change
  useEffect(() => {
    if (mapInstanceRef.current && window.google?.maps) {
      initializeMap();
    }
  }, [retailers, initializeMap]);

  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/@${DAKSHINA_KANNADA_CENTER.lat},${DAKSHINA_KANNADA_CENTER.lng},${DEFAULT_ZOOM}z`;
    window.open(url, '_blank');
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
                {retailersWithCoords.length} retailers
              </span>
            )}
            <Button variant="outline" size="sm" onClick={openInGoogleMaps}>
              <ExternalLink className="h-3 w-3 mr-1" />
              Open
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div 
          className="rounded-lg overflow-hidden border bg-muted relative"
          style={{ height }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted z-10">
              <MapPin className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          )}
          <div ref={mapRef} className="w-full h-full" />
        </div>
      </CardContent>
    </Card>
  );
}
