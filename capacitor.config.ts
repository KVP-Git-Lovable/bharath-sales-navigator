import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kvp.salesnavigator',
  appName: 'QuickApp',
  webDir: 'dist',
  server: {
    // field-sales-navigator.lovable.app now redirects here — pointing directly
    // at the current domain avoids a cross-origin redirect that Capacitor's
    // WebView hands off to the system browser instead of following in-app.
    url: 'https://fieldsales.quickapp.ai',
    androidScheme: 'https',
    cleartext: false
  },
  webView: {
    allowMixedContent: true
  },
  android: {
    // Enable WebView for better storage persistence
    webContentsDebuggingEnabled: true
  },
  // Ensure proper data persistence
  plugins: {
    SplashScreen: {
      launchShowDuration: 0
    },
    CapacitorCookies: {
      enabled: true
    }
  }
};

export default config;