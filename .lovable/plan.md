
# Attendance Page Optimization Plan

## Problem Summary
The attendance page makes 5-6 network requests every time it loads, even when data hasn't changed. This causes:
- Slow page loading with spinners
- Unnecessary network traffic
- Poor user experience, especially on slow connections

## Current Data Loading Flow
```text
Page Load
    ├── fetchAttendanceData() → Supabase
    │       ├── Fetch attendance records
    │       ├── Fetch week_off_config
    │       └── Fetch holidays
    ├── fetchTodaysVisits() → Supabase
    ├── getCurrentLocation() → GPS
    └── fetchUserRegularizationRequests() → Supabase
```

## Solution: Offline-First with Smart Refresh

### Technical Approach

**1. Create New Hook: `useAttendanceData`**
A dedicated React Query hook that:
- Loads cached data instantly from offline storage
- Shows UI immediately with cached data
- Fetches fresh data in background only when needed
- Uses stale-while-revalidate pattern

**2. Cache Static Configuration Data**
Week-off config and holidays rarely change, so we'll:
- Cache them in offline storage when master data syncs
- Load from cache first, refresh in background

**3. Split Data Loading by Change Frequency**
```text
Static Data (cache for hours):
├── Week-off configuration
├── Holidays  
└── Working days per month

Dynamic Data (cache, refresh on focus):
├── Today's attendance record
├── Today's visits
└── This month's attendance records

Real-time Data (always fresh):
└── GPS location (only when marking attendance)
```

### Implementation Steps

**Step 1: Create `useAttendanceCache.ts` Hook**
- Load attendance records from offline storage first
- Background sync with network
- 5-minute stale time for current month data
- Cache working days calculation results

**Step 2: Create `useWorkingDaysConfig.ts` Hook**  
- Cache week-off and holiday config in offline storage
- Load from cache on page open
- Refresh only every 6 hours (like master data)

**Step 3: Update `Attendance.tsx`**
- Replace direct Supabase calls with new hooks
- Remove `useEffect` that fetches on every load
- Use React Query's built-in caching
- Only fetch GPS when user clicks check-in/out

**Step 4: Add to Master Data Cache**
- Add week-off config to `useMasterDataCache`
- Add holidays to `useMasterDataCache`
- These sync when user opens app

### Data Flow After Fix
```text
Page Load
    ├── [INSTANT] Load from offline cache
    │       ├── Cached attendance records → Show UI
    │       ├── Cached week-off config → Calculate stats
    │       └── Cached holidays → Calculate stats
    │
    └── [BACKGROUND] Smart refresh
            ├── Check if today's data needs refresh (stale > 5 min)
            ├── If online & stale → fetch only changed data
            └── Update UI seamlessly without flicker
```

### Benefits
- **Instant page load** - UI shows immediately from cache
- **Reduced network calls** - Only fetch when data is stale
- **Offline support** - Works without internet after first load
- **Stable UI** - No flickering or unnecessary re-renders
- **Battery efficient** - Fewer network requests

### Files to Modify
1. Create `src/hooks/useAttendanceCache.ts` - New caching hook
2. Create `src/hooks/useWorkingDaysConfig.ts` - Config caching hook  
3. Modify `src/pages/Attendance.tsx` - Use new hooks instead of direct fetches
4. Modify `src/hooks/useMasterDataCache.ts` - Add week-off and holiday caching
5. Modify `src/lib/offlineStorage.ts` - Add WEEK_OFF_CONFIG and HOLIDAYS stores
