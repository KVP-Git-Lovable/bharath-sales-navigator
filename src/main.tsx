import React from 'react';
import { createRoot } from 'react-dom/client';
// Import PWA capture FIRST to catch beforeinstallprompt event early
import './utils/pwaInstallCapture';
import App from './App.tsx';
import './index.css';
// Import i18n BEFORE app renders to ensure translations are available
import './i18n/config';
// Core modules - static imports (always in main bundle)
import { offlineStorage } from './lib/offlineStorage';
import { initCrashlytics } from './utils/crashlytics';
import { initDownloadNotifications } from './utils/fileDownloader';

console.log('🚀 App starting...');

// Initialize and render app immediately
const root = document.getElementById("root");
if (!root) {
  console.error('❌ Root element not found');
  throw new Error('Root element not found');
}

// Render app with StrictMode for better error detection
console.log('🎨 Rendering app...');
createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
console.log('✅ App rendered successfully');

// Initialize background services after render
(async () => {
  try {
    // Register service worker
    if ('serviceWorker' in navigator) {
      const { registerSW } = await import('virtual:pwa-register');
      registerSW({
        immediate: true,
        onNeedRefresh() {
          console.log('🔄 New content available, will refresh');
        },
        onOfflineReady() {
          console.log('📴 App ready to work offline');
        },
        onRegistered(registration) {
          console.log('✅ Service Worker registered', registration);
        },
        onRegisterError(error) {
          console.error('❌ Service Worker registration error:', error);
        }
      });
    }
  } catch (error) {
    console.warn('⚠️ Service Worker registration failed:', error);
  }

  try {
    console.log('📦 Initializing offline storage...');
    await offlineStorage.init();
    console.log('✅ Offline storage ready');
  } catch (error) {
    console.warn('⚠️ Offline storage init failed:', error);
  }

  try {
    await initDownloadNotifications();
    console.log('✅ Download notifications initialized');
  } catch (error) {
    console.warn('⚠️ Download notifications init failed:', error);
  }

  try {
    await initCrashlytics();
  } catch (error) {
    console.warn('⚠️ Crashlytics init failed:', error);
  }
})();
