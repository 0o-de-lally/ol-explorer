# OL Explorer - Dependency Installation

This document provides a detailed overview of the dependency installation process for the OL Explorer blockchain explorer project.

## Initial Setup

The Open Libra Explorer project was initialized and set up with the following steps:

### Repository Initialization

```bash
# Initialize Git repository
git init
git add .
git commit -m "Initial commit with project structure"
```

### Package Installation

The project was set up using Expo with TypeScript template, and all dependencies were installed with their latest compatible versions:

```bash
# Install Expo CLI globally
npm install -g expo-cli

# Create a new project with TypeScript template
npx create-expo-app ol-explorer --template expo-template-typescript

# Navigate to the project directory
cd ol-explorer

# Install core dependencies
npm install @legendapp/state @react-native-async-storage/async-storage @react-navigation/native @react-navigation/native-stack expo-asset expo-constants expo-linking expo-router expo-status-bar expo-updates expo-web-browser react-native-reanimated react-native-safe-area-context react-native-screens react-native-web open-libra-sdk expo-clipboard @react-native-clipboard/clipboard buffer json-buffer --save

# Install development dependencies
npm install --save-dev @babel/core @babel/plugin-transform-runtime @testing-library/jest-native @testing-library/react-native @types/jest @types/react @typescript-eslint/eslint-plugin @typescript-eslint/parser cypress eslint eslint-plugin-react eslint-plugin-react-hooks identity-obj-proxy jest jest-expo react-test-renderer ts-jest typescript @eslint/js babel-preset-expo concurrently wait-on
```

### NativeWind Setup for Styling

```bash
# Install NativeWind for styling
npm install nativewind@4 tailwindcss@3 --save
npm install --save-dev react-native-css-interop

# Initialize Tailwind CSS
npx tailwindcss init
```

## Dependency Resolution

All dependencies were installed without using flags like `--legacy-peer-deps` or `--force` to ensure proper compatibility. Version conflicts were resolved by:

1. Analyzing the dependency tree with `npm ls`
2. Upgrading or downgrading specific packages as needed
3. Using compatible peer dependencies

## Project Files and Directories

The following key files and directories were created during the initialization process:

### Configuration Files

- `babel.config.js` - Babel configuration for React Native and TypeScript
- `tsconfig.json` - TypeScript configuration
- `jest.config.js` - Jest configuration for testing
- `jest.setup.js` - Jest setup file for mocks and global configurations
- `cypress.config.js` - Cypress configuration for end-to-end testing
- `tailwind.config.js` - TailwindCSS configuration for styling
- `metro.config.js` - Metro bundler configuration for React Native
- `app.json` - Expo configuration

### Source Structure

- `/src` - Main source code
- `/app` - Expo Router application screens
- `/assets` - Static assets (images, fonts)
- `/public` - Public assets for web deployment
- `/cypress` - Cypress end-to-end tests

## Final Verification

All dependencies were successfully installed and the project structure was initialized correctly:

```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Verify ESLint
npx eslint . --ext .ts,.tsx

# Verify Jest test setup
npm test -- --watchAll=false

# Verify Expo build
npm run build
```

The project initializes and runs correctly with no dependency-related issues or warnings. 