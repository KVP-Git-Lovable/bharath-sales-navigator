

## Road-Following Routes Using OSRM (Free Routing API)

### What Changes
Replace the current straight-line connections between retailers with actual road-following routes using the free OSRM (Open Source Routing Machine) API. Routes will follow real roads just like Google Maps, giving a much more realistic view of the daily journey.

### How It Works
- When the map renders route coordinates, instead of drawing a straight line between points, we call the OSRM API with all waypoints
- OSRM returns the actual road geometry (as a polyline) which we decode and draw on the map
- The colored day-wise routes and clickable legend continue to work exactly the same -- only the line shape changes
- Falls back to straight lines if the OSRM request fails (e.g., offline or too many waypoints)

### Technical Details

**File: `src/components/JourneyMap.tsx`**

1. **Add OSRM fetch helper function** that takes an array of coordinates and returns road-following geometry:
   ```typescript
   async function fetchOSRMRoute(coords: [number, number][]): Promise<L.LatLngExpression[]> {
     // OSRM expects lng,lat (not lat,lng)
     const waypoints = coords.map(([lat, lng]) => `${lng},${lat}`).join(';');
     const url = `https://router.project-osrm.org/route/v1/driving/${waypoints}?overview=full&geometries=geojson`;
     const res = await fetch(url);
     const data = await res.json();
     // Returns [lat, lng] pairs from GeoJSON [lng, lat]
     return data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
   }
   ```

2. **Add polyline decoding utility** -- OSRM with `geometries=geojson` returns GeoJSON coordinates directly, so no extra decoding library is needed.

3. **Make the map update effect async** -- the useEffect that draws routes will become async to await the OSRM API calls.

4. **Multi-day mode** (lines 298-305): For each day group, call `fetchOSRMRoute(routeCoords)` and use the returned road geometry for the polyline instead of the straight `routeCoords`.

5. **Single-day mode** (lines 314-316): Same change -- call OSRM for the optimized retailer route and draw road-following geometry.

6. **Error handling / fallback**: If OSRM fails (network error, rate limit, or no route found), fall back to the existing straight-line polyline so the map never breaks.

7. **Rate limiting**: OSRM's public server has usage limits. We batch all waypoints for a day into a single request (up to ~100 waypoints supported) rather than making per-segment calls.

### Important Notes
- OSRM public server (`router.project-osrm.org`) is free but has fair-use rate limits -- suitable for this use case since routes are fetched on-demand, not in bulk
- No API key required
- No new dependencies needed -- uses standard `fetch` and Leaflet's existing polyline rendering
- Only **one file** changes: `src/components/JourneyMap.tsx`

