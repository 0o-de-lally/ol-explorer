# NativeWind Integration

## Overview
This project has been updated to use NativeWind, a utility-first CSS framework for React Native based on Tailwind CSS. This integration provides several advantages:

- More flexible and maintainable styling using utility classes
- Consistent design system through a centralized theme
- Reduced styling code and improved readability
- Better developer experience with inline styling
- Easier responsive design capabilities

## Installation Process

### Adding NativeWind to an Existing Expo Project

We integrated NativeWind into this existing Expo project by following these steps:

1. **Install required packages**:
   ```bash
   npx expo install nativewind tailwindcss@^3.4.17 react-native-reanimated@3.16.2 react-native-safe-area-context
   ```

2. **Create Tailwind configuration**:
   ```bash
   npx tailwindcss init
   ```

3. **Configure port for development server**:
   ```bash
   # Updated package.json scripts
   "start": "expo start --web --port 8082",
   "web": "expo start --web --port 8082",
   ```

### Configuration Files Setup

1. **tailwind.config.js** - Created and configured to include all component paths:
   ```js
   /** @type {import('tailwindcss').Config} */
   module.exports = {
     content: [
       "./App.{js,jsx,ts,tsx}",
       "./app/**/*.{js,jsx,ts,tsx}",
       "./src/**/*.{js,jsx,ts,tsx}"
     ],
     presets: [require("nativewind/preset")],
     theme: {
       extend: {
         colors: {
           primary: '#E75A5C',
           background: '#0B1221',
           secondary: '#1A2235',
           border: '#1E2736',
           text: {
             light: '#FFFFFF',
             muted: '#8F9BB3'
           }
         },
       },
     },
     plugins: [],
   }
   ```

2. **global.css** - Created with Tailwind directives:
   ```css
   @tailwind base;
   @tailwind components;
   @tailwind utilities;
   ```

3. **babel.config.js** - Updated with NativeWind presets:
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

4. **metro.config.js** - Created for NativeWind:
   ```js
   const { getDefaultConfig } = require("expo/metro-config");
   const { withNativeWind } = require('nativewind/metro');

   const config = getDefaultConfig(__dirname);

   module.exports = withNativeWind(config, { input: './global.css' });
   ```

5. **nativewind-env.d.ts** - Added TypeScript definitions:
   ```typescript
   /// <reference types="nativewind/types" />
   ```

6. **App.tsx** - Updated to import the CSS file:
   ```jsx
   import './global.css';
   ```

## Component Migration Process

We systematically migrated all components and screens from React Native's StyleSheet to NativeWind:

### Components Updated
- **Header**: Converted to use NativeWind with logo integration
- **Footer**: Created with NativeWind styling and external links
- **BlockchainMetrics**: Updated with responsive Tailwind classes
- **BlockchainStats**: Converted to display blockchain statistics
- **TransactionsList**: Complex component converted with table-like styles
- **ErrorBoundary**: Updated fallback UI with NativeWind

### Screens Updated
- **HomeScreen**: Full conversion to NativeWind with conditional rendering
- **SearchScreen**: Updated form elements and search interface
- **TransactionDetails**: Converted transaction view with NativeWind
- **AccountDetails**: Updated account information display

### Migration Strategy

We followed this systematic approach for each component:

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
  <Text className="text-white text-sm flex-1 min-w-[100px]">{blockHeight}</Text>
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

## Usage Guidelines

### Common Patterns
- Use `bg-background` for main background color
- Use `bg-secondary` for card backgrounds
- Use `bg-primary` for buttons and accents
- Use `text-text-light` for primary text content
- Use `text-text-muted` for secondary text content
- Use `border-border` for dividers and borders

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

## Challenges and Solutions

- **TypeScript Integration**: Addressed by adding proper type references
- **Performance Considerations**: Optimized by using consistent class patterns
- **Migration Strategy**: Followed a component-by-component approach
- **Class Naming Consistency**: Established patterns for common UI elements