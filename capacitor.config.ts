import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.kvp.salesnavigator',
  appName: 'SalesNavigator',
  webDir: 'dist',
  server: {
    url: 'https://field-sales-navigator.lovable.app',
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