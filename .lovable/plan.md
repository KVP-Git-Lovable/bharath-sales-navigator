

# Plan: Location-Missing Indicator + Capture Gate on Visit Cards

## Problem
Retailers created via bulk upload or without GPS often lack latitude/longitude. Currently, the MapPin icon on visit cards shows the same color regardless. Users can place orders without the retailer having stored coordinates, leaving data gaps.

## What We'll Do

### 1. Red MapPin indicator when location is missing
In `VisitCard.tsx`, change the MapPin icon color based on whether `visit.retailerLat` and `visit.retailerLng` exist:
- **Has coordinates**: Current primary color (blue)
- **Missing coordinates**: Red color with a tooltip "Location not captured"

### 2. Location capture gate before placing an order
When the user taps the **Order** button and the retailer has no coordinates (`!visit.retailerLat || !visit.retailerLng`):
- Show a modal/dialog prompting them to capture their current GPS location
- On "Capture Location": get `navigator.geolocation.getCurrentPosition`, then update the `retailers` table with the captured `latitude` and `longitude`
- On success: proceed to order entry as normal
- On cancel: block navigation to order entry

### 3. Update retailer master with captured coordinates
Once GPS is captured in the modal, save it to the `retailers` table via Supabase update, and update the local visit state so the MapPin turns blue immediately.

## Files to Modify

- **`src/components/VisitCard.tsx`**:
  - Change MapPin color conditionally (red vs primary) at ~line 2554-2563
  - Add state for location capture modal
  - Add intercept logic in the Order button onClick (~line 2716) to check for missing coords
  - Add a location capture dialog component (inline or extracted)
  - After capture, update `visit.retailerLat`/`retailerLng` locally and save to DB

No database schema changes needed — `retailers` table already has `latitude` and `longitude` columns.

