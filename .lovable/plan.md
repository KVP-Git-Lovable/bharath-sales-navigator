

## Battery Monitoring Utility

### Overview
Add a background battery monitoring system that reads the device battery percentage every 15 minutes and sends it to the Supabase backend, leveraging the existing interval manager and Capacitor plugin ecosystem.

### Components

**1. Install `@capacitor/device` package**
This official Capacitor plugin provides `Device.getBatteryInfo()` which returns `batteryLevel` (0-1) and `isCharging` (boolean). It works on Android, iOS, and web.

**2. New database table: `device_battery_logs`**

| Column | Type | Description |
|--------|------|-------------|
| id | UUID (PK) | Auto-generated |
| user_id | UUID (FK) | References auth.users |
| battery_level | INTEGER | Battery percentage (0-100) |
| is_charging | BOOLEAN | Whether device is plugged in |
| recorded_at | TIMESTAMPTZ | When the reading was taken |
| created_at | TIMESTAMPTZ | DB insert time |

RLS policies:
- Users can INSERT their own logs (`auth.uid() = user_id`)
- Users can SELECT their own logs
- Admins can SELECT all logs

**3. New utility: `src/utils/batteryMonitor.ts`**
- Uses `@capacitor/device` to call `Device.getBatteryInfo()`
- Falls back gracefully on web (Battery Status API or skip)
- Exports a `logBatteryStatus(userId)` function that reads battery and inserts into `device_battery_logs`

**4. New hook: `src/hooks/useBatteryMonitor.ts`**
- Uses the existing `useManagedInterval` from `intervalManager.ts` to schedule readings every 15 minutes (900,000 ms)
- Only runs when a user is authenticated
- Pauses automatically when app is in background (via the existing visibility API in intervalManager)
- Resumes and takes a reading when app becomes visible again

**5. Integration in `Layout.tsx`**
- Add `useBatteryMonitor()` call inside the Layout component so it runs app-wide for all authenticated users

### Technical Details

```text
Flow:
  Layout mounts
    -> useBatteryMonitor() starts
      -> useManagedInterval('battery-monitor', logBattery, 900000)
        -> Every 15 min (when visible):
          1. Device.getBatteryInfo() -> { batteryLevel: 0.72, isCharging: false }
          2. supabase.from('device_battery_logs').insert({ user_id, battery_level: 72, is_charging: false })
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `package.json` | Add `@capacitor/device` dependency |
| `supabase/migrations/...` | New migration for `device_battery_logs` table + RLS |
| `src/utils/batteryMonitor.ts` | New - battery reading + DB insert logic |
| `src/hooks/useBatteryMonitor.ts` | New - hook using `useManagedInterval` |
| `src/components/Layout.tsx` | Add `useBatteryMonitor()` call |

### Edge Cases Handled
- **Web/PWA**: Falls back to Navigator Battery API if available, or silently skips
- **Background**: Interval pauses automatically via existing `intervalManager` visibility support
- **Offline**: Insert will fail silently; battery logs are non-critical telemetry
- **No auth**: Hook checks for authenticated user before starting

