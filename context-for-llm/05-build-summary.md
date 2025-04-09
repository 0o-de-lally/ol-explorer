# OL Explorer - Build Process Summary

This document outlines the build process for the OL Explorer blockchain explorer project, including the configuration, commands, and deployment options.

## Build Configuration

The project is configured to be built for multiple platforms:
- Web deployment (primary target)
- Native mobile applications (iOS/Android)

### Web Build Configuration

The web build is configured through Expo's build system with the following key settings:

1. **Expo Config**: The `app.json` file includes web-specific configurations:
   ```json
   "web": {
     "favicon": "./assets/favicon.png",
     "bundler": "metro"
   }
   ```

2. **Metro Config**: The `metro.config.js` file is configured to handle web-specific features:
   ```javascript
   const { getDefaultConfig } = require('expo/metro-config');
   const { withNativeWind } = require('nativewind/metro');
   
   const config = getDefaultConfig(__dirname);
   
   module.exports = withNativeWind(config, { input: './global.css' });
   ```

3. **Babel Config**: The `babel.config.js` file includes necessary plugins for web compatibility:
   ```javascript
   module.exports = function(api) {
     api.cache(true);
     return {
       presets: ['babel-preset-expo'],
       plugins: ['react-native-reanimated/plugin'],
     };
   };
   ```

### Progressive Web App Support

The project includes PWA (Progressive Web App) capabilities with:

1. **Web Manifest**: `public/manifest.json` with app metadata
2. **Service Worker**: `public/service-worker.js` for offline capabilities
3. **App Icons**: Multiple sizes in the `public` directory for different devices

## Build Scripts

The build process is streamlined through npm scripts defined in `package.json`:

```json
"scripts": {
  "start": "expo start --web --port 8082",
  "dev": "expo start --web --port 8082 --clear",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web --port 8082",
  "build": "expo export:web",
  "build:android": "expo build:android",
  "build:ios": "expo build:ios",
  "build:web": "expo export:web"
}
```

## Build Process

The build process follows these steps:

### 1. Development Build

For development and testing:

```bash
# Start the development server
npm run dev

# Access the development build at http://localhost:8082
```

### 2. Production Web Build

To create a production-ready web build:

```bash
# Build for web
npm run build

# Output is generated in the 'web-build' directory
```

The build process for web:
1. Bundles all JavaScript with Metro bundler
2. Optimizes assets and generates responsive images
3. Creates the HTML entry point
4. Generates the service worker for offline capabilities
5. Copies the web manifest and icons

### 3. Native App Builds

For building native applications:

```bash
# Build for Android
npm run build:android

# Build for iOS
npm run build:ios
```

## Build Optimizations

The following optimizations are applied during the build process:

1. **Code Splitting**: The web build uses code splitting to reduce initial load time
2. **Asset Optimization**: Images and other assets are optimized and appropriate sizes are generated
3. **Tree Shaking**: Unused code is removed from the bundle
4. **Minification**: JavaScript and CSS are minified for production
5. **Compression**: Static assets are compressed

## Deployment Options

The project is configured for multiple deployment options:

### 1. Static Web Hosting

The web build can be deployed to static hosting services:

```bash
# Build for web
npm run build

# Deploy to GitHub Pages
npx gh-pages -d web-build
```

### 2. Server Deployment with Nginx

For server deployment with Nginx:

1. Build the application:
   ```bash
   npm run build
   ```

2. Copy the build to the server:
   ```bash
   scp -r web-build/* user@server:/var/www/ol-explorer/
   ```

3. Configure Nginx:
   ```nginx
   server {
       listen 80;
       server_name twin-explorer.openlibra.space;
       
       root /var/www/ol-explorer;
       index index.html;
       
       location / {
           try_files $uri $uri/ /index.html;
       }
       
       # Enable gzip compression
       gzip on;
       gzip_types text/plain text/css application/json application/javascript;
       
       # Cache static assets
       location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
           expires 30d;
       }
   }
   ```

4. Set up SSL with Certbot:
   ```bash
   sudo certbot --nginx -d twin-explorer.openlibra.space
   ```

### 3. Cloudflare Pages Deployment

For Cloudflare Pages deployment:

1. Connect the GitHub repository to Cloudflare Pages
2. Configure the build command: `npm run build`
3. Set the build output directory: `web-build`

## Build Testing

Before deployment, the build is tested to ensure quality:

1. **Lighthouse Testing**: Performance, accessibility, and best practices testing
2. **Cross-browser Testing**: Testing on major browsers (Chrome, Firefox, Safari)
3. **Responsive Testing**: Ensuring the application works on different screen sizes

## Build Output Structure

The final web build output structure is:

```
web-build/
├── asset-manifest.json       # Manifest of all assets
├── favicon.ico               # Favicon
├── index.html                # HTML entry point
├── manifest.json             # Web app manifest
├── service-worker.js         # Service worker for offline capabilities
├── static/                   # Static assets
│   ├── js/                   # JavaScript bundles
│   ├── css/                  # CSS files
│   ├── media/                # Media files
│   └── fonts/                # Font files
└── icons/                    # App icons in different sizes
```

## Continuous Deployment

The project uses GitHub Actions for continuous deployment:

1. On each push to the main branch, the CI workflow runs tests
2. If tests pass, the build is generated
3. The build is then deployed to the staging environment
4. Manual approval is required for production deployment

## Build Issues and Solutions

During the build process, the following issues were encountered and resolved:

1. **Metro Bundler Configuration**: Resolved compatibility issues with NativeWind and Metro by creating a custom Metro configuration
2. **Asset Loading**: Fixed asset loading issues by properly configuring the Expo asset system
3. **Environment Variables**: Implemented secure handling of environment variables for different build environments
4. **Polyfills for Web**: Added necessary polyfills for web compatibility

All build issues have been resolved, and the application successfully builds for all target platforms. 