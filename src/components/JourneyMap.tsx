import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { EnhancedRetailerLocation, RetailerStatus } from './gps/RetailerListModal';

interface Position {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: Date;
}

interface JourneyMapProps {
  positions: Position[];
  retailers?: EnhancedRetailerLocation[];
  height?: string;
  totalGpsDistance?: number; // Actual distance traveled from GPS tracking
}

// Fix for default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Marker color URLs
const markerColors: Record<RetailerStatus, string> = {
  planned: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  productive: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  unproductive: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  pending: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
};

// Calculate distance between two points using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Nearest-neighbor algorithm for route optimization
const optimizeRoute = (retailers: EnhancedRetailerLocation[], startLat?: number, startLon?: number): EnhancedRetailerLocation[] => {
  if (retailers.length <= 1) return retailers;
  
  const unvisited = [...retailers];
  const optimized: EnhancedRetailerLocation[] = [];
  
  // Start from the first retailer or a provided start point
  let currentLat = startLat ?? unvisited[0].latitude;
  let currentLon = startLon ?? unvisited[0].longitude;
  
  while (unvisited.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    
    for (let i = 0; i < unvisited.length; i++) {
      const dist = calculateDistance(currentLat, currentLon, unvisited[i].latitude, unvisited[i].longitude);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    }
    
    const nearest = unvisited.splice(nearestIdx, 1)[0];
    optimized.push({ ...nearest, sequenceNumber: optimized.length + 1 });
    currentLat = nearest.latitude;
    currentLon = nearest.longitude;
  }
  
  return optimized;
};

