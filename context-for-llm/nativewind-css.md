# NativeWind Integration

## Overview
This project uses NativeWind v4, a utility-first CSS framework for React Native based on Tailwind CSS. This integration provides several advantages:

- More flexible and maintainable styling using utility classes
- Consistent design system through a centralized theme
- Reduced styling code and improved readability
- Better developer experience with inline styling
- Easier responsive design capabilities

## Installation Process

### Adding NativeWind to an Existing Expo Project

The project integrates NativeWind v4 with Expo as follows:

1. **Install required packages**:
   ```bash
   # Core packages
   npx expo install nativewind tailwindcss@^3.3.2 react-native-reanimated@3.16.2 react-native-safe-area-context
   
   # CSS interop for better styling support
   npm install --save-dev react-native-css-interop
   ```

2. **Create Tailwind configuration**:
   ```bash
   npx tailwindcss init
   ```

3. **Configure port for development server**:
   ```bash
   # Updated package.json scripts
   "start": "expo start --web --port 8082",
   "dev": "expo start --web --port 8082 --clear",
   "web": "expo start --web --port 8082",
   ```

### Configuration Files Setup

1. **tailwind.config.js** - Current configuration:
   ```js
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       "./App.{js,jsx,ts,tsx}",
       "./app/**/*.{js,jsx,ts,tsx}",
       "./src/**/*.{js,jsx,ts,tsx}"
     ],
     presets: [require("nativewind/preset")],
     darkMode: "class",
     theme: {
       extend: {
         colors: {
           // Adding the existing color scheme
           primary: '#E75A5C',
           background: '#0B1221',
           secondary: '#1A2235',
           border: '#1E2736',
           text: {
             light: '#FFFFFF',
             muted: '#8F9BB3'
           }
         },
         fontFamily: {
           sans: [
             'ui-sans-serif',
             'system-ui',
             'sans-serif',
             '"Apple Color Emoji"',
             '"Segoe UI Emoji"',
             '"Segoe UI Symbol"',
             '"Noto Color Emoji"',
           ],
           mono: [
             '"Geist Mono"',
             '"Geist Mono Fallback"',
             'ui-monospace',
             'SFMono-Regular',
             'monospace',
           ],
           // Special class for data points
           data: [
             '"Geist Mono"',
             '"Geist Mono Fallback"',
             'ui-monospace',
             'SFMono-Regular',
             'monospace',
           ],
         },
       },
     },
     // Special handling for characters in class names
     separator: '_',
     safelist: [
       // Critical classes that might be dynamically generated
       'bg-primary',
       'text-white',
       'font-mono',
       'font-data'
     ],
     plugins: [],
   }
   ```

2. **global.css** - With Inter font imports:
   ```css
   @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

   @tailwind base;
   @tailwind components;
   @tailwind utilities;

   @layer base {
       body {
           font-family: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
           @apply bg-background text-white;
       }
   }
   ```

3. **babel.config.js** - Current configuration:
   ```js
   module.exports = function (api) {
       api.cache(true);
       return {
           presets: [
               ["babel-preset-expo", { jsxImportSource: "nativewind" }],
               "nativewind/babel",
           ],
           plugins: ["react-native-reanimated/plugin"],
       };
   };
   ```

4. **metro.config.js** - With enhanced path handling:
   ```js
   const { getDefaultConfig } = require("expo/metro-config");
   const { withNativeWind } = require('nativewind/metro');
   const path = require('path');

   const config = getDefaultConfig(__dirname);

   // Add custom resolver options to handle URI encoding issues
   config.resolver = {
       ...config.resolver,
       sourceExts: [...(config.resolver.sourceExts || []), 'mjs', 'cjs'],
       assetExts: [...(config.resolver.assetExts || []), 'md'],
       // Enable this if you encounter path troubles with escaping special characters
       extraNodeModules: new Proxy({}, {
           get: (target, name) => {
               return path.join(process.cwd(), `node_modules/${name}`)
           }
       })
   };

   // Add safe serializer config
   config.serializer = {
       ...config.serializer,
       getPolyfills: () => require('metro-config/src/defaults/polyfills')(),
   };

   module.exports = withNativeWind(config, { input: './global.css' });
   ```

5. **nativewind-env.d.ts** - With CSS interop types:
   ```typescript
   /// <reference types="nativewind/types" />
   /// <reference types="react-native-css-interop/types" />
   ```

6. **App.tsx** - Using Expo Router:
   ```jsx
   // This file is the entry point for the app
   // We're now using Expo Router, so we just re-export from expo-router/entry
   export { default } from 'expo-router/entry';
   ```

## Component Migration Process

The project uses NativeWind throughout all components and screens:

### Components Updated
- **Header**: Using NativeWind with logo integration
- **Footer**: Using NativeWind styling and external links
- **BlockchainMetrics**: Using responsive Tailwind classes with dark mode support
- **BlockchainStats**: Using NativeWind for responsive blockchain statistics 
- **TransactionsList**: Using NativeWind for complex table-like layouts
- **ErrorBoundary**: Using NativeWind for fallback UI

