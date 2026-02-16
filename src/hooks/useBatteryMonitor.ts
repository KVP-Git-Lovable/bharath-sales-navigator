import { useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useManagedInterval } from "@/utils/intervalManager";
import { logBatteryStatus } from "@/utils/batteryMonitor";

const BATTERY_CHECK_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function useBatteryMonitor() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const checkBattery = useCallback(() => {
    if (userId) {
      logBatteryStatus(userId);
    }
  }, [userId]);

  useManagedInterval('battery-monitor', checkBattery, BATTERY_CHECK_INTERVAL, {
    enabled: !!userId,
    runWhenHidden: false,
    immediate: true,
  });
}