export const JourneyMap: React.FC<JourneyMapProps> = ({ 
  positions, 
  retailers = [], 
  height = '500px',
  totalGpsDistance
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const [optimizedRetailers, setOptimizedRetailers] = useState<EnhancedRetailerLocation[]>([]);
  const [totalRouteDistance, setTotalRouteDistance] = useState<number>(0);

  // Optimize route when retailers change
  useEffect(() => {
    if (retailers.length > 0) {
      // Get pending retailers for route optimization
      const pendingAndPlanned = retailers.filter(r => r.status === 'pending' || r.status === 'planned');
      const completedRetailers = retailers.filter(r => r.status === 'productive' || r.status === 'unproductive');
      
      // Optimize route for pending/planned retailers
      const startPoint = positions.length > 0 
        ? { lat: positions[positions.length - 1].latitude, lon: positions[positions.length - 1].longitude }
        : undefined;
      
      const optimizedPending = optimizeRoute(pendingAndPlanned, startPoint?.lat, startPoint?.lon);
      
      // Combine: completed first (in check-in order), then optimized pending
      const sortedCompleted = [...completedRetailers].sort((a, b) => {
        if (!a.checkInTime) return 1;
        if (!b.checkInTime) return -1;
        return new Date(a.checkInTime).getTime() - new Date(b.checkInTime).getTime();
      }).map((r, idx) => ({ ...r, sequenceNumber: idx + 1 }));
      
      const allOptimized = [
        ...sortedCompleted,
        ...optimizedPending.map((r, idx) => ({ ...r, sequenceNumber: sortedCompleted.length + idx + 1 }))
      ];
      
      setOptimizedRetailers(allOptimized);
      
      // Calculate total route distance
      let distance = 0;
      for (let i = 0; i < allOptimized.length - 1; i++) {
        distance += calculateDistance(
          allOptimized[i].latitude,
          allOptimized[i].longitude,
          allOptimized[i + 1].latitude,
          allOptimized[i + 1].longitude
        );
      }
      setTotalRouteDistance(distance);
    } else {
      setOptimizedRetailers([]);
      setTotalRouteDistance(0);
    }
  }, [retailers, positions]);

  // Create status-based marker icon
  const createRetailerIcon = (status: RetailerStatus) => {
    return L.icon({
      iconUrl: markerColors[status],
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };
  // Initialize map only once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    
    const initialCenter: [number, number] = [20.5937, 78.9629]; // Default to India center
    
    mapRef.current = L.map(containerRef.current, {
      center: initialCenter,
      zoom: 13,
      // Disable animations to prevent _leaflet_pos errors during cleanup
      zoomAnimation: true,
      fadeAnimation: true,
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        // Stop any ongoing animations before removing
        mapRef.current.stop();
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update map layers when data changes
  useEffect(() => {
    if (!mapRef.current) return;
    if (positions.length === 0 && optimizedRetailers.length === 0) return;

    // Clear existing layers except tile layer
    mapRef.current.eachLayer((layer) => {
      if (!(layer instanceof L.TileLayer)) {
        mapRef.current?.removeLayer(layer);
      }
    });
    
    // Clear markers reference
    markersRef.current.clear();

    // Status labels and colors for popup
    const statusLabels: Record<RetailerStatus, { label: string; color: string }> = {
      planned: { label: 'Planned', color: '#3b82f6' },
      productive: { label: 'Productive', color: '#22c55e' },
      unproductive: { label: 'Unproductive', color: '#ef4444' },
      pending: { label: 'Pending', color: '#f97316' },
    };

    // Add retailer markers and route
    if (optimizedRetailers.length > 0) {
      // Draw optimized route connecting all retailers
      const routeCoordinates: L.LatLngExpression[] = optimizedRetailers.map((retailer) => [
        retailer.latitude,
        retailer.longitude,
      ]);

      L.polyline(routeCoordinates, {
        color: '#8b5cf6',
        weight: 4,
        opacity: 0.8,
        dashArray: '10, 10'
      }).addTo(mapRef.current);

      // Add retailer markers with sequence numbers
      optimizedRetailers.forEach((retailer) => {
        const icon = createRetailerIcon(retailer.status);
        const statusInfo = statusLabels[retailer.status];
        
        const marker = L.marker([retailer.latitude, retailer.longitude], { icon })
          .addTo(mapRef.current!)
          .bindPopup(`
            <div style="min-width: 200px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                <span style="background: ${statusInfo.color}; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px;">
                  ${retailer.sequenceNumber || ''}
                </span>
                <strong style="color: ${statusInfo.color}; font-size: 16px;">
                  ${retailer.name}
                </strong>
              </div>
              <div style="color: #666;">
                <div><strong>Address:</strong> ${retailer.address || 'N/A'}</div>
                <div><strong>Status:</strong> <span style="color: ${statusInfo.color}">${statusInfo.label}</span></div>
                ${retailer.checkInTime ? `<div><strong>Check-in:</strong> ${new Date(retailer.checkInTime).toLocaleTimeString()}</div>` : ''}
                ${retailer.hasOrder ? '<div style="color: #22c55e; font-weight: bold;">✓ Order Placed</div>' : ''}
              </div>
            </div>
          `);
        
        markersRef.current.set(retailer.id, marker);
      });

      // Add distance label - prefer GPS distance if available
      const distanceToShow = totalGpsDistance !== undefined && totalGpsDistance > 0 
        ? totalGpsDistance 
        : totalRouteDistance;
      const distanceLabel = totalGpsDistance !== undefined && totalGpsDistance > 0 
        ? 'Traveled' 
        : 'Route';
      
      if (distanceToShow > 0) {
        const midIdx = Math.floor(optimizedRetailers.length / 2);
        const midPoint = optimizedRetailers[midIdx];
        L.marker([midPoint.latitude, midPoint.longitude], {
          icon: L.divIcon({
            className: 'route-distance-label',
            html: `<div style="background: #8b5cf6; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">
              ${distanceLabel}: ${distanceToShow.toFixed(1)} km
            </div>`,
            iconSize: [100, 24],
            iconAnchor: [50, 12],
          })
        }).addTo(mapRef.current);
      }
    }

    // Add GPS tracking path (if available)
    if (positions.length > 0) {
      const pathCoordinates: L.LatLngExpression[] = positions.map((pos) => [
        pos.latitude,
        pos.longitude,
      ]);

      L.polyline(pathCoordinates, {
        color: '#3b82f6',
        weight: 2,
        opacity: 0.5,
      }).addTo(mapRef.current);

      // Create small blue icon for waypoints
      const blueIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [15, 25],
        iconAnchor: [7, 25],
        popupAnchor: [1, -20],
        shadowSize: [25, 25]
      });

      // Add start marker (green/default)
      L.marker([positions[0].latitude, positions[0].longitude], {
        icon: L.icon({
          iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          iconSize: [20, 33],
          iconAnchor: [10, 33],
          popupAnchor: [1, -28],
          shadowSize: [33, 33]
        })
      })
        .addTo(mapRef.current)
        .bindPopup(`<strong>GPS Start</strong><br/>${positions[0].timestamp.toLocaleTimeString()}`);

      // Add waypoint markers along the route (sample every 10-20 points to avoid clutter)
      const waypointInterval = Math.max(1, Math.floor(positions.length / 10));
      positions.forEach((pos, index) => {
        if (index > 0 && index < positions.length - 1 && index % waypointInterval === 0) {
          L.marker([pos.latitude, pos.longitude], { icon: blueIcon })
            .addTo(mapRef.current!)
            .bindPopup(`<strong>GPS Point</strong><br/>${pos.timestamp.toLocaleTimeString()}`);
        }
      });
    }

    // Fit bounds to show all markers
    const allCoordinates: L.LatLngExpression[] = [];
    
    if (optimizedRetailers.length > 0) {
      optimizedRetailers.forEach(r => allCoordinates.push([r.latitude, r.longitude]));
    }
    
    if (positions.length > 0) {
      positions.forEach(p => allCoordinates.push([p.latitude, p.longitude]));
    }
    
    if (allCoordinates.length > 0) {
      const bounds = L.latLngBounds(allCoordinates as L.LatLngTuple[]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], animate: false });
    }
  }, [positions, optimizedRetailers, totalRouteDistance]);

  if (positions.length === 0 && retailers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-muted rounded-lg" style={{ height }}>
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No retailers scheduled for this day</p>
          <p className="text-sm text-muted-foreground">Add retailers to your day plan to see the route map</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 px-2 py-1.5 bg-muted/50 rounded-lg text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Planned</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Productive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Unproductive</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Pending</span>
        </div>
        {(totalGpsDistance !== undefined && totalGpsDistance > 0) ? (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-purple-600 font-medium">Traveled: {totalGpsDistance.toFixed(1)} km</span>
          </div>
        ) : totalRouteDistance > 0 ? (
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-purple-600 font-medium">Route: {totalRouteDistance.toFixed(1)} km</span>
          </div>
        ) : null}
      </div>
      
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className="rounded-lg"
      />
    </div>
  );
};
