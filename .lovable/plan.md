

## Fix: "Something went wrong" Error on Login and Tab Changes

### Root Cause
The `App` component (lines 232-253 in `src/App.tsx`) has a global error handler that listens for **all** `unhandledrejection` events. When **any** unhandled promise rejection occurs -- including harmless ones like the ServiceWorker registration failure -- it sets `hasError = true`, which replaces the entire app with the "Something went wrong" screen.

The ServiceWorker error (`Failed to update a ServiceWorker for scope...`) fires on every page load in the staging/preview environment and is completely harmless, but it triggers this crash screen.

### The Fix
Modify the `rejectionHandler` in `src/App.tsx` to **ignore known harmless errors** like ServiceWorker failures, network errors, and other non-critical promise rejections. Only set `hasError = true` for genuinely fatal errors.

### Technical Changes

**File: `src/App.tsx`** (lines 241-243)

Update the `rejectionHandler` to filter out non-critical errors before setting `hasError`:

```typescript
const rejectionHandler = (event: PromiseRejectionEvent) => {
  const message = event.reason?.message || event.reason?.toString() || '';
  
  // Ignore non-critical errors that shouldn't crash the app
  const ignoredErrors = [
    'ServiceWorker',
    'service-worker',
    'Failed to fetch',
    'Network request failed',
    'NetworkError',
    'Load failed',
    'AbortError',
    'chunk',
  ];
  
  const isIgnored = ignoredErrors.some(err => message.includes(err));
  
  if (isIgnored) {
    console.warn("Non-critical rejection suppressed:", message);
    return;
  }
  
  console.error("Unhandled rejection:", event.reason);
  setHasError(true);
};
```

This is a single-file change. No backend or database changes needed.

### Why This Happens on Tab Changes
When switching browser tabs, the browser may re-evaluate the ServiceWorker script or trigger network-related promise rejections. The current overly aggressive error handler catches these and crashes the app.

