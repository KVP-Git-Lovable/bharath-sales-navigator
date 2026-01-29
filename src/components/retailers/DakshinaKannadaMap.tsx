import { useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, ExternalLink } from "lucide-react";
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

export function DakshinaKannadaMap({ retailers = [], height = "400px" }: DakshinaKannadaMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initAttemptedRef = useRef(false);

  // Load Google Maps script
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    // Check if already loaded and working
    if (window.google?.maps?.Map) {
      setIsLoaded(true);
      return;
    }

    // Don't add script multiple times
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      const checkLoaded = setInterval(() => {
        if (window.google?.maps?.Map) {
          setIsLoaded(true);
          clearInterval(checkLoaded);
        }
      }, 100);
      
      // Timeout after 10 seconds
      setTimeout(() => {
        clearInterval(checkLoaded);
        if (!window.google?.maps?.Map) {
          setError("Google Maps failed to load. Please check API key configuration in Google Cloud Console.");
        }
      }, 10000);
      return;
    }

    // Add callback for when script loads
    const callbackName = `initGoogleMaps_${Date.now()}`;
    (window as any)[callbackName] = () => {
      setIsLoaded(true);
      delete (window as any)[callbackName];
    };

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    
    script.onerror = () => {
      setError("Failed to load Google Maps. Check your API key and ensure Maps JavaScript API is enabled.");
      delete (window as any)[callbackName];
    };
    
    document.head.appendChild(script);
  }, []);

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || initAttemptedRef.current) return;
    initAttemptedRef.current = true;

    try {
      if (!window.google?.maps?.Map) {
        setError("Google Maps not available. Please verify API key settings.");
        return;
      }

      mapInstanceRef.current = new google.maps.Map(mapRef.current, {
        center: DAKSHINA_KANNADA_CENTER,
        zoom: DEFAULT_ZOOM,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
      });

      // Add a marker for the district center
      new google.maps.Marker({
        position: DAKSHINA_KANNADA_CENTER,
        map: mapInstanceRef.current,
        title: "Dakshina Kannada",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 12,
          fillColor: "#3b82f6",
          fillOpacity: 0.3,
          strokeColor: "#3b82f6",
          strokeWeight: 2,
        }
      });
    } catch (err) {
      console.error("Error initializing map:", err);
      setError("Failed to initialize map");
    }
  }, [isLoaded]);

  // Add retailer markers
  useEffect(() => {
    if (!mapInstanceRef.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null));
    markersRef.current = [];

    // Add markers for retailers with coordinates
    const retailersWithCoords = retailers.filter(r => r.latitude && r.longitude);
    
    retailersWithCoords.forEach(retailer => {
      const marker = new google.maps.Marker({
        position: { lat: retailer.latitude!, lng: retailer.longitude! },
        map: mapInstanceRef.current,
        title: retailer.name,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#ef4444",
          fillOpacity: 0.9,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        }
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding: 8px; max-width: 200px;">
            <h3 style="font-weight: 600; margin-bottom: 4px;">${retailer.name}</h3>
            ${retailer.address ? `<p style="color: #666; font-size: 12px;">${retailer.address}</p>` : ''}
          </div>
        `
      });

      marker.addListener("click", () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds if we have retailer markers
    if (retailersWithCoords.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      retailersWithCoords.forEach(r => {
        bounds.extend({ lat: r.latitude!, lng: r.longitude! });
      });
      // Also include the district center
      bounds.extend(DAKSHINA_KANNADA_CENTER);
      mapInstanceRef.current.fitBounds(bounds, 50);
    }
  }, [retailers, isLoaded]);

  // Open in Google Maps (external link)
  const openInGoogleMaps = () => {
    const url = `https://www.google.com/maps/@${DAKSHINA_KANNADA_CENTER.lat},${DAKSHINA_KANNADA_CENTER.lng},${DEFAULT_ZOOM}z`;
    window.open(url, '_blank');
  };

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Dakshina Kannada Map
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="flex flex-col items-center justify-center bg-muted rounded-lg gap-3 p-6"
            style={{ height }}
          >
            <p className="text-muted-foreground text-sm text-center">{error}</p>
            <p className="text-xs text-muted-foreground text-center max-w-md">
              To fix this, ensure the Google Maps JavaScript API is enabled and billing is set up in your 
              <a href="https://console.cloud.google.com/apis/library/maps-backend.googleapis.com" target="_blank" rel="noopener" className="text-primary ml-1 underline">
                Google Cloud Console
              </a>
            </p>
            <Button variant="outline" size="sm" onClick={openInGoogleMaps}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Dakshina Kannada Map
          {retailers.filter(r => r.latitude && r.longitude).length > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-auto">
              {retailers.filter(r => r.latitude && r.longitude).length} retailers mapped
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          ref={mapRef}
          className="rounded-lg overflow-hidden border"
          style={{ height }}
        >
          {!isLoaded && (
            <div className="flex items-center justify-center h-full bg-muted">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
