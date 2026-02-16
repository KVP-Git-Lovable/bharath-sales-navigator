import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Monitor, Smartphone } from "lucide-react";
import { Capacitor } from "@capacitor/core";

function getBatteryIcon(level: number, charging: boolean) {
  if (charging) return BatteryCharging;
  if (level >= 80) return BatteryFull;
  if (level >= 40) return BatteryMedium;
  if (level >= 15) return BatteryLow;
  return Battery;
}

function getBatteryColor(level: number, charging: boolean) {
  if (charging) return "text-blue-500";
  if (level >= 60) return "text-green-500";
  if (level >= 30) return "text-yellow-500";
  return "text-red-500";
}

async function fetchBattery(): Promise<{ level: number; charging: boolean } | null> {
  try {
    const { Device } = await import("@capacitor/device");
    const info = await Device.getBatteryInfo();
    if (info.batteryLevel != null) {
      return { level: Math.round(info.batteryLevel * 100), charging: info.isCharging ?? false };
    }
  } catch {
    try {
      const nav = navigator as any;
      if (typeof nav.getBattery === "function") {
        const b = await nav.getBattery();
        return { level: Math.round(b.level * 100), charging: b.charging ?? false };
      }
    } catch {}
  }
  return null;
}

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function DeviceInfoCard() {
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const refresh = useCallback(async () => {
    const info = await fetchBattery();
    if (info) setBattery(info);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  if (!battery) return null;

  const BattIcon = getBatteryIcon(battery.level, battery.charging);
  const battColor = getBatteryColor(battery.level, battery.charging);
  const DeviceIcon = isNative ? Smartphone : Monitor;

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Device Info
        </p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <DeviceIcon className="h-4 w-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{isNative ? "Mobile" : "Browser"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <BattIcon className={`h-4 w-4 ${battColor}`} />
            <span className={`text-sm font-semibold ${battColor}`}>{battery.level}%</span>
            {battery.charging && (
              <span className="text-[10px] text-blue-500 font-medium">Charging</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
