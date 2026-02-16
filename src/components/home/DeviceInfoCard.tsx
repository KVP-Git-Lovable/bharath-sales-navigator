import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Battery, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, Monitor, Smartphone, Cpu, HardDrive } from "lucide-react";
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

interface DeviceData {
  battery: { level: number; charging: boolean } | null;
  model: string | null;
  os: string | null;
  osVersion: string | null;
  memUsedMB: number | null;
}

async function fetchDeviceData(): Promise<DeviceData> {
  const result: DeviceData = { battery: null, model: null, os: null, osVersion: null, memUsedMB: null };

  try {
    const { Device } = await import("@capacitor/device");

    // Battery
    try {
      const batt = await Device.getBatteryInfo();
      if (batt.batteryLevel != null) {
        result.battery = { level: Math.round(batt.batteryLevel * 100), charging: batt.isCharging ?? false };
      }
    } catch {}

    // Device info (model, OS, RAM)
    try {
      const info = await Device.getInfo();
      result.model = info.model || null;
      result.os = info.operatingSystem || null;
      result.osVersion = info.osVersion || null;
      if ((info as any).memUsed) {
        result.memUsedMB = Math.round((info as any).memUsed / 1024 / 1024);
      }
    } catch {}
  } catch {
    // Fallback for web battery
    try {
      const nav = navigator as any;
      if (typeof nav.getBattery === "function") {
        const b = await nav.getBattery();
        result.battery = { level: Math.round(b.level * 100), charging: b.charging ?? false };
      }
    } catch {}

    // Web fallback for OS/model
    const ua = navigator.userAgent;
    result.os = navigator.platform || null;
    if (/Android/.test(ua)) result.os = "Android";
    else if (/iPhone|iPad|iPod/.test(ua)) result.os = "iOS";
    else if (/Mac/.test(ua)) result.os = "macOS";
    else if (/Win/.test(ua)) result.os = "Windows";
    else if (/Linux/.test(ua)) result.os = "Linux";

    // Web memory (Chrome only)
    if ((performance as any).memory) {
      result.memUsedMB = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024);
    }
  }

  return result;
}

const REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes

export function DeviceInfoCard() {
  const [data, setData] = useState<DeviceData | null>(null);
  const isNative = Capacitor.isNativePlatform();

  const refresh = useCallback(async () => {
    const info = await fetchDeviceData();
    setData(info);
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, REFRESH_INTERVAL);
    return () => clearInterval(id);
  }, [refresh]);

  if (!data) return null;

  const DeviceIcon = isNative ? Smartphone : Monitor;
  const battIcon = data.battery ? getBatteryIcon(data.battery.level, data.battery.charging) : null;
  const battColor = data.battery ? getBatteryColor(data.battery.level, data.battery.charging) : "";
  const BattIcon = battIcon;

  const osLabel = [data.os, data.osVersion].filter(Boolean).join(" ");

  return (
    <Card className="border-border/50">
      <CardContent className="p-3">
        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Phone / PC Details
        </p>
        <div className="grid grid-cols-2 gap-2">
          {/* Device type */}
          <div className="flex items-center gap-1.5">
            <DeviceIcon className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{isNative ? "Mobile" : "Browser"}</span>
          </div>

          {/* Battery */}
          {data.battery && BattIcon && (
            <div className="flex items-center gap-1.5">
              <BattIcon className={`h-3.5 w-3.5 ${battColor}`} />
              <span className={`text-xs font-semibold ${battColor}`}>{data.battery.level}%</span>
              {data.battery.charging && (
                <span className="text-[10px] text-blue-500 font-medium">⚡</span>
              )}
            </div>
          )}

          {/* Model */}
          {data.model && (
            <div className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{data.model}</span>
            </div>
          )}

          {/* OS */}
          {osLabel && (
            <div className="flex items-center gap-1.5">
              <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground truncate">{osLabel}</span>
            </div>
          )}

          {/* RAM */}
          {data.memUsedMB != null && (
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{data.memUsedMB} MB used</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
