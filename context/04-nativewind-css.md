# NativeWind Integration

## Overview
This project has been updated to use NativeWind, a utility-first CSS framework for React Native based on Tailwind CSS. This integration provides several advantages:

- More flexible and maintainable styling using utility classes
- Consistent design system through a centralized theme
- Reduced styling code and improved readability
- Better developer experience with inline styling
- Easier responsive design capabilities

## Implementation Details

### Configuration Files
1. **tailwind.config.js** - Contains configuration for Tailwind including custom colors that match the existing design system
2. **global.css** - Contains Tailwind directives for the styles
3. **babel.config.js** - Updated with NativeWind presets
4. **metro.config.js** - Configured to work with NativeWind
5. **nativewind-env.d.ts** - TypeScript definitions for NativeWind

### Theme Configuration
The project uses a custom theme that maintains the original color scheme:

```js
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
}
```

### Component Migration
Components have been migrated from React Native's StyleSheet to NativeWind utility classes:

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

## Usage Guidelines

### Common Patterns
- Use `bg-background` for main background color
- Use `bg-secondary` for card backgrounds
- Use `bg-primary` for buttons and accents
- Use `text-text-light` for primary text content
- Use `text-text-muted` for secondary text content
- Use `border-border` for dividers and borders

### Responsive Design
NativeWind supports responsive design through breakpoint prefixes:

```jsx
<View className="flex-col md:flex-row">
  {/* Content */}
</View>
```

### Custom Extensions
The Tailwind configuration can be extended with new utility classes as needed in the `tailwind.config.js` file. 