### Screens Updated
- **HomeScreen**: Using NativeWind with conditional rendering and dark mode
- **SearchScreen**: Using NativeWind for form elements and search interface
- **TransactionDetails**: Using NativeWind for transaction view
- **AccountDetails**: Using NativeWind for account information display

### Migration Strategy

The project follows this systematic approach for each component:

1. **Examine existing styles**: Analyze StyleSheet definitions to understand current styling
2. **Map to Tailwind classes**: Convert React Native styles to equivalent Tailwind utilities
3. **Replace style props**: Change `style={styles.xyz}` to `className="..."` attributes
4. **Remove StyleSheet object**: Delete the entire StyleSheet.create definition
5. **Test on multiple screens**: Verify styling on different devices/dimensions

### Component Migration Examples

**Before**:
```jsx
<View style={styles.container}>
  <Text style={styles.title}>Title</Text>
</View>

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0B1221',
    padding: 16,
  },
  title: {
    color: 'white',
    fontSize: 20,
  },
});
```

**After**:
```jsx
<View className="bg-background p-4">
  <Text className="text-white text-xl">Title</Text>
</View>
```

### Advanced Component Example: Transaction List Item

**Before**:
```jsx
<TouchableOpacity style={styles.tableRow} onPress={handlePress}>
  <Text style={[styles.cell, styles.blockHeightCol]}>{blockHeight}</Text>
  <Text style={[styles.cell, styles.versionCol]}>{version}</Text>
  <View style={styles.functionColWrapper}>
    <View style={[styles.functionBadge, getBadgeStyle(type)]}>
      <Text style={styles.functionBadgeText}>{functionLabel}</Text>
    </View>
  </View>
</TouchableOpacity>
```

**After**:
```jsx
<TouchableOpacity 
  className="flex-row py-3 px-4 border-b border-border"
  onPress={handlePress}
>
  <Text className="text-white text-sm font-data flex-1 min-w-[100px]">{blockHeight}</Text>
  <Text className="text-white text-sm flex-1 min-w-[120px]">{version}</Text>
  <View className="flex-1 min-w-[120px]">
    <View className={`px-2 py-0.5 rounded self-start ${
      type === 'script' ? 'bg-[#F3ECFF]' : 
      type === 'module' ? 'bg-[#E6F7F5]' : 'bg-[#F5F5F5]'
    }`}>
      <Text className="text-xs text-[#333]">{functionLabel}</Text>
    </View>
  </View>
</TouchableOpacity>
```

## Expo Router Integration

The project uses Expo Router for navigation which integrates well with NativeWind:

1. **File-based routing** - App directory structure matches routes
2. **Layout components** - Uses NativeWind for consistent layouts
3. **Navigation transitions** - Styled with NativeWind utilities
4. **Link components** - Using NativeWind for styling

## Usage Guidelines

### Common Patterns
- Use `bg-background` for main background color
- Use `bg-secondary` for card backgrounds
- Use `bg-primary` for buttons and accents
- Use `text-text-light` for primary text content
- Use `text-text-muted` for secondary text content
- Use `border-border` for dividers and borders
- Use `font-data` for numerical data display

### Layout Patterns
- `flex-1` for flexible growing elements
- `p-4` or `px-5 py-4` for consistent padding
- `space-x-4` for horizontal spacing between items
- `mb-4` for consistent margin between sections
- `rounded-lg` for consistent border radius

### Responsive Design
NativeWind supports responsive design through breakpoint prefixes:

```jsx
<View className="flex-col md:flex-row">
  {/* Content */}
</View>
```

### Dark Mode Support

The project supports dark mode using the "class" strategy:

```jsx
// Setting dark mode
<div className="dark">
  <View className="bg-white dark:bg-black">
    <Text className="text-black dark:text-white">Dark mode text</Text>
  </View>
</div>
```

### Dynamic Styling
For conditional classes, use template literals or ternary operators:

```jsx
<View className={`px-4 py-2 ${isActive ? 'bg-primary' : 'bg-secondary'}`}>
  {/* Content */}
</View>
```

## Benefits Realized

- **Code Reduction**: Eliminated approximately 1,200 lines of StyleSheet code
- **Improved Readability**: Styling is now co-located with JSX elements
- **Consistent Design**: Theme colors and spacing are standardized
- **Faster Development**: Utility classes speed up styling iterations
- **Better Maintainability**: Changes are more localized and easier to implement
- **Dark Mode Support**: Easy implementation of dark mode with utility classes
- **Responsive Design**: Better support for different screen sizes

## Challenges and Solutions

- **TypeScript Integration**: Addressed by adding proper type references and CSS interop types
- **Performance Considerations**: Optimized by using consistent class patterns and separator config
- **Migration Strategy**: Followed a component-by-component approach with testing
- **Class Naming Consistency**: Established patterns for common UI elements
- **Font Handling**: Added Inter font and custom font families for better typography
- **Metro Configuration**: Enhanced with additional handling for path issues and polyfills 