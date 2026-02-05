import React from 'react';
import { createRoot } from 'react-dom/client';
// Import PWA capture FIRST to catch beforeinstallprompt event early
import './utils/pwaInstallCapture';
import App from './App.tsx';
import './index.css';
// Import i18n BEFORE app renders to ensure translations are available
import './i18n/config';

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
    // Initialize offline storage in background
    console.log('📦 Initializing offline storage...');
    const { offlineStorage } = await import('./lib/offlineStorage');
    await offlineStorage.init();
    console.log('✅ Offline storage ready');
  } catch (error) {
    console.warn('⚠️ Offline storage init failed:', error);
  }

  // i18n is already loaded synchronously at startup

  try {
    // Initialize download notifications channel for native apps
    const { initDownloadNotifications } = await import('./utils/fileDownloader');
    await initDownloadNotifications();
    console.log('✅ Download notifications initialized');
  } catch (error) {
    console.warn('⚠️ Download notifications init failed:', error);
  }
})();
