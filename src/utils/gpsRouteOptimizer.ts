/**
 * GPS Route Optimizer Utility
 * Provides functions for calculating distances and optimizing delivery routes
 */

interface Coordinates {
  latitude: number | null;
  longitude: number | null;
}

interface DeliveryPoint {
  id: string;
  retailer_name: string;
  latitude?: number | null;
  longitude?: number | null;
  [key: string]: any;
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  point1: Coordinates,
  point2: Coordinates
): number {
  if (!point1.latitude || !point1.longitude || !point2.latitude || !point2.longitude) {
    return Infinity; // Return infinity if coordinates are missing
  }

  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(point2.latitude - point1.latitude);
  const dLon = toRad(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(point1.latitude)) * Math.cos(toRad(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return distance;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Format distance for display
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm === Infinity) return 'Unknown';
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

/**
 * Sort delivery points by distance from a reference point (nearest first)
 * Uses greedy nearest-neighbor algorithm
 */
export function optimizeRouteByDistance<T extends DeliveryPoint>(
  deliveries: T[],
  currentLocation: Coordinates
): T[] {
  if (!currentLocation.latitude || !currentLocation.longitude) {
    console.log('Current location not available, returning original order');
    return deliveries;
  }

  const deliveriesWithDistance = deliveries.map(delivery => ({
    ...delivery,
    distanceFromCurrent: calculateDistance(currentLocation, {
      latitude: delivery.latitude || null,
      longitude: delivery.longitude || null
    })
  }));

  // Greedy nearest-neighbor: start from current location, always pick nearest unvisited
  const optimized: T[] = [];
  const remaining = [...deliveriesWithDistance];
  let currentPos = currentLocation;

  while (remaining.length > 0) {
    // Find nearest point from current position
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    remaining.forEach((delivery, index) => {
      const dist = calculateDistance(currentPos, {
        latitude: delivery.latitude || null,
        longitude: delivery.longitude || null
      });
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearestIndex = index;
      }
    });

    const nearest = remaining.splice(nearestIndex, 1)[0];
    optimized.push(nearest);
    
    // Update current position for next iteration
    if (nearest.latitude && nearest.longitude) {
      currentPos = {
        latitude: nearest.latitude,
        longitude: nearest.longitude
      };
    }
  }

  return optimized;
}

/**
 * Get current GPS location
 */
export function getCurrentLocation(): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  });
}

/**
 * Calculate total route distance
 */
export function calculateTotalRouteDistance(
  deliveries: DeliveryPoint[],
  startLocation: Coordinates
): number {
  if (deliveries.length === 0) return 0;

  let totalDistance = 0;
  let currentPos = startLocation;

  for (const delivery of deliveries) {
    if (delivery.latitude && delivery.longitude) {
      totalDistance += calculateDistance(currentPos, {
        latitude: delivery.latitude,
        longitude: delivery.longitude
      });
      currentPos = {
        latitude: delivery.latitude,
        longitude: delivery.longitude
      };
    }
  }

  return totalDistance;
}

/**
 * Get estimated travel time based on average speed
 * Returns time in minutes
 */
export function getEstimatedTravelTime(distanceKm: number, avgSpeedKmh: number = 20): number {
  if (distanceKm === Infinity) return 0;
  return Math.round((distanceKm / avgSpeedKmh) * 60);
}

/**
 * Format time for display
 */
export function formatTravelTime(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
