# PWA Implementation Details

This document outlines how the Progressive Web App (PWA) features are implemented in the Open Libra Explorer application.

## Core PWA Components

### Web App Manifest (`public/manifest.json`)
The manifest provides metadata about the application such as name, icons, and display preferences:

```json
{
  "short_name": "OL Explorer",
  "name": "Open Libra Blockchain Explorer",
  "icons": [
    {
      "src": "favicon.svg",
      "sizes": "64x64 32x32 24x24 16x16",
      "type": "image/svg+xml"
    },
    {
      "src": "logo192.png",
      "type": "image/png",
      "sizes": "192x192"
    },
    {
      "src": "logo512.png",
      "type": "image/png",
      "sizes": "512x512"
    }
  ],
  "start_url": ".",
  "display": "standalone",
  "theme_color": "#E75A5C",
  "background_color": "#0B1221",
  "description": "Explore transactions, accounts, and blocks on the Open Libra network",
  "orientation": "portrait",
  "scope": "/"
}
```

### Service Worker (`public/service-worker.js`)
The service worker handles caching of assets and provides offline functionality:

- **Cache Strategy**: Cache-first for static assets, network-first for dynamic content
- **Offline Page**: Provides a custom offline experience when network requests fail
- **Cache Management**: Cleans up old caches during service worker updates

### Service Worker Registration (`src/utils/serviceWorkerRegistration.ts`)
This utility handles the registration of the service worker in production environments:

```typescript
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator && window.location.protocol === 'https:') {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then(registration => {
          console.log('Service Worker registered successfully:', registration.scope);
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    });
  }
}
```

## PWA Integration

### Service Worker Registration
The service worker is registered in the application's root layout component:

```typescript
useEffect(() => {
  console.log('App initialized with Expo Router');
  console.log('Environment:', process.env.NODE_ENV);
  
  // Register service worker for PWA functionality (web only)
  if (process.env.NODE_ENV === 'production') {
    registerServiceWorker();
  }
}, []);
```

### HTML Configuration
The `public/index.html` file includes necessary PWA-related meta tags:

```html
<link rel="manifest" href="./manifest.json" />
<meta name="theme-color" content="#0B1221" />
<link rel="apple-touch-icon" href="./logo192.png" />
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="OL Explorer">
```

### PWA Detection
The application can detect when it's running in PWA mode:

```javascript
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  console.log('App is being displayed in standalone/PWA mode');
}
```

## PWA Assets

### Icons
- **favicon.svg**: Vector icon used across all sizes
- **logo192.png**: 192×192 pixel icon for Android and general use
- **logo512.png**: 512×512 pixel icon for larger displays and iOS

### Manifest Verification
The project includes a verification script (`scripts/verify-pwa.js`) to ensure all PWA assets and configurations are correct.

## Offline Experience

The application provides a tailored offline experience:

1. **Cached Routes**: Basic navigation structure remains accessible
2. **Offline Page**: Custom error page when trying to access uncached content
3. **Asset Caching**: Critical CSS, JavaScript, and images are cached for offline use

## Testing PWA Features

To test the PWA functionality:

1. Build the application for production:
   ```bash
   npm run build
   ```

2. Serve the build folder with a static server:
   ```bash
   npx serve -s web-build
   ```

3. Open the application in Chrome, then:
   - Open Dev Tools
   - Go to Application > Service Workers to verify registration
   - Go to Application > Manifest to check manifest information
   - Use Lighthouse to run a PWA audit

4. Test installation:
   - Look for the install icon in the address bar
   - Verify the application launches correctly after installation

5. Test offline functionality:
   - Go offline in Dev Tools (Network tab > Offline)
   - Refresh the page and verify cached content loads
   - Try navigating to different routes

## Future Enhancements

Potential improvements for the PWA implementation:

1. **Background Sync**: Queue transactions for later when offline
2. **Push Notifications**: Alert users about important blockchain events
3. **Periodic Sync**: Update cached data in the background
4. **Improved Caching Strategies**: More sophisticated caching for blockchain data 